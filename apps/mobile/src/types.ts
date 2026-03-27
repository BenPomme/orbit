export type Country = "ES" | "FR";
export type Currency = "EUR";
export type Cadence = "monthly" | "annual";
export type Ownership = "shared" | "personal";
export type Status = "active" | "trial" | "pending_cancellation" | "cancelled";
export type Confidence = "manual" | "detected" | "confirmed";
export type BankProvider = "mock" | "gocardless" | "enablebanking" | "unconfigured";
export type BankConnectionStatus = "pending" | "linked" | "error" | "revoked";
export type RecurringCandidateStatus = "pending" | "confirmed" | "rejected" | "merged";
export type RecurringReviewAction = "confirm" | "reject" | "merge";

export type HouseholdMember = {
  id: string;
  name: string;
  color: string;
};

export type HouseholdMemberSummary = HouseholdMember & {
  monthlyRecurringTotal: number;
  activeSubscriptions: number;
};

export type HouseholdSummary = {
  id: string;
  name: string;
  country: Country;
  locale: string;
  currency: Currency;
  isSetupComplete: boolean;
  shareCode: string;
  members: HouseholdMember[];
  monthlyRecurringTotal: number;
  annualizedRecurringTotal: number;
  activeSubscriptions: number;
  sharedSubscriptions: number;
  renewalsDueSoon: number;
  memberSummaries: HouseholdMemberSummary[];
};

export type SessionState = {
  activeMemberId: string;
};

export type UserSummary = {
  id: string;
  email: string;
};

export type AuthSessionResponse = {
  token: string;
  user: UserSummary;
  member: HouseholdMember;
  household: HouseholdSummary;
  session: SessionState;
};

export type AuthChallengeResponse = {
  challengeId: string;
  expiresAt: string;
  devCode: string;
};

export type RequestMagicLinkInput = {
  email: string;
};

export type VerifyMagicLinkInput = {
  challengeId: string;
  code: string;
  memberName: string;
  shareCode?: string;
};

export type Subscription = {
  id: string;
  merchant: string;
  category: string;
  amount: number;
  currency: Currency;
  cadence: Cadence;
  nextRenewal: string;
  owner: Ownership;
  ownerLabel: string;
  status: Status;
  confidence: Confidence;
};

export type Opportunity = {
  id: string;
  title: string;
  type: "duplicate" | "plan_switch" | "billing_cycle" | "trial";
  summary: string;
  monthlySavings: number;
  annualSavings: number;
  effort: "low" | "medium";
  linkedSubscriptionIds: string[];
};

export type CreateSubscriptionInput = {
  merchant: string;
  category: string;
  amount: number;
  cadence: Cadence;
  nextRenewal: string;
  owner: Ownership;
  ownerLabel: string;
};

export type PopularSubscriptionTemplate = {
  id: string;
  country: Country;
  merchant: string;
  category: string;
  cadence: Cadence;
  defaultOwner: Ownership;
  ownerLabel: string;
  priceHint: string;
  defaultAmount: number | null;
  logoUrl: string;
  brandColor: string;
};

export type UpdateHouseholdInput = {
  name: string;
  country: Country;
  members: string[];
};

export type UpdateSubscriptionInput = Partial<{
  merchant: string;
  category: string;
  amount: number;
  cadence: Cadence;
  nextRenewal: string;
  owner: Ownership;
  ownerLabel: string;
  status: Status;
}>;

export type BankInstitution = {
  id: string;
  provider: BankProvider;
  name: string;
  countries: Country[];
  logoUrl?: string;
};

export type BankConnection = {
  id: string;
  provider: BankProvider;
  institutionId: string;
  institutionName: string;
  status: BankConnectionStatus;
  providerConnectionId?: string;
  providerSessionId?: string;
  callbackState?: string;
  requisitionId?: string;
  linkUrl?: string;
  errorMessage?: string;
  lastSyncedAt?: string;
  createdAt: string;
  accountCount?: number;
};

export type BankAccount = {
  id: string;
  connectionId: string;
  providerAccountId: string;
  name: string;
  iban?: string;
  currency: Currency;
  balance?: number;
  lastRefreshedAt?: string;
  connection?: BankConnection | null;
};

export type RecurringCandidateEvidence = {
  transactionCount: number;
  accountCount: number;
  matchedCatalog: boolean;
};

export type RecurringCandidate = {
  id: string;
  merchantName: string;
  category: string;
  cadence: Cadence;
  amount: number;
  currency: Currency;
  confidence: number;
  evidenceSummary: string;
  evidence: RecurringCandidateEvidence;
  nextRenewal: string;
  owner: Ownership;
  ownerLabel: string;
  status: RecurringCandidateStatus;
  linkedAccountIds: string[];
  linkedTransactionIds: string[];
  linkedSubscriptionId?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateBankConnectionInput = {
  institutionId: string;
  institutionName?: string;
  country: Country;
  redirectUrl?: string;
};

export type CompleteBankConnectionInput = {
  connectionId: string;
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
};

export type ReviewRecurringCandidateInput = {
  action: RecurringReviewAction;
  subscriptionId?: string;
  owner?: Ownership;
  ownerLabel?: string;
  category?: string;
  cadence?: Cadence;
  amount?: number;
  nextRenewal?: string;
};
