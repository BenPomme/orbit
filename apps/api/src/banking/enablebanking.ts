import { readFileSync } from "node:fs";
import { createPrivateKey, createSign } from "node:crypto";

import type {
  BankAccount,
  BankConnection,
  BankInstitution,
  BankTransaction,
  CompleteBankConnectionInput,
  CreateBankConnectionInput,
} from "../domain.js";
import type { BankingProvider } from "./provider.js";

const baseUrl = process.env.ENABLEBANKING_BASE_URL?.trim() || "https://api.enablebanking.com";
const applicationId = process.env.ENABLEBANKING_APPLICATION_ID?.trim() || "";
const keyId =
  process.env.ENABLEBANKING_KEY_ID?.trim() ||
  process.env.ENABLEBANKING_APPLICATION_ID?.trim() ||
  "";
const redirectUrl = process.env.ENABLEBANKING_REDIRECT_URI?.trim() || null;
const privateKey = loadPrivateKey();

const requestTimeoutMs = 30_000;
const sessionRetryAttempts = 6;
const sessionRetryDelayMs = 2_000;

export function createEnableBankingProvider(): BankingProvider {
  return {
    provider: "enablebanking" as const,
    async searchInstitutions(query, country) {
      const response = await enableFetch<{
        aspsps?: {
          id?: string;
          name?: string;
          country?: string;
          bic?: string;
          logo?: string;
        }[];
      }>(`/aspsps?psu_type=personal&country=${encodeURIComponent(country)}`);
      const normalizedQuery = query.trim().toLowerCase();

      return (response.aspsps ?? [])
        .filter((institution) => {
          if (!institution.name) {
            return false;
          }

          return normalizedQuery.length === 0
            ? true
            : institution.name.toLowerCase().includes(normalizedQuery);
        })
        .slice(0, 20)
        .map(
          (institution): BankInstitution => ({
            id:
              institution.id ||
              `${institution.name ?? "institution"}::${institution.country ?? country}`,
            provider: "enablebanking" as const,
            name: institution.name ?? "Enable Banking institution",
            countries: [(institution.country ?? country) as BankInstitution["countries"][number]],
            logoUrl: institution.logo,
          }),
        );
    },
    async createConnection(input: CreateBankConnectionInput) {
      const resolvedRedirectUrl = input.redirectUrl?.trim() || redirectUrl;

      if (!resolvedRedirectUrl) {
        throw new Error(
          "Enable Banking redirect URL is not configured. Set ENABLEBANKING_REDIRECT_URI on the API and EXPO_PUBLIC_BANK_REDIRECT_URL on the client before connecting a real bank.",
        );
      }

      const connectionId = `bank-connection-${crypto.randomUUID()}`;
      const institution = resolveInstitutionReference(
        input.institutionId,
        input.institutionName,
        input.country,
      );

      const response = await enableFetch<{
        authorization_id?: string;
        url?: string;
      }>("/auth", {
        method: "POST",
        body: JSON.stringify({
          access: {
            valid_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          },
          aspsp: {
            name: institution.name,
            country: institution.country,
          },
          redirect_url: resolvedRedirectUrl,
          psu_type: "personal",
          state: connectionId,
        }),
      });

      if (!response.authorization_id || !response.url) {
        throw new Error("Enable Banking did not return a valid authorization URL.");
      }

      return {
        connection: {
          id: connectionId,
          provider: "enablebanking" as const,
          institutionId: input.institutionId,
          institutionName: input.institutionName ?? institution.name,
          status: "pending" as const,
          providerConnectionId: response.authorization_id,
          callbackState: connectionId,
          linkUrl: response.url,
          createdAt: new Date().toISOString(),
        },
        redirectUrl: response.url,
      };
    },
    async completeConnection(connection: BankConnection, input: CompleteBankConnectionInput) {
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

      if (!input.code) {
        throw new Error("Enable Banking callback is missing the OAuth code.");
      }

      if (input.state && connection.callbackState && input.state !== connection.callbackState) {
        throw new Error("Enable Banking callback state does not match the pending connection.");
      }

      const session = await enableFetch<{
        session_id?: string;
        sessionId?: string;
      }>("/sessions", {
        method: "POST",
        body: JSON.stringify({
          code: input.code,
        }),
      });

      const sessionId = session.session_id ?? session.sessionId;
      if (!sessionId) {
        throw new Error("Enable Banking did not return a session identifier.");
      }

      const synced = await syncSession(connection, sessionId);
      const completedConnection: BankConnection = {
        ...synced.connection,
        providerConnectionId: connection.providerConnectionId,
        providerSessionId: sessionId,
        callbackState: connection.callbackState,
        linkUrl: undefined,
      };

      return {
        ...synced,
        connection: completedConnection,
      };
    },
    async syncConnection(connection: BankConnection) {
      const sessionId = connection.providerSessionId;

      if (!sessionId) {
        throw new Error(
          "Enable Banking consent has not completed yet. Finish the bank callback before syncing.",
        );
      }

      return syncSession(connection, sessionId);
    },
    async disconnectConnection(connection: BankConnection) {
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

async function syncSession(
  connection: BankConnection,
  sessionId: string,
): Promise<import("./provider.js").BankingSyncResult> {
  const providerAccountIds = await fetchSessionAccountsWithRetry(sessionId);
  const accounts: BankAccount[] = [];
  const transactions: BankTransaction[] = [];

  for (const providerAccountId of providerAccountIds) {
    const details = await enableFetch<{
      account?: {
        account_id?: string;
        name?: string;
        iban?: string;
        currency?: string;
        product?: string;
      };
    }>(`/accounts/${providerAccountId}/details`);
    const balances = await enableFetch<{
      balances?: {
        balance_type?: string;
        balanceType?: string;
        balance_amount?: { amount?: string; currency?: string };
        balanceAmount?: { amount?: string; currency?: string };
      }[];
    }>(`/accounts/${providerAccountId}/balances`);
    const accountTransactions = await enableFetch<{
      transactions?: {
        booked?: {
          transaction_id?: string;
          transactionId?: string;
          entry_reference?: string;
          booking_date?: string;
          bookingDate?: string;
          booking_date_time?: string;
          bookingDateTime?: string;
          remittance_information_unstructured?: string;
          remittanceInformationUnstructured?: string;
          creditor_name?: string;
          creditorName?: string;
          debtor_name?: string;
          debtorName?: string;
          transaction_amount?: { amount?: string; currency?: string };
          transactionAmount?: { amount?: string; currency?: string };
        }[];
      };
    }>(`/accounts/${providerAccountId}/transactions`);

    const balanceEntry = (balances.balances ?? []).find((entry) => {
      const balanceType = entry.balance_type ?? entry.balanceType;
      return balanceType === "closingBooked" || balanceType === "expected";
    }) ?? (balances.balances ?? [])[0];
    const amountInfo = balanceEntry?.balance_amount ?? balanceEntry?.balanceAmount;
    const currency =
      (amountInfo?.currency as BankAccount["currency"] | undefined) ??
      (details.account?.currency as BankAccount["currency"] | undefined) ??
      "EUR";
    const accountName =
      details.account?.name ?? details.account?.product ?? "Connected account";
    const accountId = `bank-account-${providerAccountId}`;

    accounts.push({
      id: accountId,
      connectionId: connection.id,
      providerAccountId,
      name: accountName,
      iban: details.account?.iban,
      currency,
      balance: amountInfo?.amount ? Number(Number.parseFloat(amountInfo.amount).toFixed(2)) : undefined,
      lastRefreshedAt: new Date().toISOString(),
    });

    for (const entry of accountTransactions.transactions?.booked ?? []) {
      const amountValue = entry.transaction_amount ?? entry.transactionAmount;
      const merchantName =
        entry.creditor_name ??
        entry.creditorName ??
        entry.debtor_name ??
        entry.debtorName ??
        entry.remittance_information_unstructured ??
        entry.remittanceInformationUnstructured ??
        "Bank merchant";

      transactions.push({
        id: `bank-transaction-${providerAccountId}-${entry.transaction_id ?? entry.transactionId ?? entry.entry_reference ?? crypto.randomUUID()}`,
        accountId,
        providerTransactionId:
          entry.transaction_id ??
          entry.transactionId ??
          entry.entry_reference ??
          crypto.randomUUID(),
        bookedAt:
          entry.booking_date_time ??
          entry.bookingDateTime ??
          new Date(
            entry.booking_date ?? entry.bookingDate ?? new Date().toISOString(),
          ).toISOString(),
        amount: Math.abs(Number.parseFloat(amountValue?.amount ?? "0")),
        currency:
          (amountValue?.currency as BankTransaction["currency"] | undefined) ?? currency,
        merchantName,
        description:
          entry.remittance_information_unstructured ??
          entry.remittanceInformationUnstructured ??
          `${merchantName} bank transaction`,
      });
    }
  }

  const syncedConnection: BankConnection = {
    ...connection,
    status: "linked",
    providerSessionId: sessionId,
    errorMessage: undefined,
    lastSyncedAt: new Date().toISOString(),
    linkUrl: undefined,
  };

  return {
    connection: syncedConnection,
    accounts,
    transactions,
  };
}

async function fetchSessionAccountsWithRetry(sessionId: string): Promise<string[]> {
  for (let attempt = 1; attempt <= sessionRetryAttempts; attempt += 1) {
    const session = await enableFetch<{
      status?: string;
      accounts?: string[];
    }>(`/sessions/${sessionId}`);

    if (Array.isArray(session.accounts) && session.accounts.length > 0) {
      return session.accounts;
    }

    if (attempt < sessionRetryAttempts) {
      await wait(sessionRetryDelayMs);
    }
  }

  throw new Error(
    "Enable Banking session did not expose any linked accounts yet. Retry the sync in a few seconds.",
  );
}

async function enableFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = buildJwt();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(requestTimeoutMs),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `Enable Banking request failed with ${response.status}${errorBody ? `: ${errorBody}` : "."}`,
    );
  }

  return (await response.json()) as T;
}

