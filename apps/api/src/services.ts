import type {
  AuthChallenge,
  CompleteBankConnectionInput,
  BankTransaction,
  Cadence,
  CandidateReview,
  Confidence,
  Country,
  CreateBankConnectionInput,
  CreateSubscriptionInput,
  HouseholdMember,
  HouseholdSummary,
  JoinHouseholdInput,
  Membership,
  Opportunity,
  Ownership,
  RecurringCandidate,
  RecurringReviewAction,
  RequestMagicLinkInput,
  ReviewRecurringCandidateInput,
  DisconnectBankConnectionInput,
  Status,
  Store,
  Subscription,
  UpdateSessionInput,
  UpdateHouseholdInput,
  UpdateSubscriptionInput,
  User,
  VerifyMagicLinkInput,
} from "./domain.js";
import { getPopularSubscriptions } from "./catalog.js";

const cadenceValues: Cadence[] = ["monthly", "annual"];
const ownershipValues: Ownership[] = ["shared", "personal"];
const statusValues: Status[] = [
  "active",
  "trial",
  "pending_cancellation",
  "cancelled",
];
const reviewActions: RecurringReviewAction[] = ["confirm", "reject", "merge"];
const supportedCountries: Country[] = ["ES", "FR"];
const memberColors = ["#0f9d7a", "#d97841", "#3d7cff", "#7d52f4"];

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeString(value: string): string {
  return value.trim();
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isCadence(value: unknown): value is Cadence {
  return cadenceValues.includes(value as Cadence);
}

function isOwnership(value: unknown): value is Ownership {
  return ownershipValues.includes(value as Ownership);
}

function isStatus(value: unknown): value is Status {
  return statusValues.includes(value as Status);
}

function isReviewAction(value: unknown): value is RecurringReviewAction {
  return reviewActions.includes(value as RecurringReviewAction);
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

function normalizeAmount(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;

  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }

  return Number(parsed.toFixed(2));
}

function normalizeCatalogKey(value: string) {
  return value.trim().toLowerCase();
}

function formatCurrency(amount: number) {
  return `EUR ${amount.toFixed(2)}`;
}

export function buildHouseholdSummary(store: Store): HouseholdSummary {
  const activeSubscriptions = store.subscriptions.filter(
    (subscription) => subscription.status !== "cancelled",
  );
  const memberSummaries = store.household.members.map((member) => {
    const memberSubscriptions = activeSubscriptions.filter(
      (subscription) =>
        subscription.owner === "personal" && subscription.ownerLabel === member.name,
    );
    const monthlyRecurringTotal = Number(
      memberSubscriptions
        .reduce((total, subscription) => {
          const normalizedAmount =
            subscription.cadence === "annual"
              ? subscription.amount / 12
              : subscription.amount;

          return total + normalizedAmount;
        }, 0)
        .toFixed(2),
    );

    return {
      ...member,
      monthlyRecurringTotal,
      activeSubscriptions: memberSubscriptions.length,
    };
  });

  const monthlyRecurringTotal = Number(
    activeSubscriptions
      .reduce((total, subscription) => {
        const normalizedAmount =
          subscription.cadence === "annual"
            ? subscription.amount / 12
            : subscription.amount;

        return total + normalizedAmount;
      }, 0)
      .toFixed(2),
  );

  const renewalsDueSoon = activeSubscriptions.filter((subscription) => {
    const daysUntilRenewal =
      (Date.parse(subscription.nextRenewal) - Date.now()) / (1000 * 60 * 60 * 24);

    return daysUntilRenewal >= 0 && daysUntilRenewal <= 7;
  }).length;

  return {
    ...store.household,
    monthlyRecurringTotal,
    annualizedRecurringTotal: Number((monthlyRecurringTotal * 12).toFixed(2)),
    activeSubscriptions: activeSubscriptions.length,
    sharedSubscriptions: activeSubscriptions.filter(
      (subscription) => subscription.owner === "shared",
    ).length,
    renewalsDueSoon,
    memberSummaries,
  };
}

export function buildOpportunities(
  subscriptions: Subscription[],
  country: Country = "ES",
): Opportunity[] {
  const activeSubscriptions = subscriptions.filter(
    (subscription) => subscription.status !== "cancelled",
  );

  const opportunities: Opportunity[] = [];
  const catalog = getPopularSubscriptions(country);
  const entertainmentSubscriptions = activeSubscriptions.filter(
    (subscription) =>
      subscription.category === "Entertainment" && subscription.cadence === "monthly",
  );

  activeSubscriptions
    .filter(
      (subscription) =>
        subscription.status === "active" && subscription.cadence === "monthly",
    )
    .forEach((subscription) => {
      const matchedTemplate = catalog.find(
        (template) =>
          template.defaultAmount !== null &&
          normalizeCatalogKey(template.merchant) ===
            normalizeCatalogKey(subscription.merchant) &&
          subscription.amount - template.defaultAmount >= 2.5,
      );

      if (!matchedTemplate || matchedTemplate.defaultAmount === null) {
        return;
      }

      const monthlySavings = Number(
        (subscription.amount - matchedTemplate.defaultAmount).toFixed(2),
      );

      opportunities.push({
        id: `plan-${subscription.id}`,
        title: `Check the current ${subscription.merchant} plan`,
        type: "plan_switch",
        summary: `${subscription.merchant} is tracked at ${formatCurrency(subscription.amount)} per month, above the catalog entry point for ${country} (${matchedTemplate.priceHint}). Confirm whether the household still needs the higher tier.`,
        monthlySavings,
        annualSavings: Number((monthlySavings * 12).toFixed(2)),
        effort: "medium",
        linkedSubscriptionIds: [subscription.id],
      });
    });

  activeSubscriptions
    .filter((subscription) => subscription.status === "trial")
    .forEach((subscription) => {
      opportunities.push({
        id: `trial-${subscription.id}`,
        title: `Review ${subscription.merchant} before it converts`,
        type: "trial",
        summary: `${subscription.merchant} is marked as a trial and renews on ${subscription.nextRenewal}.`,
        monthlySavings: subscription.amount,
        annualSavings: Number((subscription.amount * 12).toFixed(2)),
        effort: "low",
        linkedSubscriptionIds: [subscription.id],
      });
    });

  activeSubscriptions
    .filter(
      (subscription) =>
        subscription.cadence === "monthly" &&
        subscription.status === "active" &&
        subscription.amount >= 12,
    )
    .slice(0, 1)
    .forEach((subscription) => {
      opportunities.push({
        id: `annual-${subscription.id}`,
        title: `Test annual billing for ${subscription.merchant}`,
        type: "billing_cycle",
        summary:
          "Stable monthly services are good candidates for annual billing discounts once the household confirms long-term use.",
        monthlySavings: Number((subscription.amount * 0.08).toFixed(2)),
        annualSavings: Number((subscription.amount * 0.08 * 12).toFixed(2)),
        effort: "low",
        linkedSubscriptionIds: [subscription.id],
      });
    });

  if (entertainmentSubscriptions.length >= 3) {
    opportunities.push({
      id: "entertainment-overlap",
      title: "Review overlapping entertainment services",
      type: "plan_switch",
      summary:
        "The household has multiple active entertainment subscriptions. There may be a bundle or a lower-tier plan worth testing.",
      monthlySavings: 9.99,
      annualSavings: 119.88,
      effort: "medium",
      linkedSubscriptionIds: entertainmentSubscriptions.map(
        (subscription) => subscription.id,
      ),
    });
  }

  return opportunities;
}

export function createSubscription(input: CreateSubscriptionInput): Subscription {
  return {
    id: crypto.randomUUID(),
    merchant: input.merchant,
    category: input.category,
    amount: input.amount,
    currency: "EUR",
    cadence: input.cadence,
    nextRenewal: input.nextRenewal,
    owner: input.owner,
    ownerLabel: input.ownerLabel,
    status: "active",
    confidence: "manual",
  };
}

export function createAuthChallenge(email: string): AuthChallenge {
  return {
    id: crypto.randomUUID(),
    email: normalizeEmail(email),
    code: `${Math.floor(100000 + Math.random() * 900000)}`,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  };
}

export function getOrCreateMember(
  store: Store,
  memberName: string,
  createIfMissing = true,
): HouseholdMember | null {
  const normalizedName = normalizeString(memberName).toLowerCase();
  const existingMember =
    store.household.members.find(
      (member) => member.name.trim().toLowerCase() === normalizedName,
    ) ?? null;

  if (existingMember || !createIfMissing) {
    return existingMember;
  }

  const member: HouseholdMember = {
    id: `member-${crypto.randomUUID()}`,
    name: normalizeString(memberName),
    color: memberColors[store.household.members.length % memberColors.length],
  };
  store.household.members.push(member);

  return member;
}

export function getOrCreateUser(store: Store, email: string): User {
  const normalizedEmail = normalizeEmail(email);
  const existingUser =
    store.users.find((user) => normalizeEmail(user.email) === normalizedEmail) ?? null;

  if (existingUser) {
    return existingUser;
  }

  const user: User = {
    id: `user-${crypto.randomUUID()}`,
    email: normalizedEmail,
    createdAt: new Date().toISOString(),
  };
  store.users.push(user);

  return user;
}

export function getOrCreateMembership(
  store: Store,
  userId: string,
  memberId: string,
): Membership {
  const existingMembership =
    store.memberships.find(
      (membership) => membership.userId === userId && membership.memberId === memberId,
    ) ?? null;

  if (existingMembership) {
    return existingMembership;
  }

  const membership: Membership = {
    id: `membership-${crypto.randomUUID()}`,
    userId,
    memberId,
    role: store.memberships.length === 0 ? "admin" : "member",
  };
  store.memberships.push(membership);

  return membership;
}

export function createDefaultHouseholdForMember(store: Store, memberName: string) {
  const member: HouseholdMember = {
    id: `member-${crypto.randomUUID()}`,
    name: normalizeString(memberName),
    color: memberColors[0],
  };

  store.household = {
    ...store.household,
    name: `${member.name}'s Household`,
    country: "ES",
    locale: "es-ES",
    isSetupComplete: false,
    shareCode: `ORBIT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    members: [member],
  };
  store.session.activeMemberId = member.id;

  return member;
}

export function createRecurringCandidates(
  transactions: BankTransaction[],
  country: Country,
  existingSubscriptions: Subscription[],
  householdMembers: HouseholdMember[],
  previousCandidates: RecurringCandidate[],
): RecurringCandidate[] {
  const groups = new Map<string, BankTransaction[]>();

  for (const transaction of transactions) {
    const key = normalizeCatalogKey(transaction.merchantName);
    const current = groups.get(key) ?? [];
    current.push(transaction);
    groups.set(key, current);
  }

  const catalog = getPopularSubscriptions(country);
  const nextCandidates: RecurringCandidate[] = [];

  for (const [key, group] of groups.entries()) {
    if (group.length < 2) {
      continue;
    }

    const sorted = [...group].sort((left, right) => left.bookedAt.localeCompare(right.bookedAt));
    const amount = Number(
      (sorted.reduce((total, transaction) => total + transaction.amount, 0) / sorted.length).toFixed(
        2,
      ),
    );
    const diffs = sorted.slice(1).map((transaction, index) => {
      const previous = sorted[index];
      return Math.round(
        (Date.parse(transaction.bookedAt) - Date.parse(previous.bookedAt)) /
          (1000 * 60 * 60 * 24),
      );
    });
    const averageDiff =
      diffs.reduce((total, diff) => total + diff, 0) / Math.max(diffs.length, 1);
    const cadence = inferCadence(averageDiff);

    if (!cadence) {
      continue;
    }

    const variance = Math.max(...sorted.map((transaction) => Math.abs(transaction.amount - amount)));
    const catalogMatch = catalog.find(
      (template) => normalizeCatalogKey(template.merchant) === key,
    );
    const existingSubscription = existingSubscriptions.find(
      (subscription) => normalizeCatalogKey(subscription.merchant) === key,
    );
    const confidence = buildConfidence({
      cadence,
      transactionCount: sorted.length,
      variance,
      hasCatalogMatch: catalogMatch !== undefined,
      alreadyTracked: existingSubscription !== undefined,
    });

    const lastTransaction = sorted[sorted.length - 1];
    const nextRenewal = advanceRenewal(lastTransaction.bookedAt, cadence);
    const previous =
      previousCandidates.find((candidate) => normalizeCatalogKey(candidate.merchantName) === key) ??
      null;
    const defaultMember = householdMembers[0];
    const linkedAccountIds = [...new Set(sorted.map((transaction) => transaction.accountId))];

    nextCandidates.push({
      id: previous?.id ?? `candidate-${crypto.randomUUID()}`,
      merchantName: catalogMatch?.merchant ?? lastTransaction.merchantName,
      category: catalogMatch?.category ?? "Uncategorized",
      cadence,
      amount,
      currency: "EUR",
      confidence,
      evidenceSummary: `${sorted.length} matching ${cadence} transactions detected across ${linkedAccountIds.length} account(s).`,
      evidence: {
        transactionCount: sorted.length,
        accountCount: linkedAccountIds.length,
        matchedCatalog: catalogMatch !== undefined,
      },
      nextRenewal,
      owner: existingSubscription?.owner ?? "shared",
      ownerLabel: existingSubscription?.ownerLabel ?? defaultMember?.name ?? "Household",
      status: existingSubscription
        ? "merged"
        : previous?.status === "rejected"
          ? "rejected"
          : previous?.status === "confirmed"
            ? "confirmed"
            : "pending",
      linkedAccountIds,
      linkedTransactionIds: sorted.map((transaction) => transaction.id),
      linkedSubscriptionId: existingSubscription?.id ?? previous?.linkedSubscriptionId,
      createdAt: previous?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return nextCandidates.sort((left, right) => right.confidence - left.confidence);
}

export function reviewRecurringCandidate(
  store: Store,
  candidateId: string,
  action: ReviewRecurringCandidateInput,
  reviewerMemberId: string,
): { candidate: RecurringCandidate; review: CandidateReview; subscription?: Subscription } | null {
  const candidate = store.recurringCandidates.find((item) => item.id === candidateId) ?? null;

  if (!candidate) {
    return null;
  }

  const review: CandidateReview = {
    id: `candidate-review-${crypto.randomUUID()}`,
    candidateId: candidate.id,
    action: action.action,
    memberId: reviewerMemberId,
    subscriptionId: action.subscriptionId,
    createdAt: new Date().toISOString(),
  };
  store.candidateReviews.push(review);

  if (action.action === "reject") {
    candidate.status = "rejected";
    candidate.updatedAt = new Date().toISOString();
    return { candidate, review };
  }

  if (action.action === "merge" && action.subscriptionId) {
    const subscription = store.subscriptions.find((item) => item.id === action.subscriptionId);

    if (!subscription) {
      return null;
    }

    candidate.status = "merged";
    candidate.linkedSubscriptionId = subscription.id;
    candidate.updatedAt = new Date().toISOString();

    return { candidate, review, subscription };
  }

  const subscription = createSubscription({
    merchant: candidate.merchantName,
    category: action.category ?? candidate.category,
    amount: action.amount ?? candidate.amount,
    cadence: action.cadence ?? candidate.cadence,
    nextRenewal: action.nextRenewal ?? candidate.nextRenewal,
    owner: action.owner ?? candidate.owner,
    ownerLabel: action.ownerLabel ?? candidate.ownerLabel,
  });
  subscription.confidence = "confirmed";
  store.subscriptions.unshift(subscription);

  candidate.status = "confirmed";
  candidate.linkedSubscriptionId = subscription.id;
  candidate.owner = subscription.owner;
  candidate.ownerLabel = subscription.ownerLabel;
  candidate.updatedAt = new Date().toISOString();

  return { candidate, review, subscription };
}

export function parseCreateSubscription(
  body: unknown,
): { data: CreateSubscriptionInput } | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Request body must be an object." };
  }

  const candidate = body as Record<string, unknown>;
  const amount = normalizeAmount(candidate.amount);

  if (!isString(candidate.merchant)) {
    return { error: "merchant is required." };
  }

  if (!isString(candidate.category)) {
    return { error: "category is required." };
  }

  if (amount === null) {
    return { error: "amount must be a positive number." };
  }

  if (!isCadence(candidate.cadence)) {
    return { error: "cadence must be monthly or annual." };
  }

  if (!isString(candidate.nextRenewal) || !isIsoDate(candidate.nextRenewal)) {
    return { error: "nextRenewal must be an ISO date (YYYY-MM-DD)." };
  }

  if (!isOwnership(candidate.owner)) {
    return { error: "owner must be shared or personal." };
  }

  if (!isString(candidate.ownerLabel)) {
    return { error: "ownerLabel is required." };
  }

  return {
    data: {
      merchant: normalizeString(candidate.merchant),
      category: normalizeString(candidate.category),
      amount,
      cadence: candidate.cadence,
      nextRenewal: candidate.nextRenewal,
      owner: candidate.owner,
      ownerLabel: normalizeString(candidate.ownerLabel),
    },
  };
}

export function parseUpdateSubscription(
  body: unknown,
): { data: UpdateSubscriptionInput } | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Request body must be an object." };
  }

  const candidate = body as Record<string, unknown>;
  const payload: UpdateSubscriptionInput = {};

  if (candidate.merchant !== undefined) {
    if (!isString(candidate.merchant)) {
      return { error: "merchant must be a non-empty string." };
    }
    payload.merchant = normalizeString(candidate.merchant);
  }

  if (candidate.category !== undefined) {
    if (!isString(candidate.category)) {
      return { error: "category must be a non-empty string." };
    }
    payload.category = normalizeString(candidate.category);
  }

  if (candidate.amount !== undefined) {
    const amount = normalizeAmount(candidate.amount);
    if (amount === null) {
      return { error: "amount must be a positive number." };
    }
    payload.amount = amount;
  }

  if (candidate.cadence !== undefined) {
    if (!isCadence(candidate.cadence)) {
      return { error: "cadence must be monthly or annual." };
    }
    payload.cadence = candidate.cadence;
  }

  if (candidate.nextRenewal !== undefined) {
    if (!isString(candidate.nextRenewal) || !isIsoDate(candidate.nextRenewal)) {
      return { error: "nextRenewal must be an ISO date (YYYY-MM-DD)." };
    }
    payload.nextRenewal = candidate.nextRenewal;
  }

  if (candidate.owner !== undefined) {
    if (!isOwnership(candidate.owner)) {
      return { error: "owner must be shared or personal." };
    }
    payload.owner = candidate.owner;
  }

  if (candidate.ownerLabel !== undefined) {
    if (!isString(candidate.ownerLabel)) {
      return { error: "ownerLabel must be a non-empty string." };
    }
    payload.ownerLabel = normalizeString(candidate.ownerLabel);
  }

  if (candidate.status !== undefined) {
    if (!isStatus(candidate.status)) {
      return { error: "status is invalid." };
    }
    payload.status = candidate.status;
  }

  return { data: payload };
}

export function parseUpdateHousehold(
  body: unknown,
): { data: UpdateHouseholdInput } | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Request body must be an object." };
  }

  const candidate = body as Record<string, unknown>;

  if (!isString(candidate.name)) {
    return { error: "name is required." };
  }

  if (!isString(candidate.country)) {
    return { error: "country is required." };
  }

  const country = normalizeString(candidate.country).toUpperCase() as Country;
  if (!supportedCountries.includes(country)) {
    return { error: "country must be ES or FR." };
  }

  const members = parseMembers(candidate.members);
  if ("error" in members) {
    return members;
  }

  return {
    data: {
      name: normalizeString(candidate.name),
      country,
      locale: country === "FR" ? "fr-FR" : "es-ES",
      isSetupComplete:
        typeof candidate.isSetupComplete === "boolean"
          ? candidate.isSetupComplete
          : true,
      members: members.data,
    },
  };
}

export function parseUpdateSession(
  body: unknown,
): { data: UpdateSessionInput } | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Request body must be an object." };
  }

  const candidate = body as Record<string, unknown>;

  if (!isString(candidate.activeMemberId)) {
    return { error: "activeMemberId is required." };
  }

  return {
    data: {
      activeMemberId: normalizeString(candidate.activeMemberId),
    },
  };
}

export function parseJoinHousehold(
  body: unknown,
): { data: JoinHouseholdInput } | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Request body must be an object." };
  }

  const candidate = body as Record<string, unknown>;

  if (!isString(candidate.shareCode)) {
    return { error: "shareCode is required." };
  }

  if (!isString(candidate.memberName)) {
    return { error: "memberName is required." };
  }

  return {
    data: {
      shareCode: normalizeString(candidate.shareCode).toUpperCase(),
      memberName: normalizeString(candidate.memberName),
    },
  };
}

export function parseRequestMagicLink(
  body: unknown,
): { data: RequestMagicLinkInput } | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Request body must be an object." };
  }

  const candidate = body as Record<string, unknown>;
  if (!isString(candidate.email) || !candidate.email.includes("@")) {
    return { error: "email is required." };
  }

  return {
    data: {
      email: normalizeEmail(candidate.email),
    },
  };
}

export function parseVerifyMagicLink(
  body: unknown,
): { data: VerifyMagicLinkInput } | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Request body must be an object." };
  }

  const candidate = body as Record<string, unknown>;

  if (!isString(candidate.challengeId)) {
    return { error: "challengeId is required." };
  }
  if (!isString(candidate.code)) {
    return { error: "code is required." };
  }
  if (!isString(candidate.memberName)) {
    return { error: "memberName is required." };
  }

  return {
    data: {
      challengeId: normalizeString(candidate.challengeId),
      code: normalizeString(candidate.code),
      memberName: normalizeString(candidate.memberName),
      shareCode: isString(candidate.shareCode)
        ? normalizeString(candidate.shareCode).toUpperCase()
        : undefined,
    },
  };
}

export function parseCreateBankConnection(
  body: unknown,
): { data: CreateBankConnectionInput } | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Request body must be an object." };
  }

  const candidate = body as Record<string, unknown>;

  if (!isString(candidate.institutionId)) {
    return { error: "institutionId is required." };
  }
  if (!isString(candidate.country)) {
    return { error: "country is required." };
  }

  const country = normalizeString(candidate.country).toUpperCase() as Country;
  if (!supportedCountries.includes(country)) {
    return { error: "country must be ES or FR." };
  }

  return {
    data: {
      institutionId: normalizeString(candidate.institutionId),
      institutionName: isString(candidate.institutionName)
        ? normalizeString(candidate.institutionName)
        : undefined,
      country,
      redirectUrl: isString(candidate.redirectUrl)
        ? normalizeString(candidate.redirectUrl)
        : undefined,
    },
  };
}

export function parseSyncBankConnection(
  body: unknown,
): { data: { connectionId: string } } | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Request body must be an object." };
  }

  const candidate = body as Record<string, unknown>;
  if (!isString(candidate.connectionId)) {
    return { error: "connectionId is required." };
  }

  return {
    data: {
      connectionId: normalizeString(candidate.connectionId),
    },
  };
}

export function parseCompleteBankConnection(
  body: unknown,
): { data: CompleteBankConnectionInput } | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Request body must be an object." };
  }

  const candidate = body as Record<string, unknown>;
  if (!isString(candidate.connectionId)) {
    return { error: "connectionId is required." };
  }

  return {
    data: {
      connectionId: normalizeString(candidate.connectionId),
      code: isString(candidate.code) ? normalizeString(candidate.code) : undefined,
      state: isString(candidate.state) ? normalizeString(candidate.state) : undefined,
      error: isString(candidate.error) ? normalizeString(candidate.error) : undefined,
      errorDescription: isString(candidate.errorDescription)
        ? normalizeString(candidate.errorDescription)
        : undefined,
    },
  };
}

export function parseDisconnectBankConnection(
  body: unknown,
): { data: DisconnectBankConnectionInput } | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Request body must be an object." };
  }

  const candidate = body as Record<string, unknown>;
  if (!isString(candidate.connectionId)) {
    return { error: "connectionId is required." };
  }

  return {
    data: {
      connectionId: normalizeString(candidate.connectionId),
    },
  };
}

export function parseReviewRecurringCandidate(
  body: unknown,
): { data: ReviewRecurringCandidateInput } | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Request body must be an object." };
  }

  const candidate = body as Record<string, unknown>;
  if (!isReviewAction(candidate.action)) {
    return { error: "action is invalid." };
  }

  if (candidate.subscriptionId !== undefined && !isString(candidate.subscriptionId)) {
    return { error: "subscriptionId must be a string." };
  }

  if (candidate.owner !== undefined && !isOwnership(candidate.owner)) {
    return { error: "owner must be shared or personal." };
  }

  if (candidate.ownerLabel !== undefined && !isString(candidate.ownerLabel)) {
    return { error: "ownerLabel must be a non-empty string." };
  }

  if (candidate.category !== undefined && !isString(candidate.category)) {
    return { error: "category must be a non-empty string." };
  }

  if (candidate.cadence !== undefined && !isCadence(candidate.cadence)) {
    return { error: "cadence must be monthly or annual." };
  }

  if (
    candidate.nextRenewal !== undefined &&
    (!isString(candidate.nextRenewal) || !isIsoDate(candidate.nextRenewal))
  ) {
    return { error: "nextRenewal must be an ISO date (YYYY-MM-DD)." };
  }

  if (candidate.amount !== undefined && normalizeAmount(candidate.amount) === null) {
    return { error: "amount must be a positive number." };
  }

  return {
    data: {
      action: candidate.action,
      subscriptionId: isString(candidate.subscriptionId)
        ? normalizeString(candidate.subscriptionId)
        : undefined,
      owner: candidate.owner,
      ownerLabel: isString(candidate.ownerLabel)
        ? normalizeString(candidate.ownerLabel)
        : undefined,
      category: isString(candidate.category) ? normalizeString(candidate.category) : undefined,
      cadence: candidate.cadence,
      amount:
        candidate.amount === undefined ? undefined : normalizeAmount(candidate.amount) ?? undefined,
      nextRenewal: isString(candidate.nextRenewal)
        ? normalizeString(candidate.nextRenewal)
        : undefined,
    },
  };
}

function parseMembers(
  value: unknown,
): { data: UpdateHouseholdInput["members"] } | { error: string } {
  if (!Array.isArray(value)) {
    return { error: "members must be an array." };
  }

  const names = value
    .map((entry) =>
      typeof entry === "string"
        ? entry
        : typeof entry === "object" &&
            entry !== null &&
            "name" in entry &&
            typeof (entry as { name: unknown }).name === "string"
          ? (entry as { name: string }).name
          : "",
    )
    .map((name) => normalizeString(name))
    .filter(Boolean)
    .slice(0, 4);

  if (names.length === 0) {
    return { error: "At least one household member is required." };
  }

  return {
    data: names.map((name, index) => ({
      id: `member-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index + 1}`,
      name,
      color: memberColors[index % memberColors.length],
    })),
  };
}

function inferCadence(averageDiff: number): Cadence | null {
  if (averageDiff >= 25 && averageDiff <= 35) {
    return "monthly";
  }

  if (averageDiff >= 330 && averageDiff <= 380) {
    return "annual";
  }

  return null;
}

function buildConfidence(input: {
  cadence: Cadence;
  transactionCount: number;
  variance: number;
  hasCatalogMatch: boolean;
  alreadyTracked: boolean;
}) {
  let score = input.cadence === "monthly" ? 0.58 : 0.62;

  if (input.transactionCount >= 3) {
    score += 0.1;
  }

  if (input.variance <= 1.5) {
    score += 0.12;
  } else if (input.variance <= 4) {
    score += 0.05;
  }

  if (input.hasCatalogMatch) {
    score += 0.12;
  }

  if (input.alreadyTracked) {
    score += 0.05;
  }

  return Number(Math.min(score, 0.96).toFixed(2));
}

function advanceRenewal(bookedAt: string, cadence: Cadence) {
  const next = new Date(bookedAt);
  next.setUTCMonth(next.getUTCMonth() + (cadence === "monthly" ? 1 : 12));

  return next.toISOString().slice(0, 10);
}
