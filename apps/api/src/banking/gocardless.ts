import type {
  BankAccount,
  BankConnection,
  BankInstitution,
  BankTransaction,
  CompleteBankConnectionInput,
  Country,
  CreateBankConnectionInput,
} from "../domain.js";
import type { BankingProvider } from "./provider.js";

const baseUrl =
  process.env.GOCARDLESS_BANK_DATA_BASE_URL?.trim() ||
  "https://bankaccountdata.gocardless.com";
const redirectUrl = process.env.GOCARDLESS_REDIRECT_URL?.trim() || null;
const staticAccessToken = process.env.GOCARDLESS_ACCESS_TOKEN?.trim() || null;

let refreshToken: string | null = null;
let accessToken: string | null = null;
let accessTokenExpiresAt = 0;

export function createGoCardlessBankingProvider(): BankingProvider {
  const syncConnection = async (connection: BankConnection) => {
    if (!connection.requisitionId) {
      throw new Error("Missing requisition ID for GoCardless connection.");
    }

    const requisition = await gcFetch<{
      status: string;
      accounts?: string[];
    }>(`/api/v2/requisitions/${connection.requisitionId}/`);

    if (!Array.isArray(requisition.accounts) || requisition.accounts.length === 0) {
      const status: BankConnection["status"] =
        requisition.status === "LN" ? "linked" : "pending";

      return {
        connection: {
          ...connection,
          status,
          lastSyncedAt: new Date().toISOString(),
        },
        accounts: [],
        transactions: [],
      };
    }

    const accounts: BankAccount[] = [];
    const transactions: BankTransaction[] = [];

    for (const providerAccountId of requisition.accounts) {
      const details = await gcFetch<{
        account: {
          resourceId?: string;
          iban?: string;
          currency?: string;
          name?: string;
        };
      }>(`/api/v2/accounts/${providerAccountId}/details/`);
      const balances = await gcFetch<{
        balances?: {
          balanceAmount?: {
            amount?: string;
            currency?: string;
          };
        }[];
      }>(`/api/v2/accounts/${providerAccountId}/balances/`).catch(() => ({
        balances: [],
      }));
      const booked = await gcFetch<{
        transactions: {
          booked?: {
            transactionId?: string;
            bookingDate?: string;
            bookingDateTime?: string;
            remittanceInformationUnstructured?: string;
            creditorName?: string;
            debtorName?: string;
            transactionAmount: {
              amount: string;
              currency: string;
            };
          }[];
        };
      }>(`/api/v2/accounts/${providerAccountId}/transactions/`);

      const accountId = `bank-account-${providerAccountId}`;
      accounts.push({
        id: accountId,
        connectionId: connection.id,
        providerAccountId,
        name: details.account.name ?? details.account.resourceId ?? "Connected account",
        iban: details.account.iban,
        currency:
          (details.account.currency as BankAccount["currency"] | undefined) ?? "EUR",
        balance: normalizeBalanceAmount(balances.balances?.[0]?.balanceAmount?.amount),
        lastRefreshedAt: new Date().toISOString(),
      });

      for (const entry of booked.transactions.booked ?? []) {
        const merchantName =
          entry.creditorName ??
          entry.debtorName ??
          entry.remittanceInformationUnstructured ??
          "Bank merchant";

        transactions.push({
          id: `bank-transaction-${providerAccountId}-${entry.transactionId ?? crypto.randomUUID()}`,
          accountId,
          providerTransactionId: entry.transactionId ?? crypto.randomUUID(),
          bookedAt:
            entry.bookingDateTime ??
            new Date(entry.bookingDate ?? new Date().toISOString()).toISOString(),
          amount: Math.abs(Number.parseFloat(entry.transactionAmount.amount)),
          currency:
            (entry.transactionAmount.currency as BankTransaction["currency"] | undefined) ??
            "EUR",
          merchantName,
          description:
            entry.remittanceInformationUnstructured ?? `${merchantName} bank transaction`,
        });
      }
    }

    return {
      connection: {
        ...connection,
        status: "linked" as const,
        lastSyncedAt: new Date().toISOString(),
        errorMessage: undefined,
      },
      accounts,
      transactions,
    };
  };

  return {
    provider: "gocardless",
    async searchInstitutions(query, country) {
      const response = await gcFetch<{ id: string; name: string; logo?: string }[]>(
        `/api/v2/institutions/?country=${country}`,
      );
      const normalizedQuery = query.trim().toLowerCase();

      return response
        .filter((institution) =>
          normalizedQuery.length === 0
            ? true
            : institution.name.toLowerCase().includes(normalizedQuery),
        )
        .slice(0, 20)
        .map(
          (institution): BankInstitution => ({
            id: institution.id,
            provider: "gocardless",
            name: institution.name,
            countries: [country],
            logoUrl: institution.logo,
          }),
        );
    },
    async createConnection(input: CreateBankConnectionInput) {
      const resolvedRedirectUrl = input.redirectUrl?.trim() || redirectUrl;

      if (!resolvedRedirectUrl) {
        throw new Error(
          "GoCardless redirect URL is not configured. Set GOCARDLESS_REDIRECT_URL on the API and EXPO_PUBLIC_BANK_REDIRECT_URL on the client before connecting a real bank.",
        );
      }

      const connectionId = `bank-connection-${crypto.randomUUID()}`;
      const requisition = await gcFetch<{
        id: string;
        link: string;
      }>("/api/v2/requisitions/", {
        method: "POST",
        body: JSON.stringify({
          redirect: resolvedRedirectUrl,
          institution_id: input.institutionId,
          reference: connectionId,
          user_language: input.country === "FR" ? "FR" : "ES",
        }),
      });

      return {
        connection: {
          id: connectionId,
          provider: "gocardless",
          institutionId: input.institutionId,
          institutionName: input.institutionName ?? input.institutionId,
          status: "pending" as const,
          providerConnectionId: requisition.id,
          requisitionId: requisition.id,
          linkUrl: requisition.link,
          createdAt: new Date().toISOString(),
        },
        redirectUrl: requisition.link,
      };
    },
    async completeConnection(connection, input) {
      if (input.error) {
        return {
          connection: {
            ...connection,
            status: "error" as const,
            errorMessage: input.errorDescription ?? input.error,
            lastSyncedAt: new Date().toISOString(),
          },
          accounts: [],
          transactions: [],
        };
      }

      return syncConnection(connection);
    },
    syncConnection,
    async disconnectConnection(connection) {
      return {
        ...connection,
        status: "revoked" as const,
        linkUrl: undefined,
        errorMessage: undefined,
        lastSyncedAt: new Date().toISOString(),
      };
    },
  };
}