function buildJwt() {
  if (!applicationId || !keyId || !privateKey) {
    throw new Error(
      "Enable Banking is not configured. Set ENABLEBANKING_APPLICATION_ID, optionally ENABLEBANKING_KEY_ID, and ENABLEBANKING_PRIVATE_KEY or ENABLEBANKING_PRIVATE_KEY_PATH.",
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(
    Buffer.from(JSON.stringify({ alg: "RS256", kid: keyId, typ: "JWT" })),
  );
  const payload = base64Url(
    Buffer.from(
      JSON.stringify({
        iss: "enablebanking.com",
        aud: "api.enablebanking.com",
        iat: now,
        exp: now + 3600,
      }),
    ),
  );
  const signingInput = `${header}.${payload}`;
  const signature = createSign("RSA-SHA256").update(signingInput).end().sign(privateKey);

  return `${signingInput}.${base64Url(signature)}`;
}

function resolveInstitutionReference(
  institutionId: string,
  institutionName: string | undefined,
  country: CreateBankConnectionInput["country"],
) {
  if (institutionId.includes("::")) {
    const [name, parsedCountry] = institutionId.split("::");
    return {
      name: institutionName?.trim() || name.trim(),
      country: (parsedCountry?.trim().toUpperCase() ||
        country) as CreateBankConnectionInput["country"],
    };
  }

  return {
    name: institutionName?.trim() || institutionId.trim(),
    country,
  };
}

function loadPrivateKey() {
  const inlineKey = process.env.ENABLEBANKING_PRIVATE_KEY?.trim();
  const keyPath = process.env.ENABLEBANKING_PRIVATE_KEY_PATH?.trim();
  const rawKey = inlineKey || (keyPath ? readFileSync(keyPath, "utf8") : "");

  return rawKey ? createPrivateKey(rawKey.replace(/\\n/g, "\n")) : null;
}

function base64Url(input: Buffer) {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/u, "");
}

function wait(durationMs: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}
