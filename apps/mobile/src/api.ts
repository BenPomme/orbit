import { Platform } from "react-native";

import type {
  AuthChallengeResponse,
  AuthSessionResponse,
  BankAccount,
  BankConnection,
  BankInstitution,
  CompleteBankConnectionInput,
  CreateBankConnectionInput,
  CreateSubscriptionInput,
  HouseholdSummary,
  Opportunity,
  PopularSubscriptionTemplate,
  RecurringCandidate,
  RequestMagicLinkInput,
  ReviewRecurringCandidateInput,
  SessionState,
  Subscription,
  UpdateHouseholdInput,
  UpdateSubscriptionInput,
  VerifyMagicLinkInput,
} from "./types";

const baseUrl =
  process.env.EXPO_PUBLIC_API_URL ??
  Platform.select({
    android: "http://10.0.2.2:4000",
    default: "http://127.0.0.1:4000",
  });

let authToken: string | null = null;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    throw new Error(payload?.error ?? `Request failed with ${response.status}.`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getApiBaseUrl() {
  return baseUrl;
}

export async function requestMagicLink(input: RequestMagicLinkInput) {
  return request<AuthChallengeResponse>("/auth/request-link", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function verifyMagicLink(input: VerifyMagicLinkInput) {
  const response = await request<AuthSessionResponse>("/auth/verify", {
    method: "POST",
    body: JSON.stringify(input),
  });
  setAuthToken(response.token);

  return response;
}

export async function fetchAuthSession() {
  return request<AuthSessionResponse>("/auth/session");
}

export async function signOut() {
  await request<void>("/auth/signout", {
    method: "POST",
  });
  setAuthToken(null);
}

export async function resetDemoStore() {
  return request<{ household: HouseholdSummary; subscriptions: number }>("/debug/reset", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function fetchDashboard(): Promise<{
  household: HouseholdSummary;
  session: SessionState;
  subscriptions: Subscription[];
  opportunities: Opportunity[];
  popularSubscriptions: PopularSubscriptionTemplate[];
  bankConnections: BankConnection[];
  bankAccounts: BankAccount[];
  recurringCandidates: RecurringCandidate[];
}> {
  const [
    household,
    session,
    subscriptions,
    opportunities,
    popularSubscriptions,
    bankConnections,
    bankAccounts,
    recurringCandidates,
  ] = await Promise.all([
    request<HouseholdSummary>("/v1/household"),
    request<SessionState>("/v1/session"),
    request<{ data: Subscription[] }>("/v1/subscriptions"),
    request<{ data: Opportunity[] }>("/v1/opportunities"),
    request<{ data: PopularSubscriptionTemplate[] }>("/v1/catalog/popular"),
    request<{ data: BankConnection[] }>("/v1/banking/connections"),
    request<{ data: BankAccount[] }>("/v1/banking/accounts"),
    request<{ data: RecurringCandidate[] }>("/v1/recurring-candidates"),
  ]);

  return {
    household,
    session,
    subscriptions: subscriptions.data,
    opportunities: opportunities.data,
    popularSubscriptions: popularSubscriptions.data,
    bankConnections: bankConnections.data,
    bankAccounts: bankAccounts.data,
    recurringCandidates: recurringCandidates.data,
  };
}

export async function fetchPopularSubscriptions(country?: string) {
  const query = country ? `?country=${encodeURIComponent(country)}` : "";
  const response = await request<{ data: PopularSubscriptionTemplate[] }>(
    `/v1/catalog/popular${query}`,
  );

  return response.data;
}

export async function fetchInstitutions(country?: string, queryText?: string) {
  const params = new URLSearchParams();
  if (country) {
    params.set("country", country);
  }
  if (queryText?.trim()) {
    params.set("q", queryText.trim());
  }
  const query = params.size > 0 ? `?${params.toString()}` : "";
  const response = await request<{ data: BankInstitution[]; provider: string }>(
    `/v1/banking/institutions${query}`,
  );

  return response;
}

export async function createBankConnection(input: CreateBankConnectionInput) {
  return request<{ data: BankConnection; redirectUrl?: string }>("/v1/banking/connect", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function completeBankConnection(input: CompleteBankConnectionInput) {
  return request<{
    data: {
      connection: BankConnection;
      accountsImported: number;
      transactionsImported: number;
      recurringCandidates: number;
    };
  }>("/v1/banking/complete", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function syncBankConnection(connectionId: string) {
  return request<{
    data: {
      connection: BankConnection;
      accountsImported: number;
      transactionsImported: number;
      recurringCandidates: number;
    };
  }>("/v1/banking/sync", {
    method: "POST",
    body: JSON.stringify({ connectionId }),
  });
}

export async function disconnectBankConnection(connectionId: string) {
  await request<void>(`/v1/banking/connections/${connectionId}`, {
    method: "DELETE",
  });
}

export async function reviewRecurringCandidate(
  candidateId: string,
  input: ReviewRecurringCandidateInput,
) {
  return request<{ data: RecurringCandidate; subscription?: Subscription }>(
    `/v1/recurring-candidates/${candidateId}/review`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function createSubscription(input: CreateSubscriptionInput) {
  await request<{ data: Subscription }>("/v1/subscriptions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateHousehold(input: UpdateHouseholdInput) {
  return request<HouseholdSummary>("/v1/household", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function updateSession(activeMemberId: string) {
  return request<SessionState>("/v1/session", {
    method: "PATCH",
    body: JSON.stringify({ activeMemberId }),
  });
}

export async function updateSubscription(
  id: string,
  patch: UpdateSubscriptionInput,
) {
  await request<{ data: Subscription }>(`/v1/subscriptions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteSubscription(id: string) {
  await request<void>(`/v1/subscriptions/${id}`, {
    method: "DELETE",
  });
}
