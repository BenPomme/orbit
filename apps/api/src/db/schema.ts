import {
  doublePrecision,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const cadenceEnum = pgEnum("cadence", ["monthly", "annual"]);
export const ownershipEnum = pgEnum("ownership", ["shared", "personal"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "trial",
  "pending_cancellation",
  "cancelled",
]);
export const bankProviderEnum = pgEnum("bank_provider", [
  "mock",
  "gocardless",
  "enablebanking",
]);
export const bankConnectionStatusEnum = pgEnum("bank_connection_status", [
  "pending",
  "linked",
  "error",
  "revoked",
]);
export const recurringCandidateStatusEnum = pgEnum("recurring_candidate_status", [
  "pending",
  "confirmed",
  "rejected",
  "merged",
]);
export const reviewActionEnum = pgEnum("review_action", ["confirm", "reject", "merge"]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const households = pgTable("households", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  country: text("country").notNull(),
  locale: text("locale").notNull(),
  currency: text("currency").notNull(),
  isSetupComplete: integer("is_setup_complete").notNull().default(0),
  shareCode: text("share_code").notNull().unique(),
});

export const householdMembers = pgTable("household_members", {
  id: text("id").primaryKey(),
  householdId: text("household_id").notNull(),
  name: text("name").notNull(),
  color: text("color").notNull(),
});

export const memberships = pgTable("memberships", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  memberId: text("member_id").notNull(),
  role: text("role").notNull(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: text("user_id").notNull(),
  memberId: text("member_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const bankConnections = pgTable("bank_connections", {
  id: text("id").primaryKey(),
  householdId: text("household_id").notNull(),
  provider: bankProviderEnum("provider").notNull(),
  institutionId: text("institution_id").notNull(),
  institutionName: text("institution_name").notNull(),
  status: bankConnectionStatusEnum("status").notNull(),
  providerConnectionId: text("provider_connection_id"),
  providerSessionId: text("provider_session_id"),
  callbackState: text("callback_state"),
  requisitionId: text("requisition_id"),
  linkUrl: text("link_url"),
  errorMessage: text("error_message"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const bankAccounts = pgTable("bank_accounts", {
  id: text("id").primaryKey(),
  connectionId: text("connection_id").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  name: text("name").notNull(),
  iban: text("iban"),
  currency: text("currency").notNull(),
  balance: doublePrecision("balance"),
  lastRefreshedAt: timestamp("last_refreshed_at", { withTimezone: true }),
});

export const bankTransactions = pgTable("bank_transactions", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerTransactionId: text("provider_transaction_id").notNull(),
  bookedAt: timestamp("booked_at", { withTimezone: true }).notNull(),
  amount: doublePrecision("amount").notNull(),
  currency: text("currency").notNull(),
  merchantName: text("merchant_name").notNull(),
  description: text("description").notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  householdId: text("household_id").notNull(),
  merchant: text("merchant").notNull(),
  category: text("category").notNull(),
  amount: doublePrecision("amount").notNull(),
  currency: text("currency").notNull(),
  cadence: cadenceEnum("cadence").notNull(),
  nextRenewal: timestamp("next_renewal", { withTimezone: true }).notNull(),
  owner: ownershipEnum("owner").notNull(),
  ownerLabel: text("owner_label").notNull(),
  status: subscriptionStatusEnum("status").notNull(),
  confidence: text("confidence").notNull(),
});

export const recurringCandidates = pgTable("recurring_candidates", {
  id: text("id").primaryKey(),
  householdId: text("household_id").notNull(),
  merchantName: text("merchant_name").notNull(),
  category: text("category").notNull(),
  cadence: cadenceEnum("cadence").notNull(),
  amount: doublePrecision("amount").notNull(),
  currency: text("currency").notNull(),
  confidence: doublePrecision("confidence").notNull(),
  evidenceSummary: text("evidence_summary").notNull(),
  nextRenewal: timestamp("next_renewal", { withTimezone: true }).notNull(),
  owner: ownershipEnum("owner").notNull(),
  ownerLabel: text("owner_label").notNull(),
  status: recurringCandidateStatusEnum("status").notNull(),
  linkedAccountIds: jsonb("linked_account_ids").notNull(),
  linkedTransactionIds: jsonb("linked_transaction_ids").notNull(),
  linkedSubscriptionId: text("linked_subscription_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const candidateReviews = pgTable("candidate_reviews", {
  id: text("id").primaryKey(),
  candidateId: text("candidate_id").notNull(),
  action: reviewActionEnum("action").notNull(),
  memberId: text("member_id").notNull(),
  subscriptionId: text("subscription_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});
