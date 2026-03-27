export type Country = "ES" | "FR";
export type Currency = "EUR";
export type Cadence = "monthly" | "annual";
export type Ownership = "shared" | "personal";
export type Status = "active" | "trial" | "pending_cancellation" | "cancelled";
export type Confidence = "manual" | "detected" | "confirmed";
export type MemberRole = "admin" | "member";
export type BankProvider = "mock" | "gocardless" | "enablebanking" | "unconfigured";
export type BankConnectionStatus = "pending" | "linked" | "error" | "revoked";
export type RecurringCandidateStatus = "pending" | "confirmed" | "rejected" | "merged";
export type RecurringReviewAction = "confirm" | "reject" | "merge";

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

export type HouseholdMember = {
  id: string;
  name: string;
  color: string;
};

export type Household = {
  id: string;
  name: string;
  country: Country;
  locale: string;
  currency: Currency;
  isSetupComplete: boolean;
  shareCode: string;
  members: HouseholdMember[];
};

export type User = {
  id: string;
  email: string;
  createdAt: string;
};

export type Membership = {
  id: string;
  userId: string;
  memberId: string;
  role: MemberRole;
};

export type AuthChallenge = {
  id: string;
  email: string;
  code: string;
  expiresAt: string;
  createdAt: string;
};

export type AuthSession = {
  id: string;
  token: string;
  userId: string;
  memberId: string;
  expiresAt: string;
  createdAt: string;
};

export type Session = {
  activeMemberId: string;
};

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
};

export type BankTransaction = {
  id: string;
  accountId: string;
  providerTransactionId: string;
  bookedAt: string;
  amount: number;
  currency: Currency;
  merchantName: string;
  description: string;
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

export type CandidateReview = {
  id: string;
  candidateId: string;
  action: RecurringReviewAction;
  memberId: string;
  subscriptionId?: string;
  createdAt: string;
};

export type Store = {
  household: Household;
  session: Session;
  users: User[];
  memberships: Membership[];
  authChallenges: AuthChallenge[];
  authSessions: AuthSession[];
  subscriptions: Subscription[];
  bankConnections: BankConnection[];
  bankAccounts: BankAccount[];
  bankTransactions: BankTransaction[];
  recurringCandidates: RecurringCandidate[];
  candidateReviews: CandidateReview[];
};

export type HouseholdMemberSummary = HouseholdMember & {
  monthlyRecurringTotal: number;
  activeSubscriptions: number;
};

export type HouseholdSummary = Household & {
  monthlyRecurringTotal: number;
  annualizedRecurringTotal: number;
  activeSubscriptions: number;
  sharedSubscriptions: number;
  renewalsDueSoon: number;
  memberSummaries: HouseholdMemberSummary[];
};

export type DashboardResponse = {
  household: HouseholdSummary;
  session: Session;
  subscriptions: Subscription[];
  opportunities: Opportunity[];
  recurringCandidates: RecurringCandidate[];
  bankConnections: BankConnection[];
  bankAccounts: BankAccount[];
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

export type UserSummary = {
  id: string;
  email: string;
};

export type AuthContext = {
  token: string;
  user: UserSummary;
  member: HouseholdMember;
  session: Session;
  household: HouseholdSummary;
};

export type UpdateHouseholdInput = {
  name: string;
  country: Country;
  locale: string;
  isSetupComplete?: boolean;
  members: HouseholdMember[];
};

export type UpdateSessionInput = {
  activeMemberId: string;
};

export type JoinHouseholdInput = {
  shareCode: string;
  memberName: string;
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

export type CreateSubscriptionInput = {
  merchant: string;
  category: string;
  amount: number;
  cadence: Cadence;
  nextRenewal: string;
  owner: Ownership;
  ownerLabel: string;
};

export type UpdateSubscriptionInput = Partial<CreateSubscriptionInput> & {
  status?: Status;
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

export type SyncBankConnectionInput = {
  connectionId: string;
};

export type DisconnectBankConnectionInput = {
  connectionId: string;
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
