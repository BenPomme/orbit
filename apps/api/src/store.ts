import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { Store, Subscription } from "./domain.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const storePath = path.resolve(currentDir, "../data/store.json");

const defaultStore = createDemoStore();

export function createDemoStore(): Store {
  const subscriptions: Subscription[] = [
    {
      id: "netflix-household",
      merchant: "Netflix",
      category: "Entertainment",
      amount: 17.99,
      currency: "EUR",
      cadence: "monthly",
      nextRenewal: "2026-03-11",
      owner: "shared",
      ownerLabel: "Household",
      status: "active",
      confidence: "confirmed",
    },
    {
      id: "spotify-family",
      merchant: "Spotify",
      category: "Entertainment",
      amount: 18.99,
      currency: "EUR",
      cadence: "monthly",
      nextRenewal: "2026-03-18",
      owner: "shared",
      ownerLabel: "Household",
      status: "active",
      confidence: "confirmed",
    },
    {
      id: "duolingo-max",
      merchant: "Duolingo",
      category: "Education",
      amount: 14.99,
      currency: "EUR",
      cadence: "monthly",
      nextRenewal: "2026-03-09",
      owner: "personal",
      ownerLabel: "Benjamin",
      status: "trial",
      confidence: "detected",
    },
    {
      id: "icloud-plus",
      merchant: "iCloud+",
      category: "Cloud",
      amount: 9.99,
      currency: "EUR",
      cadence: "monthly",
      nextRenewal: "2026-03-27",
      owner: "shared",
      ownerLabel: "Household",
      status: "active",
      confidence: "manual",
    },
  ];

  return {
    household: {
      id: "demo-household",
      name: "Pommeraud Household",
      country: "ES",
      locale: "es-ES",
      currency: "EUR",
      isSetupComplete: false,
      shareCode: "ORBIT-ES-01",
      members: [
        { id: "member-benjamin-1", name: "Benjamin", color: "#0f9d7a" },
        { id: "member-partner-2", name: "Partner", color: "#d97841" },
      ],
    },
    session: {
      activeMemberId: "member-benjamin-1",
    },
    users: [],
    memberships: [],
    authChallenges: [],
    authSessions: [],
    subscriptions,
    bankConnections: [],
    bankAccounts: [],
    bankTransactions: [],
    recurringCandidates: [],
    candidateReviews: [],
  };
}

export async function loadStore(): Promise<Store> {
  try {
    const raw = await readFile(storePath, "utf8");
    return normalizeStore(JSON.parse(raw) as Partial<Store>);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }

    const nextStore = createDemoStore();
    await saveStore(nextStore);
    return nextStore;
  }
}

export async function saveStore(store: Store): Promise<void> {
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function normalizeStore(candidate: Partial<Store>): Store {
  const household = candidate.household ?? defaultStore.household;
  const members =
    household.members?.length ?? 0
      ? household.members
      : defaultStore.household.members;
  const activeMemberId =
    candidate.session?.activeMemberId && members.some((member) => member.id === candidate.session?.activeMemberId)
      ? candidate.session.activeMemberId
      : members[0].id;

  return {
    household: {
      ...defaultStore.household,
      ...household,
      country: (household.country ?? defaultStore.household.country) as Store["household"]["country"],
      members,
    },
    session: {
      activeMemberId,
    },
    users: candidate.users ?? [],
    memberships: candidate.memberships ?? [],
    authChallenges: candidate.authChallenges ?? [],
    authSessions: candidate.authSessions ?? [],
    subscriptions: candidate.subscriptions ?? [],
    bankConnections: candidate.bankConnections ?? [],
    bankAccounts: candidate.bankAccounts ?? [],
    bankTransactions: candidate.bankTransactions ?? [],
    recurringCandidates: candidate.recurringCandidates ?? [],
    candidateReviews: candidate.candidateReviews ?? [],
  };
}
