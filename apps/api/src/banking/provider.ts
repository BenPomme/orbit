import type {
  BankAccount,
  BankConnection,
  BankInstitution,
  BankTransaction,
  CompleteBankConnectionInput,
  Country,
  CreateBankConnectionInput,
} from "../domain.js";
import { createEnableBankingProvider } from "./enablebanking.js";
import { createMockBankingProvider } from "./mock.js";
import { createGoCardlessBankingProvider } from "./gocardless.js";

export type BankingSyncResult = {
  connection: BankConnection;
  accounts: BankAccount[];
  transactions: BankTransaction[];
};

export type BankingProvider = {
  provider: BankConnection["provider"];
  searchInstitutions(query: string, country: Country): Promise<BankInstitution[]>;
  createConnection(input: CreateBankConnectionInput): Promise<{
    connection: BankConnection;
    redirectUrl?: string;
  }>;
  completeConnection(
    connection: BankConnection,
    input: CompleteBankConnectionInput,
  ): Promise<BankingSyncResult>;
  syncConnection(connection: BankConnection): Promise<BankingSyncResult>;
  disconnectConnection(connection: BankConnection): Promise<BankConnection>;
};

let cachedProvider: BankingProvider | null = null;

export function getBankingProvider(): BankingProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const mode = process.env.BANKING_PROVIDER_MODE?.toLowerCase() ?? "unconfigured";
  const hasEnableBankingConfig =
    Boolean(process.env.ENABLEBANKING_APPLICATION_ID?.trim()) &&
    Boolean(
      process.env.ENABLEBANKING_PRIVATE_KEY?.trim() ||
        process.env.ENABLEBANKING_PRIVATE_KEY_PATH?.trim(),
    );
  const hasGoCardlessToken = Boolean(process.env.GOCARDLESS_ACCESS_TOKEN?.trim());
  const hasGoCardlessSecrets = Boolean(
    process.env.GOCARDLESS_SECRET_ID && process.env.GOCARDLESS_SECRET_KEY,
  );

  if (mode === "mock") {
    cachedProvider = createMockBankingProvider();
    return cachedProvider;
  }

  if (mode === "enablebanking") {
    cachedProvider = hasEnableBankingConfig
      ? createEnableBankingProvider()
      : createUnavailableBankingProvider("Enable Banking");
    return cachedProvider;
  }

  if (mode === "gocardless") {
    cachedProvider =
      hasGoCardlessToken || hasGoCardlessSecrets
        ? createGoCardlessBankingProvider()
        : createUnavailableBankingProvider("GoCardless");
    return cachedProvider;
  }

  cachedProvider = hasEnableBankingConfig
    ? createEnableBankingProvider()
    : hasGoCardlessToken || hasGoCardlessSecrets
      ? createGoCardlessBankingProvider()
      : createUnavailableBankingProvider("a supported open banking");

  return cachedProvider;
}

function createUnavailableBankingProvider(providerLabel: string): BankingProvider {
  const message = `Open banking is not configured. Add ${providerLabel} credentials to enable real bank connections.`;

  return {
    provider: "unconfigured",
    async searchInstitutions(_query, _country) {
      return [];
    },
    async createConnection(_input) {
      throw new Error(message);
    },
    async completeConnection(_connection, _input) {
      throw new Error(message);
    },
    async syncConnection(_connection) {
      throw new Error(message);
    },
    async disconnectConnection(connection) {
      return {
        ...connection,
        status: "revoked",
        linkUrl: undefined,
        errorMessage: undefined,
        lastSyncedAt: new Date().toISOString(),
      };
    },
  };
}
