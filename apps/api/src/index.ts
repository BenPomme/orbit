import cors from "@fastify/cors";
import Fastify from "fastify";

import {
  buildHouseholdSummary,
  buildOpportunities,
  createAuthChallenge,
  createDefaultHouseholdForMember,
  createRecurringCandidates,
  createSubscription,
  getOrCreateMember,
  getOrCreateMembership,
  getOrCreateUser,
  parseCompleteBankConnection,
  parseCreateBankConnection,
  parseCreateSubscription,
  parseDisconnectBankConnection,
  parseRequestMagicLink,
  parseReviewRecurringCandidate,
  parseSyncBankConnection,
  parseUpdateSession,
  parseUpdateHousehold,
  parseUpdateSubscription,
  parseVerifyMagicLink,
  reviewRecurringCandidate,
} from "./services.js";
import { createDemoStore, loadStore, saveStore } from "./store.js";
import { createAuthSessionPayload, getBearerToken, requireAuth, resolveAuthSession } from "./auth.js";
import { getPopularSubscriptions } from "./catalog.js";
import { getBankingProvider } from "./banking/provider.js";
import type { Store } from "./domain.js";

const app = Fastify({
  logger: true,
});

function replaceConnection(store: Store, nextConnection: Store["bankConnections"][number]) {
  store.bankConnections = [
    nextConnection,
    ...store.bankConnections.filter((item) => item.id !== nextConnection.id),
  ];
}

function removeConnectionData(store: Store, connectionId: string) {
  const accountIds = new Set(
    store.bankAccounts
      .filter((account) => account.connectionId === connectionId)
      .map((account) => account.id),
  );

  store.bankConnections = store.bankConnections.filter((connection) => connection.id !== connectionId);
  store.bankAccounts = store.bankAccounts.filter((account) => !accountIds.has(account.id));
  store.bankTransactions = store.bankTransactions.filter(
    (transaction) => !accountIds.has(transaction.accountId),
  );
  store.recurringCandidates = createRecurringCandidates(
    store.bankTransactions,
    store.household.country,
    store.subscriptions,
    store.household.members,
    store.recurringCandidates.filter(
      (candidate) =>
        !candidate.linkedAccountIds.some((accountId) => accountIds.has(accountId)),
    ),
  );
}

function applySyncedConnection(
  store: Store,
  previousConnectionId: string,
  synced: {
    connection: Store["bankConnections"][number];
    accounts: Store["bankAccounts"];
    transactions: Store["bankTransactions"];
  },
) {
  replaceConnection(store, synced.connection);

  const connectionAccountIds = new Set(
    store.bankAccounts
      .filter((account) => account.connectionId === previousConnectionId)
      .map((account) => account.id),
  );

  store.bankAccounts = [
    ...store.bankAccounts.filter((account) => !connectionAccountIds.has(account.id)),
    ...synced.accounts,
  ];
  store.bankTransactions = [
    ...store.bankTransactions.filter(
      (transaction) =>
        !connectionAccountIds.has(transaction.accountId) &&
        !synced.accounts.some((account) => account.id === transaction.accountId),
    ),
    ...synced.transactions,
  ];
  store.recurringCandidates = createRecurringCandidates(
    store.bankTransactions,
    store.household.country,
    store.subscriptions,
    store.household.members,
    store.recurringCandidates,
  );
}