function normalizeBalanceAmount(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : undefined;
}

async function gcFetch<T>(path: string, init?: RequestInit) {
  const token = await getAccessToken();
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`GoCardless request failed with ${response.status}.`);
  }

  return (await response.json()) as T;
}

async function getAccessToken() {
  if (staticAccessToken) {
    return staticAccessToken;
  }

  if (accessToken && Date.now() < accessTokenExpiresAt) {
    return accessToken;
  }

  if (!refreshToken) {
    const response = await fetch(`${baseUrl}/api/v2/token/new/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        secret_id: process.env.GOCARDLESS_SECRET_ID,
        secret_key: process.env.GOCARDLESS_SECRET_KEY,
      }),
    });

    if (!response.ok) {
      throw new Error(
        "Unable to obtain GoCardless refresh token. Set GOCARDLESS_ACCESS_TOKEN directly or provide GOCARDLESS_SECRET_ID and GOCARDLESS_SECRET_KEY.",
      );
    }

    const payload = (await response.json()) as { refresh: string };
    refreshToken = payload.refresh;
  }

  const refreshResponse = await fetch(`${baseUrl}/api/v2/token/refresh/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refresh: refreshToken,
    }),
  });

  if (!refreshResponse.ok) {
    throw new Error(
      "Unable to refresh GoCardless access token. Set GOCARDLESS_ACCESS_TOKEN directly or provide valid GoCardless Bank Account Data secrets.",
    );
  }

  const refreshPayload = (await refreshResponse.json()) as {
    access: string;
    access_expires: number;
  };
  accessToken = refreshPayload.access;
  accessTokenExpiresAt = Date.now() + refreshPayload.access_expires * 1000 - 10_000;

  return accessToken;
}
