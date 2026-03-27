import type { FastifyReply, FastifyRequest } from "fastify";

import type { AuthContext, AuthSession, HouseholdSummary, Store } from "./domain.js";
import { buildHouseholdSummary } from "./services.js";

export function getBearerToken(request: FastifyRequest) {
  const header = request.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length).trim();
}

export function resolveAuthSession(store: Store, token: string | null): AuthSession | null {
  if (!token) {
    return null;
  }

  return (
    store.authSessions.find(
      (session) =>
        session.token === token && Date.parse(session.expiresAt) > Date.now(),
    ) ?? null
  );
}

export function buildAuthContext(
  store: Store,
  authSession: AuthSession,
): AuthContext | null {
  const user = store.users.find((item) => item.id === authSession.userId) ?? null;
  const member =
    store.household.members.find((item) => item.id === authSession.memberId) ?? null;

  if (!user || !member) {
    return null;
  }

  const household = buildHouseholdSummary(store);
  const session = {
    activeMemberId: authSession.memberId,
  };

  return {
    token: authSession.token,
    user: {
      id: user.id,
      email: user.email,
    },
    member,
    session,
    household,
  };
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
  store: Store,
) {
  const token = getBearerToken(request);
  const authSession = resolveAuthSession(store, token);

  if (!authSession) {
    await reply.code(401).send({ error: "Authentication required." });
    return null;
  }

  const context = buildAuthContext(store, authSession);

  if (!context) {
    await reply.code(401).send({ error: "Session is invalid." });
    return null;
  }

  return context;
}

export function createAuthSessionPayload(
  token: string,
  household: HouseholdSummary,
  user: { id: string; email: string },
  member: { id: string; name: string; color: string },
) {
  return {
    token,
    household,
    user,
    member,
    session: {
      activeMemberId: member.id,
    },
  };
}