await app.register(cors, {
  origin: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

app.get("/health", async () => ({
  ok: true,
  service: "subscription-manager-api",
  now: new Date().toISOString(),
  bankProvider: getBankingProvider().provider,
}));

app.post("/debug/reset", async (_request, reply) => {
  if (process.env.ENABLE_DEV_ROUTES !== "true") {
    return reply.code(404).send({ error: "Not found." });
  }

  const store = createDemoStore();
  await saveStore(store);

  return reply.code(201).send({
    household: buildHouseholdSummary(store),
    subscriptions: store.subscriptions.length,
  });
});

app.post("/auth/request-link", async (request, reply) => {
  const parsed = parseRequestMagicLink(request.body);
  if ("error" in parsed) {
    return reply.code(400).send({ error: parsed.error });
  }

  const store = await loadStore();
  const challenge = createAuthChallenge(parsed.data.email);
  store.authChallenges = store.authChallenges.filter(
    (item) => item.email !== challenge.email,
  );
  store.authChallenges.unshift(challenge);
  await saveStore(store);

  return {
    challengeId: challenge.id,
    expiresAt: challenge.expiresAt,
    devCode: challenge.code,
  };
});

app.post("/auth/verify", async (request, reply) => {
  const parsed = parseVerifyMagicLink(request.body);
  if ("error" in parsed) {
    return reply.code(400).send({ error: parsed.error });
  }

  const store = await loadStore();
  const challenge =
    store.authChallenges.find((item) => item.id === parsed.data.challengeId) ?? null;

  if (!challenge || challenge.code !== parsed.data.code) {
    return reply.code(401).send({ error: "Invalid verification code." });
  }

  if (Date.parse(challenge.expiresAt) <= Date.now()) {
    return reply.code(401).send({ error: "Verification code has expired." });
  }

  if (
    parsed.data.shareCode &&
    store.household.shareCode !== parsed.data.shareCode.toUpperCase()
  ) {
    return reply.code(404).send({ error: "Household not found for that share code." });
  }

  const user = getOrCreateUser(store, challenge.email);
  let membership =
    store.memberships.find((item) => item.userId === user.id) ?? null;
  let member =
    membership
      ? store.household.members.find((item) => item.id === membership?.memberId) ?? null
      : null;

  if (!member && store.household.members.length === 0) {
    member = createDefaultHouseholdForMember(store, parsed.data.memberName);
  }

  if (!member) {
    member = getOrCreateMember(store, parsed.data.memberName, true);
  }

  if (!member) {
    return reply.code(400).send({ error: "Unable to resolve a household member." });
  }

  membership = getOrCreateMembership(store, user.id, member.id);
  store.authChallenges = store.authChallenges.filter((item) => item.id !== challenge.id);
  store.authSessions = store.authSessions.filter((item) => item.userId !== user.id);

  const authSession = {
    id: `auth-session-${crypto.randomUUID()}`,
    token: crypto.randomUUID(),
    userId: user.id,
    memberId: membership.memberId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
  store.authSessions.unshift(authSession);
  store.session.activeMemberId = member.id;
  await saveStore(store);

  return createAuthSessionPayload(
    authSession.token,
    buildHouseholdSummary(store),
    { id: user.id, email: user.email },
    member,
  );
});

app.get("/auth/session", async (request, reply) => {
  const store = await loadStore();
  const context = await requireAuth(request, reply, store);

  if (!context) {
    return;
  }

  return context;
});

app.post("/auth/signout", async (request, reply) => {
  const store = await loadStore();
  const token = getBearerToken(request);

  if (!token) {
    return reply.code(204).send();
  }

  store.authSessions = store.authSessions.filter((item) => item.token !== token);
  await saveStore(store);

  return reply.code(204).send();
});

app.get("/v1/household", async (request, reply) => {
  const store = await loadStore();
  const context = await requireAuth(request, reply, store);

  if (!context) {
    return;
  }

  return context.household;
});

app.get("/v1/session", async (request, reply) => {
  const store = await loadStore();
  const context = await requireAuth(request, reply, store);

  if (!context) {
    return;
  }

  return context.session;
});

app.patch("/v1/session", async (request, reply) => {
  const parsed = parseUpdateSession(request.body);
  if ("error" in parsed) {
    return reply.code(400).send({ error: parsed.error });
  }

  const store = await loadStore();
  const token = getBearerToken(request);
  const authSession = resolveAuthSession(store, token);
  const context = await requireAuth(request, reply, store);

  if (!authSession || !context) {
    return;
  }

  const memberExists = store.household.members.some(
    (member) => member.id === parsed.data.activeMemberId,
  );

  if (!memberExists) {
    return reply.code(404).send({ error: "Household member not found." });
  }

  store.session.activeMemberId = parsed.data.activeMemberId;
  authSession.memberId = parsed.data.activeMemberId;
  await saveStore(store);

  return {
    activeMemberId: parsed.data.activeMemberId,
  };
});

app.patch("/v1/household", async (request, reply) => {
  const parsed = parseUpdateHousehold(request.body);
  if ("error" in parsed) {
    return reply.code(400).send({ error: parsed.error });
  }

  const store = await loadStore();
  const context = await requireAuth(request, reply, store);

  if (!context) {
    return;
  }

  store.household = {
    ...store.household,
    name: parsed.data.name,
    country: parsed.data.country,
    locale: parsed.data.locale,
    isSetupComplete: parsed.data.isSetupComplete ?? true,
    members: parsed.data.members,
  };

  const existingMemberIds = new Set(store.household.members.map((member) => member.id));
  store.memberships = store.memberships.filter((membership) =>
    existingMemberIds.has(membership.memberId),
  );
  if (!existingMemberIds.has(store.session.activeMemberId)) {
    store.session.activeMemberId = store.household.members[0].id;
  }
  store.authSessions = store.authSessions.map((session) =>
    existingMemberIds.has(session.memberId)
      ? session
      : { ...session, memberId: store.household.members[0].id },
  );
  await saveStore(store);

  return buildHouseholdSummary(store);
});

app.get("/v1/subscriptions", async (request, reply) => {
  const store = await loadStore();
  const context = await requireAuth(request, reply, store);

  if (!context) {
    return;
  }

  return {
    data: store.subscriptions.sort((left, right) =>
      left.nextRenewal.localeCompare(right.nextRenewal),
    ),
  };
});

app.post("/v1/subscriptions", async (request, reply) => {
  const parsed = parseCreateSubscription(request.body);
  if ("error" in parsed) {
    return reply.code(400).send({ error: parsed.error });
  }

  const store = await loadStore();
  const context = await requireAuth(request, reply, store);

  if (!context) {
    return;
  }

  const subscription = createSubscription(parsed.data);
  store.subscriptions.unshift(subscription);
  await saveStore(store);

  return reply.code(201).send({ data: subscription });
});

app.patch("/v1/subscriptions/:id", async (request, reply) => {
  const parsed = parseUpdateSubscription(request.body);
  if ("error" in parsed) {
    return reply.code(400).send({ error: parsed.error });
  }

  const store = await loadStore();
  const context = await requireAuth(request, reply, store);

  if (!context) {
    return;
  }

  const subscription = store.subscriptions.find(
    (item) => item.id === (request.params as { id: string }).id,
  );

  if (!subscription) {
    return reply.code(404).send({ error: "Subscription not found." });
  }

  Object.assign(subscription, parsed.data);
  await saveStore(store);

  return { data: subscription };
});

app.delete("/v1/subscriptions/:id", async (request, reply) => {
  const store = await loadStore();
  const context = await requireAuth(request, reply, store);

  if (!context) {
    return;
  }

  const nextSubscriptions = store.subscriptions.filter(
    (item) => item.id !== (request.params as { id: string }).id,
  );

  if (nextSubscriptions.length === store.subscriptions.length) {
    return reply.code(404).send({ error: "Subscription not found." });
  }

  store.subscriptions = nextSubscriptions;
  await saveStore(store);

  return reply.code(204).send();
});

app.get("/v1/opportunities", async (request, reply) => {
  const store = await loadStore();
  const context = await requireAuth(request, reply, store);

  if (!context) {
    return;
  }

  return {
    data: buildOpportunities(store.subscriptions, store.household.country),
  };
});

app.get("/v1/catalog/popular", async (request, reply) => {
  const store = await loadStore();
  const context = await requireAuth(request, reply, store);

  if (!context) {
    return;
  }

  const query = request.query as { country?: string };

  return {
    data: getPopularSubscriptions((query.country?.toUpperCase() as "ES" | "FR" | undefined) ?? store.household.country),
  };
});

app.get("/v1/banking/institutions", async (request, reply) => {
  const store = await loadStore();
  const context = await requireAuth(request, reply, store);

  if (!context) {
    return;
  }

  const query = request.query as { country?: string; q?: string };
  const country =
    (query.country?.toUpperCase() as "ES" | "FR" | undefined) ?? store.household.country;
  const institutions = await getBankingProvider().searchInstitutions(
    query.q?.trim() ?? "",
    country,
  );

  return {
    data: institutions,
    provider: getBankingProvider().provider,
  };
});

app.post("/v1/banking/connect", async (request, reply) => {
  const parsed = parseCreateBankConnection(request.body);
  if ("error" in parsed) {
    return reply.code(400).send({ error: parsed.error });
  }

  const store = await loadStore();
  const context = await requireAuth(request, reply, store);

  if (!context) {
    return;
  }

  const result = await getBankingProvider().createConnection(parsed.data);
  replaceConnection(store, result.connection);
  await saveStore(store);

  return reply.code(201).send({
    data: result.connection,
    redirectUrl: result.redirectUrl,
  });
});

app.post("/v1/banking/complete", async (request, reply) => {
  const parsed = parseCompleteBankConnection(request.body);
  if ("error" in parsed) {
    return reply.code(400).send({ error: parsed.error });
  }

  const store = await loadStore();
  const context = await requireAuth(request, reply, store);

  if (!context) {
    return;
  }

  const connection =
    store.bankConnections.find((item) => item.id === parsed.data.connectionId) ?? null;

  if (!connection) {
    return reply.code(404).send({ error: "Bank connection not found." });
  }

  try {
    const completed = await getBankingProvider().completeConnection(connection, parsed.data);
    applySyncedConnection(store, connection.id, completed);
    await saveStore(store);

    return {
      data: {
        connection: completed.connection,
        accountsImported: completed.accounts.length,
        transactionsImported: completed.transactions.length,
        recurringCandidates: store.recurringCandidates.length,
      },
    };
  } catch (error) {
    replaceConnection(store, {
      ...connection,
      status: "error",
      errorMessage:
        error instanceof Error
          ? error.message
          : "Unable to complete the bank connection.",
      lastSyncedAt: new Date().toISOString(),
    });
    await saveStore(store);

    return reply.code(400).send({
      error:
        error instanceof Error
          ? error.message
          : "Unable to complete the bank connection.",
    });
  }
});

app.get("/v1/banking/connections", async (request, reply) => {
  const store = await loadStore();
  const context = await requireAuth(request, reply, store);

  if (!context) {
    return;
  }

  return {
    data: store.bankConnections.map((connection) => ({
      ...connection,
      accountCount: store.bankAccounts.filter((account) => account.connectionId === connection.id)
        .length,
    })),
  };
});

app.get("/v1/banking/accounts", async (request, reply) => {
  const store = await loadStore();
  const context = await requireAuth(request, reply, store);

  if (!context) {
    return;
  }

  return {
    data: store.bankAccounts.map((account) => ({
      ...account,
      connection: store.bankConnections.find((connection) => connection.id === account.connectionId) ?? null,
    })),
  };
});

app.post("/v1/banking/sync", async (request, reply) => {
  const parsed = parseSyncBankConnection(request.body);
  if ("error" in parsed) {
    return reply.code(400).send({ error: parsed.error });
  }

  const store = await loadStore();
  const context = await requireAuth(request, reply, store);

  if (!context) {
    return;
  }

  const connection =
    store.bankConnections.find((item) => item.id === parsed.data.connectionId) ?? null;

  if (!connection) {
    return reply.code(404).send({ error: "Bank connection not found." });
  }

  try {
    const synced = await getBankingProvider().syncConnection(connection);
    applySyncedConnection(store, connection.id, synced);
    await saveStore(store);

    return {
      data: {
        connection: synced.connection,
        accountsImported: synced.accounts.length,
        transactionsImported: synced.transactions.length,
        recurringCandidates: store.recurringCandidates.length,
      },
    };
  } catch (error) {
    replaceConnection(store, {
      ...connection,
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unable to sync bank data.",
      lastSyncedAt: new Date().toISOString(),
    });
    await saveStore(store);

    return reply.code(400).send({
      error: error instanceof Error ? error.message : "Unable to sync bank data.",
    });
  }
});

app.delete("/v1/banking/connections/:id", async (request, reply) => {
  const parsed = parseDisconnectBankConnection({
    connectionId: (request.params as { id: string }).id,
  });
  if ("error" in parsed) {
    return reply.code(400).send({ error: parsed.error });
  }

  const store = await loadStore();
  const context = await requireAuth(request, reply, store);

  if (!context) {
    return;
  }

  const connection =
    store.bankConnections.find((item) => item.id === parsed.data.connectionId) ?? null;
  if (!connection) {
    return reply.code(404).send({ error: "Bank connection not found." });
  }

  const disconnected = await getBankingProvider().disconnectConnection(connection);
  removeConnectionData(store, connection.id);
  replaceConnection(store, disconnected);
  await saveStore(store);

  return reply.code(204).send();
});

app.get("/v1/recurring-candidates", async (request, reply) => {
  const store = await loadStore();
  const context = await requireAuth(request, reply, store);

  if (!context) {
    return;
  }

  return {
    data: store.recurringCandidates.sort((left, right) => right.confidence - left.confidence),
  };
});

app.post("/v1/recurring-candidates/:id/review", async (request, reply) => {
  const parsed = parseReviewRecurringCandidate(request.body);
  if ("error" in parsed) {
    return reply.code(400).send({ error: parsed.error });
  }

  const store = await loadStore();
  const context = await requireAuth(request, reply, store);

  if (!context) {
    return;
  }

  const result = reviewRecurringCandidate(
    store,
    (request.params as { id: string }).id,
    parsed.data,
    context.member.id,
  );

  if (!result) {
    return reply.code(404).send({ error: "Recurring candidate not found." });
  }

  await saveStore(store);

  return {
    data: result.candidate,
    subscription: result.subscription,
  };
});

const port = Number(process.env.PORT ?? 4000);

try {
  await app.listen({
    host: "0.0.0.0",
    port,
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
