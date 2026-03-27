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

const institutions: Record<Country, BankInstitution[]> = {
  ES: [
    {
      id: "mock-es-caixa",
      provider: "mock",
      name: "Demo Caixa",
      countries: ["ES"],
    },
    {
      id: "mock-es-santander",
      provider: "mock",
      name: "Demo Santander",
      countries: ["ES"],
    },
  ],
  FR: [
    {
      id: "mock-fr-bnp",
      provider: "mock",
      name: "Demo BNP Paribas",
      countries: ["FR"],
    },
    {
      id: "mock-fr-credit-agricole",
      provider: "mock",
      name: "Demo Credit Agricole",
      countries: ["FR"],
    },
  ],
};

export function createMockBankingProvider(): BankingProvider {
  const syncConnection = async (connection: BankConnection) => {
    const account: BankAccount = {
      id: `bank-account-${connection.id}`,
      connectionId: connection.id,
      providerAccountId: `${connection.id}-account`,
      name: `${connection.institutionName} Main Account`,
      iban: connection.institutionId.startsWith("mock-es")
        ? "ES7620770024003102575766"
        : "FR1420041010050500013M02606",
      currency: "EUR",
      balance: connection.institutionId.startsWith("mock-es") ? 1843.25 : 2631.8,
      lastRefreshedAt: new Date().toISOString(),
    };

    const transactions = buildMockTransactions(account.id, connection.institutionId);

    return {
      connection: {
        ...connection,
        status: "linked" as const,
        lastSyncedAt: new Date().toISOString(),
        errorMessage: undefined,
      },
      accounts: [account],
      transactions,
    };
  };

  return {
    provider: "mock",
    async searchInstitutions(query, country) {
      const normalizedQuery = query.trim().toLowerCase();
      return (institutions[country] ?? institutions.ES).filter((institution) =>
        normalizedQuery.length === 0
          ? true
          : institution.name.toLowerCase().includes(normalizedQuery),
      );
    },
    async createConnection(input: CreateBankConnectionInput) {
      const institution = (
        institutions[input.country] ?? institutions.ES
      ).find((item) => item.id === input.institutionId);

      return {
        connection: {
          id: `bank-connection-${crypto.randomUUID()}`,
          provider: "mock" as const,
          institutionId: input.institutionId,
          institutionName: institution?.name ?? "Demo Bank",
          status: "linked" as const,
          createdAt: new Date().toISOString(),
        },
      };
    },
    async completeConnection(
      connection: BankConnection,
      input: CompleteBankConnectionInput,
    ) {
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

function buildMockTransactions(accountId: string, institutionId: string): BankTransaction[] {
  const isFrance = institutionId.startsWith("mock-fr");
  const monthlyMerchant = isFrance ? "Canal+" : "Netflix";
  const musicMerchant = isFrance ? "Deezer Premium" : "Spotify Premium";
  const telecomMerchant = isFrance ? "Freebox + Mobile" : "DIGI Fibra + Móvil";

  return [
    transaction(accountId, monthlyMerchant, 18.99, 61),
    transaction(accountId, monthlyMerchant, 18.99, 31),
    transaction(accountId, monthlyMerchant, 18.99, 1),
    transaction(accountId, musicMerchant, 11.99, 65),
    transaction(accountId, musicMerchant, 11.99, 35),
    transaction(accountId, musicMerchant, 11.99, 5),
    transaction(accountId, telecomMerchant, 29.99, 58),
    transaction(accountId, telecomMerchant, 29.99, 28),
  ];
}

function transaction(
  accountId: string,
  merchantName: string,
  amount: number,
  daysAgo: number,
): BankTransaction {
  const bookedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

  return {
    id: `bank-transaction-${crypto.randomUUID()}`,
    accountId,
    providerTransactionId: `provider-${crypto.randomUUID()}`,
    bookedAt,
    amount,
    currency: "EUR",
    merchantName,
    description: `${merchantName} card payment`,
  };
}
