import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_700Bold,
  useFonts,
} from "@expo-google-fonts/space-grotesk";
import {
  Image,
  Linking,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  completeBankConnection,
  createBankConnection,
  createSubscription,
  deleteSubscription,
  disconnectBankConnection,
  fetchDashboard,
  fetchAuthSession,
  fetchInstitutions,
  fetchPopularSubscriptions,
  getApiBaseUrl,
  requestMagicLink,
  resetDemoStore,
  reviewRecurringCandidate,
  setAuthToken,
  signOut,
  syncBankConnection,
  updateHousehold,
  updateSession,
  updateSubscription,
  verifyMagicLink,
} from "./src/api";
import {
  clearStoredToken,
  readStoredToken,
  writeStoredToken,
} from "./src/tokenStorage";
import type {
  AuthChallengeResponse,
  BankAccount,
  BankConnection,
  BankInstitution,
  Cadence,
  CompleteBankConnectionInput,
  CreateSubscriptionInput,
  CreateBankConnectionInput,
  HouseholdSummary,
  RecurringCandidate,
  RequestMagicLinkInput,
  ReviewRecurringCandidateInput,
  SessionState,
  Opportunity,
  PopularSubscriptionTemplate,
  Ownership,
  Subscription,
  UserSummary,
  UpdateHouseholdInput,
  UpdateSubscriptionInput,
  VerifyMagicLinkInput,
} from "./src/types";

type HouseholdDraft = {
  name: string;
  country: HouseholdSummary["country"];
  members: string[];
};

type SubscriptionDraft = {
  merchant: string;
  category: string;
  amount: string;
  cadence: Cadence;
  nextRenewal: string;
  owner: Ownership;
  ownerLabel: string;
};

type EditableSubscriptionDraft = SubscriptionDraft & {
  status: Subscription["status"];
};

type CategoryFamilyKey =
  | "tv_entertainment"
  | "phone_internet"
  | "banking"
  | "sports_gym"
  | "cloud_ai"
  | "gaming"
  | "news_learning"
  | "other";

type AuthDraft = {
  email: string;
  code: string;
  memberName: string;
  shareCode: string;
};

export default function App() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_700Bold,
  });
  const [household, setHousehold] = useState<HouseholdSummary | null>(null);
  const [authUser, setAuthUser] = useState<UserSummary | null>(null);
  const [session, setSession] = useState<SessionState | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [bankConnections, setBankConnections] = useState<BankConnection[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [institutions, setInstitutions] = useState<BankInstitution[]>([]);
  const [bankProvider, setBankProvider] = useState<BankConnection["provider"]>("unconfigured");
  const [recurringCandidates, setRecurringCandidates] = useState<RecurringCandidate[]>([]);
  const [popularSubscriptions, setPopularSubscriptions] = useState<
    PopularSubscriptionTemplate[]
  >([]);
  const [householdTemplates, setHouseholdTemplates] = useState<
    PopularSubscriptionTemplate[]
  >([]);
  const [householdDraft, setHouseholdDraft] = useState<HouseholdDraft>({
    name: "",
    country: "ES",
    members: ["", ""],
  });
  const [draft, setDraft] = useState<SubscriptionDraft>(createInitialDraft);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingHousehold, setSavingHousehold] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [syncingConnectionId, setSyncingConnectionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [catalogCountry, setCatalogCountry] = useState<HouseholdSummary["country"]>("ES");
  const [selectedCategoryFamily, setSelectedCategoryFamily] =
    useState<CategoryFamilyKey>("tv_entertainment");
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(
    null,
  );
  const [editDraft, setEditDraft] = useState<EditableSubscriptionDraft>(
    createInitialEditDraft,
  );
  const [showHouseholdSetup, setShowHouseholdSetup] = useState(false);
  const [skipCategoryFtue, setSkipCategoryFtue] = useState(false);
  const [authDraft, setAuthDraft] = useState<AuthDraft>({
    email: "",
    code: "",
    memberName: "",
    shareCode: "",
  });
  const [challenge, setChallenge] = useState<AuthChallengeResponse | null>(null);
  const [bankNotice, setBankNotice] = useState<string | null>(null);
  const devToolsEnabled = process.env.EXPO_PUBLIC_ENABLE_DEV_TOOLS === "true";
  const bankRedirectUrl = process.env.EXPO_PUBLIC_BANK_REDIRECT_URL?.trim() || undefined;

  async function loadDashboard(options?: { silent?: boolean }) {
    if (!options?.silent) {
      setLoading(true);
    }

    setError(null);

    try {
      const data = await fetchDashboard();
      setHousehold(data.household);
      setSession(data.session);
      setSubscriptions(data.subscriptions);
      setOpportunities(data.opportunities);
      setBankConnections(data.bankConnections);
      setBankAccounts(data.bankAccounts);
      setRecurringCandidates(data.recurringCandidates);
      setPopularSubscriptions(data.popularSubscriptions);
      setHouseholdTemplates(data.popularSubscriptions);
      setHouseholdDraft({
        name: data.household.name,
        country: data.household.country,
        members: ensureHouseholdDraftMembers(data.household.members.map((member) => member.name)),
      });
      setCatalogCountry(data.household.country);
      setSelectedCategoryFamily("tv_entertainment");
      setAuthDraft((current) => ({
        ...current,
        shareCode: current.shareCode || data.household.shareCode,
      }));
      try {
        const institutionsResponse = await fetchInstitutions(data.household.country);
        setInstitutions(institutionsResponse.data);
        setBankProvider(institutionsResponse.provider as BankConnection["provider"]);
      } catch {
        setInstitutions([]);
        setBankProvider("unconfigured");
      }
      setSelectedSubscriptionId((current) =>
        current && data.subscriptions.some((subscription) => subscription.id === current)
          ? current
          : null,
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load the dashboard.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void bootstrapAuth();
  }, []);

  useEffect(() => {
    function handleBankReturn(url: string) {
      if (!isBankCallbackUrl(url)) {
        return;
      }

      const consentError = readUrlParam(url, "error");
      const consentErrorDescription =
        readUrlParam(url, "error_description") ?? readUrlParam(url, "errorDescription");
      const callbackState = readUrlParam(url, "state") ?? undefined;
      const code = readUrlParam(url, "code") ?? undefined;

      const pendingConnection =
        bankConnections.find(
          (connection) =>
            connection.status === "pending" &&
            (!callbackState || connection.callbackState === callbackState),
        ) ??
        bankConnections.find((connection) => connection.status === "pending") ??
        null;

      if (authUser && pendingConnection) {
        void (async () => {
          try {
            setSyncingConnectionId(pendingConnection.id);
            setError(null);
            const result = await completeBankConnection({
              connectionId: pendingConnection.id,
              code,
              state: callbackState,
              error: consentError ?? undefined,
              errorDescription: consentErrorDescription ?? undefined,
            } satisfies CompleteBankConnectionInput);
            await loadDashboard({ silent: true });
            setBankNotice(
              `Bank connection completed for ${pendingConnection.institutionName}. Imported ${result.data.accountsImported} account(s), ${result.data.transactionsImported} transactions, and ${result.data.recurringCandidates} recurring candidates.`,
            );
          } catch (completionError) {
            setBankNotice(null);
            setError(
              completionError instanceof Error
                ? completionError.message
                : "Unable to complete bank consent.",
            );
          } finally {
            setSyncingConnectionId(null);
          }
        })();
        return;
      }

      if (consentError) {
        setBankNotice(null);
        setError(
          `Bank consent returned with an error: ${consentErrorDescription ?? consentError}.`,
        );
        return;
      }

      setError(null);
      setBankNotice(
        "Bank consent returned to the app. Open the pending bank connection and tap Refresh to import accounts and recurring candidates.",
      );
    }

    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleBankReturn(url);
    });

    void Linking.getInitialURL().then((url) => {
      if (url) {
        handleBankReturn(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [authUser, bankConnections]);

  const selectedSubscription =
    selectedSubscriptionId === null
      ? null
      : subscriptions.find((subscription) => subscription.id === selectedSubscriptionId) ??
        null;
  const activeMember =
    household && session
      ? household.members.find((member) => member.id === session.activeMemberId) ?? null
      : null;

  const currentScreen =
    !authReady
      ? "loading"
      : !authUser
        ? "auth"
        : household && !household.isSetupComplete
          ? "onboarding"
          : showHouseholdSetup
            ? "onboarding"
            : !skipCategoryFtue
              ? "category-ftue"
            : selectedSubscription
              ? "subscription"
              : "dashboard";

  async function handleCreateSubscription() {
    if (!draft.merchant || !draft.category || !draft.amount || !draft.nextRenewal) {
      setError("Merchant, category, amount, and renewal date are required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        merchant: draft.merchant.trim(),
        category: draft.category.trim(),
        amount: Number.parseFloat(draft.amount),
        cadence: draft.cadence,
        nextRenewal: draft.nextRenewal.trim(),
        owner: draft.owner,
        ownerLabel: draft.ownerLabel.trim() || "Household",
      } satisfies CreateSubscriptionInput;
      const matchingSubscription = findMatchingSubscription(
        subscriptions,
        payload.merchant,
        payload.owner,
        payload.ownerLabel,
      );

      if (matchingSubscription) {
        await updateSubscription(matchingSubscription.id, {
          ...payload,
          status: "active",
        } satisfies UpdateSubscriptionInput);
      } else {
        await createSubscription(payload);
      }

      setDraft(createInitialDraft());
      await loadDashboard({ silent: true });
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save subscription.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function bootstrapAuth() {
    try {
      const token = await readStoredToken();

      if (!token) {
        setAuthReady(true);
        return;
      }

      setAuthToken(token);
      const authSession = await fetchAuthSession();
      setAuthUser(authSession.user);
      setSession(authSession.session);
      setHousehold(authSession.household);
      await loadDashboard({ silent: true });
    } catch {
      setAuthToken(null);
      await clearStoredToken();
    } finally {
      setAuthReady(true);
    }
  }

  async function handleRequestMagicLink() {
    if (!authDraft.email.trim()) {
      setError("Email is required.");
      return;
    }

    setAuthenticating(true);
    setError(null);

    try {
      const nextChallenge = await requestMagicLink({
        email: authDraft.email.trim(),
      } satisfies RequestMagicLinkInput);
      setChallenge(nextChallenge);
      setAuthDraft((current) => ({ ...current, code: nextChallenge.devCode }));
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Unable to request code.");
    } finally {
      setAuthenticating(false);
    }
  }

  async function handleVerifyMagicLink() {
    if (!challenge) {
      setError("Request a verification code first.");
      return;
    }

    if (!authDraft.code.trim() || !authDraft.memberName.trim()) {
      setError("Verification code and member name are required.");
      return;
    }

    setAuthenticating(true);
    setError(null);

    try {
      const authSession = await verifyMagicLink({
        challengeId: challenge.challengeId,
        code: authDraft.code.trim(),
        memberName: authDraft.memberName.trim(),
        shareCode: authDraft.shareCode.trim() || undefined,
      } satisfies VerifyMagicLinkInput);
      await writeStoredToken(authSession.token);
      setAuthToken(authSession.token);
      setAuthUser(authSession.user);
      setSession(authSession.session);
      setHousehold(authSession.household);
      setChallenge(null);
      await loadDashboard({ silent: true });
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Unable to verify code.");
    } finally {
      setAuthenticating(false);
    }
  }

  async function handleQuickDemoSignIn() {
    setAuthenticating(true);
    setError(null);

    try {
      await resetDemoStore();
      const nextChallenge = await requestMagicLink({
        email: "demo@orbit.household",
      } satisfies RequestMagicLinkInput);
      const authSession = await verifyMagicLink({
        challengeId: nextChallenge.challengeId,
        code: nextChallenge.devCode,
        memberName: "Benjamin",
        shareCode: "ORBIT-ES-01",
      } satisfies VerifyMagicLinkInput);
      await writeStoredToken(authSession.token);
      setAuthToken(authSession.token);
      setAuthUser(authSession.user);
      setSession(authSession.session);
      setHousehold(authSession.household);
      setChallenge(null);
      setAuthDraft({
        email: authSession.user.email,
        code: nextChallenge.devCode,
        memberName: "Benjamin",
        shareCode: "ORBIT-ES-01",
      });
      await loadDashboard({ silent: true });
    } catch (authError) {
      setError(
        authError instanceof Error ? authError.message : "Unable to start the demo session.",
      );
    } finally {
      setAuthenticating(false);
    }
  }

  async function handleSignOut() {
    await signOut().catch(() => undefined);
    await clearStoredToken();
    setAuthToken(null);
    setAuthUser(null);
    setSession(null);
    setHousehold(null);
    setSubscriptions([]);
    setOpportunities([]);
    setBankConnections([]);
    setBankAccounts([]);
    setRecurringCandidates([]);
    setChallenge(null);
    setSkipCategoryFtue(false);
    setSelectedCategoryFamily("tv_entertainment");
    setAuthDraft({
      email: "",
      code: "",
      memberName: "",
      shareCode: "",
    });
  }

  async function handleResetDemoData() {
    setAuthenticating(true);
    setError(null);

    try {
      await resetDemoStore();
      await clearStoredToken();
      setAuthToken(null);
      const nextChallenge = await requestMagicLink({
        email: authUser?.email ?? "demo@orbit.household",
      } satisfies RequestMagicLinkInput);
      const authSession = await verifyMagicLink({
        challengeId: nextChallenge.challengeId,
        code: nextChallenge.devCode,
        memberName: activeMember?.name ?? household?.members[0]?.name ?? "Benjamin",
        shareCode: "ORBIT-ES-01",
      } satisfies VerifyMagicLinkInput);
      await writeStoredToken(authSession.token);
      setAuthToken(authSession.token);
      setAuthUser(authSession.user);
      setSession(authSession.session);
      setHousehold(authSession.household);
      setSelectedSubscriptionId(null);
      setShowHouseholdSetup(false);
      setSkipCategoryFtue(false);
      setSelectedCategoryFamily("tv_entertainment");
      await loadDashboard({ silent: true });
    } catch (resetError) {
      setError(
        resetError instanceof Error ? resetError.message : "Unable to reset the demo household.",
      );
    } finally {
      setAuthenticating(false);
    }
  }

  async function handleSaveHousehold() {
    if (!householdDraft.name.trim()) {
      setError("Household name is required.");
      return;
    }

    const memberNames = householdDraft.members.map((member) => member.trim()).filter(Boolean);
    if (memberNames.length === 0) {
      setError("Add at least one household member.");
      return;
    }

    setSavingHousehold(true);
    setError(null);

    try {
      await updateHousehold({
        name: householdDraft.name.trim(),
        country: householdDraft.country,
        members: memberNames,
      } satisfies UpdateHouseholdInput);
      setSkipCategoryFtue(false);
      setSelectedCategoryFamily("tv_entertainment");
      await loadDashboard({ silent: true });
      setShowHouseholdSetup(false);
    } catch (householdError) {
      setError(
        householdError instanceof Error
          ? householdError.message
          : "Unable to save household details.",
      );
    } finally {
      setSavingHousehold(false);
    }
  }

  async function handleUpdateSubscription(id: string, patch: UpdateSubscriptionInput) {
    try {
      await updateSubscription(id, patch);
      await loadDashboard({ silent: true });
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update subscription.",
      );
    }
  }

  async function handleSwitchMember(activeMemberId: string) {
    try {
      const nextSession = await updateSession(activeMemberId);
      setSession(nextSession);
    } catch (sessionError) {
      setError(
        sessionError instanceof Error
          ? sessionError.message
          : "Unable to switch household member.",
      );
    }
  }

  async function handleDeleteSubscription(id: string) {
    try {
      await deleteSubscription(id);
      setSelectedSubscriptionId(null);
      setEditDraft(createInitialEditDraft());
      await loadDashboard({ silent: true });
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete subscription.",
      );
    }
  }

  async function handleConnectInstitution(institution: BankInstitution) {
    if (!household) {
      return;
    }

    if (!bankRedirectUrl) {
      setError(
        "Bank redirect URL is not configured on the client. Set EXPO_PUBLIC_BANK_REDIRECT_URL before connecting a real bank.",
      );
      return;
    }

    setError(null);
    setBankNotice(null);

    try {
      const result = await createBankConnection({
        institutionId: institution.id,
        institutionName: institution.name,
        country: household.country,
        redirectUrl: bankRedirectUrl,
      } satisfies CreateBankConnectionInput);

      setBankConnections((current) => [
        result.data,
        ...current.filter((item) => item.id !== result.data.id),
      ]);

      if (result.redirectUrl) {
        try {
          await Linking.openURL(result.redirectUrl);
        } catch {
          setError(
            `Open the bank consent in your browser, then come back and refresh ${institution.name}.`,
          );
        }
      }
    } catch (bankError) {
      setError(
        bankError instanceof Error
          ? bankError.message
          : "Unable to create the bank connection.",
      );
    }
  }

  async function handleSyncConnection(connectionId: string) {
    setSyncingConnectionId(connectionId);
    setError(null);

    try {
      await syncBankConnection(connectionId);
      await loadDashboard({ silent: true });
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Unable to sync bank data.");
    } finally {
      setSyncingConnectionId(null);
    }
  }

  async function handleOpenConnectionLink(connection: BankConnection) {
    if (!connection.linkUrl) {
      setError("This bank connection does not have a consent URL.");
      return;
    }

    try {
      await Linking.openURL(connection.linkUrl);
    } catch {
      setError("Unable to open the bank consent link on this device.");
    }
  }

  async function handleDisconnectConnection(connectionId: string) {
    setError(null);
    setSyncingConnectionId(connectionId);

    try {
      await disconnectBankConnection(connectionId);
      await loadDashboard({ silent: true });
      setBankNotice("Bank connection removed from this household.");
    } catch (disconnectError) {
      setError(
        disconnectError instanceof Error
          ? disconnectError.message
          : "Unable to disconnect the bank connection.",
      );
    } finally {
      setSyncingConnectionId(null);
    }
  }

  async function handleQuickMockSync() {
    if (!household || institutions.length === 0) {
      setError("No test institution is available for this household.");
      return;
    }

    setSyncingConnectionId("demo-sync");
    setError(null);

    try {
      const preferredInstitution =
        institutions.find((institution) =>
          bankConnections.some((connection) => connection.institutionId === institution.id),
        ) ?? institutions[0];
      const existingConnection =
        bankConnections.find(
          (connection) => connection.institutionId === preferredInstitution.id,
        ) ?? null;

      const connectionId =
        existingConnection?.id ??
        (
          await createBankConnection({
            institutionId: preferredInstitution.id,
            country: household.country,
          } satisfies CreateBankConnectionInput)
        ).data.id;

      await syncBankConnection(connectionId);
      await loadDashboard({ silent: true });
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Unable to load demo bank data.");
    } finally {
      setSyncingConnectionId(null);
    }
  }

  async function handleReviewCandidate(
    candidateId: string,
    input: ReviewRecurringCandidateInput,
  ) {
    setError(null);

    try {
      await reviewRecurringCandidate(candidateId, input);
      await loadDashboard({ silent: true });
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "Unable to review recurring candidate.",
      );
    }
  }

  async function handleSaveSubscriptionEdit() {
    if (!selectedSubscriptionId) {
      return;
    }

    if (
      !editDraft.merchant ||
      !editDraft.category ||
      !editDraft.amount ||
      !editDraft.nextRenewal
    ) {
      setError("Merchant, category, amount, and renewal date are required.");
      return;
    }

    setSavingEdit(true);
    setError(null);

    try {
      await updateSubscription(selectedSubscriptionId, {
        merchant: editDraft.merchant.trim(),
        category: editDraft.category.trim(),
        amount: Number.parseFloat(editDraft.amount),
        cadence: editDraft.cadence,
        nextRenewal: editDraft.nextRenewal.trim(),
        owner: editDraft.owner,
        ownerLabel: editDraft.ownerLabel.trim() || "Household",
        status: editDraft.status,
      } satisfies UpdateSubscriptionInput);
      await loadDashboard({ silent: true });
    } catch (editError) {
      setError(
        editError instanceof Error ? editError.message : "Unable to save changes.",
      );
    } finally {
      setSavingEdit(false);
    }
  }

  function applyTemplate(template: PopularSubscriptionTemplate) {
    setDraft((current) => ({
      ...current,
      merchant: template.merchant,
      category: template.category,
      amount:
        template.defaultAmount === null
          ? current.amount
          : template.defaultAmount.toFixed(2),
      cadence: template.cadence,
      owner: template.defaultOwner,
      ownerLabel:
        template.defaultOwner === "personal"
          ? activeMember?.name ?? household?.members[0]?.name ?? current.ownerLabel
          : template.ownerLabel,
    }));
  }

  async function handleCatalogCountryChange(country: HouseholdSummary["country"]) {
    setCatalogCountry(country);

    try {
      const nextPopularSubscriptions = await fetchPopularSubscriptions(country);
      setPopularSubscriptions(nextPopularSubscriptions);
    } catch (catalogError) {
      setError(
        catalogError instanceof Error
          ? catalogError.message
          : "Unable to load popular subscriptions.",
      );
    }
  }

  function openSubscriptionDetail(subscription: Subscription) {
    setSelectedSubscriptionId(subscription.id);
    setEditDraft({
      merchant: subscription.merchant,
      category: subscription.category,
      amount: subscription.amount.toFixed(2),
      cadence: subscription.cadence,
      nextRenewal: subscription.nextRenewal,
      owner: subscription.owner,
      ownerLabel: subscription.ownerLabel,
      status: subscription.status,
    });
  }

  async function handleCancelSelectedSubscription() {
    if (!selectedSubscriptionId) {
      return;
    }

    await handleUpdateSubscription(selectedSubscriptionId, {
      status: "cancelled",
    });
    setSelectedSubscriptionId(null);
  }

  async function handleRestoreSelectedSubscription() {
    if (!selectedSubscriptionId) {
      return;
    }

    await handleUpdateSubscription(selectedSubscriptionId, {
      status: "active",
    });
    setSelectedSubscriptionId(null);
  }

  if (!fontsLoaded) {
    return null;
  }

  const activeSubscriptions = subscriptions.filter(
    (subscription) => subscription.status !== "cancelled",
  );
  const cancelledSubscriptions = subscriptions.filter(
    (subscription) => subscription.status === "cancelled",
  );
  const renewalSubscriptions = activeSubscriptions.slice(0, 3);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      {currentScreen === "loading" ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <LinearGradient colors={["#fffaf2", "#dff5ea"]} style={styles.hero}>
            <View style={styles.heroHeader}>
              <Text style={styles.eyebrow}>Orbit Household</Text>
              <Text style={styles.headline}>Connecting the household.</Text>
              <Text style={styles.subhead}>
                Restoring the saved session, market context, and recurring spend state.
              </Text>
            </View>
          </LinearGradient>
        </ScrollView>
      ) : currentScreen === "auth" ? (
        <AuthScreen
          apiBaseUrl={getApiBaseUrl()}
          authenticating={authenticating}
          challenge={challenge}
          devToolsEnabled={devToolsEnabled}
          draft={authDraft}
          error={error}
          onChangeDraft={setAuthDraft}
          onQuickDemoSignIn={() => void handleQuickDemoSignIn()}
          onRequestCode={() => void handleRequestMagicLink()}
          onVerify={() => void handleVerifyMagicLink()}
        />
      ) : currentScreen === "onboarding" ? (
        <OnboardingScreen
          apiBaseUrl={getApiBaseUrl()}
          draft={householdDraft}
          error={error}
          onChangeDraft={setHouseholdDraft}
          onContinue={() => void handleSaveHousehold()}
          saving={savingHousehold}
        />
      ) : currentScreen === "category-ftue" && household ? (
        <CategoryFtueScreen
          activeMember={activeMember}
          categoryFamily={selectedCategoryFamily}
          draft={draft}
          error={error}
          household={household}
          onApplyTemplate={applyTemplate}
          onCategorySelect={setSelectedCategoryFamily}
          onChangeDraft={setDraft}
          onContinueToDashboard={() => setSkipCategoryFtue(true)}
          onSaveSubscription={() => void handleCreateSubscription()}
          popularSubscriptions={popularSubscriptions}
          saving={saving}
          templates={getTemplatesForCategoryFamily(popularSubscriptions, selectedCategoryFamily)}
        />
      ) : currentScreen === "subscription" && household && selectedSubscription ? (
        <SubscriptionDetailScreen
          draft={editDraft}
          error={error}
          household={household}
          matchedTemplate={findTemplateForMerchant(
            householdTemplates,
            selectedSubscription.merchant,
          )}
          onBack={() => setSelectedSubscriptionId(null)}
          onCancel={() => void handleCancelSelectedSubscription()}
          onDelete={() => void handleDeleteSubscription(selectedSubscription.id)}
          onRestore={() => void handleRestoreSelectedSubscription()}
          onSave={() => void handleSaveSubscriptionEdit()}
          onSelectStatus={(status) =>
            setEditDraft((current) => ({ ...current, status }))
          }
          onChangeDraft={setEditDraft}
          saving={savingEdit}
          subscription={selectedSubscription}
        />
      ) : (
        <DashboardScreen
          activeMember={activeMember}
          activeSubscriptions={activeSubscriptions}
          bankAccounts={bankAccounts}
          cancelledSubscriptions={cancelledSubscriptions}
          catalogCountry={catalogCountry}
          categoryFamily={selectedCategoryFamily}
          draft={draft}
          error={error}
          bankNotice={bankNotice}
          household={household}
          householdTemplates={householdTemplates}
          institutions={institutions}
          bankConnections={bankConnections}
          bankProvider={bankProvider}
          loading={loading}
          onAddSubscription={() => void handleCreateSubscription()}
          onChangeCatalogCountry={(country) => void handleCatalogCountryChange(country)}
          onChangeCategoryFamily={setSelectedCategoryFamily}
          onChangeDraft={setDraft}
          onConnectInstitution={(institution) => void handleConnectInstitution(institution)}
          onEditHousehold={() => setShowHouseholdSetup(true)}
          onDisconnectConnection={(connectionId) => void handleDisconnectConnection(connectionId)}
          onOpenSubscription={openSubscriptionDetail}
          onOpenConnectionLink={(connection) => void handleOpenConnectionLink(connection)}
          onRefresh={() => {
            setRefreshing(true);
            void loadDashboard({ silent: true });
          }}
          onResetDemoData={devToolsEnabled ? () => void handleResetDemoData() : undefined}
          onReviewCandidate={(candidateId, input) =>
            void handleReviewCandidate(candidateId, input)
          }
          onSignOut={() => void handleSignOut()}
          onQuickMockSync={devToolsEnabled ? () => void handleQuickMockSync() : undefined}
          onSyncConnection={(connectionId) => void handleSyncConnection(connectionId)}
          onSwitchMember={(memberId) => void handleSwitchMember(memberId)}
          opportunities={opportunities}
          popularSubscriptions={popularSubscriptions}
          refreshing={refreshing}
          recurringCandidates={recurringCandidates}
          renewalSubscriptions={renewalSubscriptions}
          saving={saving}
          syncingConnectionId={syncingConnectionId}
          user={authUser}
          onApplyTemplate={applyTemplate}
        />
      )}
    </SafeAreaView>
  );
}

function AuthScreen({
  apiBaseUrl,
  authenticating,
  challenge,
  devToolsEnabled,
  draft,
  error,
  onChangeDraft,
  onQuickDemoSignIn,
  onRequestCode,
  onVerify,
}: {
  apiBaseUrl: string;
  authenticating: boolean;
  challenge: AuthChallengeResponse | null;
  devToolsEnabled: boolean;
  draft: AuthDraft;
  error: string | null;
  onChangeDraft: Dispatch<SetStateAction<AuthDraft>>;
  onQuickDemoSignIn: () => void;
  onRequestCode: () => void;
  onVerify: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <LinearGradient colors={["#fffaf2", "#dff5ea"]} style={styles.hero}>
        <View style={styles.heroHeader}>
          <Text style={styles.eyebrow}>Orbit Household</Text>
          <Text style={styles.headline}>Sign in to the household.</Text>
          <Text style={styles.subhead}>
            Start with email magic link auth, then connect the bank account only when the
            household is ready to review detected subscriptions.
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.connectionCard}>
        <Text style={styles.connectionLabel}>API base URL</Text>
        <Text style={styles.connectionValue}>{apiBaseUrl}</Text>
        <Text style={styles.connectionHint}>
          Dev mode exposes the verification code in-app so the full auth flow is testable
          without external email infrastructure.
        </Text>
      </View>

      <SectionHeader title="Member sign-in" action={challenge ? "Verify code" : "Request code"} />
      <View style={styles.formCard}>
        <TextInput
          testID="auth-email-input"
          value={draft.email}
          onChangeText={(email) => onChangeDraft((current) => ({ ...current, email }))}
          placeholder="Email address"
          placeholderTextColor="#8a938d"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          testID="auth-member-input"
          value={draft.memberName}
          onChangeText={(memberName) =>
            onChangeDraft((current) => ({ ...current, memberName }))
          }
          placeholder="Your household member name"
          placeholderTextColor="#8a938d"
          style={styles.input}
        />
        <TextInput
          testID="auth-sharecode-input"
          value={draft.shareCode}
          onChangeText={(shareCode) =>
            onChangeDraft((current) => ({ ...current, shareCode }))
          }
          placeholder="Household share code (optional)"
          placeholderTextColor="#8a938d"
          autoCapitalize="characters"
          style={styles.input}
        />
        {challenge ? (
          <>
            <View style={styles.emptyStateCard}>
              <Text style={styles.emptyStateTitle}>Dev verification code</Text>
              <Text style={styles.emptyStateBody}>
                Use {challenge.devCode} before {challenge.expiresAt.slice(11, 16)}.
              </Text>
            </View>
            <TextInput
              testID="auth-code-input"
              value={draft.code}
              onChangeText={(code) => onChangeDraft((current) => ({ ...current, code }))}
              placeholder="Verification code"
              placeholderTextColor="#8a938d"
              keyboardType="number-pad"
              style={styles.input}
            />
            <Pressable
              testID="auth-verify-button"
              onPress={onVerify}
              disabled={authenticating}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed ? styles.primaryButtonPressed : null,
                authenticating ? styles.primaryButtonDisabled : null,
              ]}
            >
              <Text style={styles.primaryButtonLabel}>
                {authenticating ? "Verifying..." : "Continue into the household"}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              testID="auth-request-button"
              onPress={onRequestCode}
              disabled={authenticating}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed ? styles.primaryButtonPressed : null,
                authenticating ? styles.primaryButtonDisabled : null,
              ]}
            >
              <Text style={styles.primaryButtonLabel}>
                {authenticating ? "Requesting..." : "Send magic link"}
              </Text>
            </Pressable>
            {devToolsEnabled ? (
              <Pressable
                testID="auth-demo-button"
                onPress={onQuickDemoSignIn}
                disabled={authenticating}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed ? styles.secondaryButtonPressed : null,
                  authenticating ? styles.primaryButtonDisabled : null,
                ]}
              >
                <Text style={styles.secondaryButtonLabel}>Quick demo sign-in</Text>
              </Pressable>
            ) : null}
          </>
        )}
      </View>

      <View style={styles.emptyStateCard}>
        <Text style={styles.emptyStateTitle}>Why auth comes first</Text>
        <Text style={styles.emptyStateBody}>
          Bank connections, recurring candidates, and review decisions need a real member
          identity so both adults can operate inside the same household safely.
        </Text>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Unable to sign in</Text>
          <Text style={styles.errorBody}>{error}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function OnboardingScreen({
  apiBaseUrl,
  draft,
  error,
  onChangeDraft,
  onContinue,
  saving,
}: {
  apiBaseUrl: string;
  draft: HouseholdDraft;
  error: string | null;
  onChangeDraft: Dispatch<SetStateAction<HouseholdDraft>>;
  onContinue: () => void;
  saving: boolean;
}) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <LinearGradient colors={["#fffaf2", "#dff5ea"]} style={styles.hero}>
        <View style={styles.heroHeader}>
          <Text style={styles.eyebrow}>Orbit Household</Text>
          <Text style={styles.headline}>Set up the household first.</Text>
          <Text style={styles.subhead}>
            Choose the market, name the household, and unlock a country-specific
            subscription catalog before you start tracking recurring spend.
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.connectionCard}>
        <Text style={styles.connectionLabel}>API base URL</Text>
        <Text style={styles.connectionValue}>{apiBaseUrl}</Text>
        <Text style={styles.connectionHint}>
          This setup step persists market context and drives the popular services list.
        </Text>
      </View>

      <SectionHeader title="Household setup" action="Required" />
      <View style={styles.formCard}>
        <TextInput
          value={draft.name}
          onChangeText={(name) => onChangeDraft((current) => ({ ...current, name }))}
          placeholder="Household name"
          placeholderTextColor="#8a938d"
          style={styles.input}
        />
        <View style={styles.formSection}>
          <Text style={styles.formSectionLabel}>Country</Text>
          <View style={styles.chipRow}>
            {(["ES", "FR"] as HouseholdSummary["country"][]).map((country) => (
              <ChoiceChip
                key={country}
                label={country}
                selected={draft.country === country}
                onPress={() => onChangeDraft((current) => ({ ...current, country }))}
              />
            ))}
          </View>
        </View>
        <View style={styles.formSection}>
          <Text style={styles.formSectionLabel}>Household members</Text>
          <TextInput
            value={draft.members[0]}
            onChangeText={(member) =>
              onChangeDraft((current) => ({
                ...current,
                members: [member, current.members[1] ?? ""],
              }))
            }
            placeholder="Primary adult"
            placeholderTextColor="#8a938d"
            style={styles.input}
          />
          <TextInput
            value={draft.members[1]}
            onChangeText={(member) =>
              onChangeDraft((current) => ({
                ...current,
                members: [current.members[0] ?? "", member],
              }))
            }
            placeholder="Partner / second adult"
            placeholderTextColor="#8a938d"
            style={styles.input}
          />
          <Text style={styles.formHintMuted}>
            Start with one or two adults now. Shared login and invitations can build on
            this household structure later.
          </Text>
        </View>
        <Pressable
          onPress={onContinue}
          disabled={saving}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed ? styles.primaryButtonPressed : null,
            saving ? styles.primaryButtonDisabled : null,
          ]}
        >
          <Text style={styles.primaryButtonLabel}>
            {saving ? "Saving household..." : "Continue to dashboard"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.emptyStateCard}>
        <Text style={styles.emptyStateTitle}>What this unlocks</Text>
        <Text style={styles.emptyStateBody}>
          A market-aware subscription catalog, faster manual entry, and a clean path to
          a testable iOS vertical slice.
        </Text>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Unable to continue</Text>
          <Text style={styles.errorBody}>{error}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function CategoryFtueScreen({
  activeMember,
  categoryFamily,
  draft,
  error,
  household,
  onApplyTemplate,
  onCategorySelect,
  onChangeDraft,
  onContinueToDashboard,
  onSaveSubscription,
  popularSubscriptions,
  saving,
  templates,
}: {
  activeMember: HouseholdSummary["members"][number] | null;
  categoryFamily: CategoryFamilyKey;
  draft: SubscriptionDraft;
  error: string | null;
  household: HouseholdSummary;
  onApplyTemplate: (template: PopularSubscriptionTemplate) => void;
  onCategorySelect: (category: CategoryFamilyKey) => void;
  onChangeDraft: Dispatch<SetStateAction<SubscriptionDraft>>;
  onContinueToDashboard: () => void;
  onSaveSubscription: () => void;
  popularSubscriptions: PopularSubscriptionTemplate[];
  saving: boolean;
  templates: PopularSubscriptionTemplate[];
}) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <LinearGradient colors={["#fffaf2", "#dff5ea"]} style={styles.hero}>
        <View style={styles.heroHeader}>
          <Text style={styles.eyebrow}>Orbit Household</Text>
          <Text style={styles.headline}>Add the subscriptions you already know.</Text>
          <Text style={styles.subhead}>
            Step 2 of 2. Start with categories, pick the most common services in {household.country},
            and adjust the date and amount before anything hits the dashboard.
          </Text>
        </View>
      </LinearGradient>

      <SectionHeader title="Categories" action="Step 2 of 2" />
      <View style={styles.categoryGrid}>
        {CATEGORY_FAMILIES.map((category) => {
          const summary = summarizeCategoryTemplates(
            getTemplatesForCategoryFamily(popularSubscriptions, category.id),
          );

          return (
            <Pressable
              key={category.id}
              onPress={() => onCategorySelect(category.id)}
              style={({ pressed }) => [
                styles.categoryCard,
                categoryFamily === category.id ? styles.categoryCardSelected : null,
                pressed ? styles.categoryCardPressed : null,
              ]}
            >
              <Text style={styles.categoryEmoji}>{category.emoji}</Text>
              <Text style={styles.categoryTitle}>{category.title}</Text>
              <Text style={styles.categoryBody}>{category.description}</Text>
              <Text style={styles.categoryMeta}>
                {summary.count > 0
                  ? `${summary.count} popular picks${summary.rangeLabel ? ` · ${summary.rangeLabel}` : ""}`
                  : "Custom only"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SectionHeader
        title={CATEGORY_FAMILIES.find((category) => category.id === categoryFamily)?.title ?? "Templates"}
        action={`${templates.length} popular picks`}
      />
      <View style={styles.suggestionList}>
        {templates.length > 0 ? (
          templates.map((template) => (
            <Pressable
              key={template.id}
              onPress={() => onApplyTemplate(template)}
              style={({ pressed }) => [
                styles.suggestionRow,
                pressed ? styles.suggestionRowPressed : null,
              ]}
            >
              <LogoBadge
                merchant={template.merchant}
                logoUrl={template.logoUrl}
                brandColor={template.brandColor}
              />
              <View style={styles.suggestionContent}>
                <Text style={styles.suggestionTitle}>{template.merchant}</Text>
                <Text style={styles.suggestionSubtitle}>
                  {template.category} · {template.priceHint}
                </Text>
              </View>
              <Text style={styles.suggestionAction}>Use</Text>
            </Pressable>
          ))
        ) : (
          <EmptyState
            title="No preset picks in this category yet"
            body="Use the quick form below to add a custom recurring payment anyway."
          />
        )}
      </View>

      <SectionHeader title="Quick setup" action="Editable" />
      <View style={styles.formCard}>
        <Text style={styles.formHint}>
          Choose a template, then confirm the exact amount and the day it comes out of the account.
        </Text>
        <TextInput
          value={draft.merchant}
          onChangeText={(merchant) => onChangeDraft((current) => ({ ...current, merchant }))}
          placeholder="Merchant"
          placeholderTextColor="#8a938d"
          style={styles.input}
        />
        <TextInput
          value={draft.category}
          onChangeText={(category) => onChangeDraft((current) => ({ ...current, category }))}
          placeholder="Category"
          placeholderTextColor="#8a938d"
          style={styles.input}
        />
        <View style={styles.twoColumnRow}>
          <TextInput
            value={draft.amount}
            onChangeText={(amount) => onChangeDraft((current) => ({ ...current, amount }))}
            placeholder="Amount"
            placeholderTextColor="#8a938d"
            keyboardType="decimal-pad"
            style={[styles.input, styles.halfInput]}
          />
          <TextInput
            value={draft.nextRenewal}
            onChangeText={(nextRenewal) =>
              onChangeDraft((current) => ({ ...current, nextRenewal }))
            }
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#8a938d"
            style={[styles.input, styles.halfInput]}
          />
        </View>
        <View style={styles.formSection}>
          <Text style={styles.formSectionLabel}>Owner</Text>
          <View style={styles.chipRow}>
            <ChoiceChip
              label="Shared"
              selected={draft.owner === "shared"}
              onPress={() =>
                onChangeDraft((current) => ({
                  ...current,
                  owner: "shared",
                  ownerLabel: "Household",
                }))
              }
            />
            <ChoiceChip
              label="Personal"
              selected={draft.owner === "personal"}
              onPress={() =>
                onChangeDraft((current) => ({
                  ...current,
                  owner: "personal",
                  ownerLabel: activeMember?.name ?? household.members[0]?.name ?? "Member",
                }))
              }
            />
          </View>
        </View>
        {draft.owner === "personal" ? (
          <View style={styles.memberChipRow}>
            {household.members.map((member) => (
              <ChoiceChip
                key={member.id}
                label={member.name}
                selected={draft.ownerLabel === member.name}
                onPress={() =>
                  onChangeDraft((current) => ({ ...current, ownerLabel: member.name }))
                }
              />
            ))}
          </View>
        ) : null}
        <View style={styles.actionRow}>
          <Pressable
            onPress={onSaveSubscription}
            disabled={saving}
            style={({ pressed }) => [
              styles.primaryButton,
              styles.inlineActionButton,
              pressed ? styles.primaryButtonPressed : null,
              saving ? styles.primaryButtonDisabled : null,
            ]}
          >
            <Text style={styles.primaryButtonLabel}>
              {saving ? "Saving..." : "Save subscription"}
            </Text>
          </Pressable>
          <Pressable
            onPress={onContinueToDashboard}
            style={({ pressed }) => [
              styles.secondaryButton,
              styles.inlineActionButton,
              pressed ? styles.secondaryButtonPressed : null,
            ]}
          >
            <Text style={styles.secondaryButtonLabel}>Continue to dashboard</Text>
          </Pressable>
        </View>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Unable to continue</Text>
          <Text style={styles.errorBody}>{error}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function DashboardScreen({
  activeMember,
  activeSubscriptions,
  bankAccounts,
  bankConnections,
  bankProvider,
  cancelledSubscriptions,
  catalogCountry,
  categoryFamily,
  draft,
  error,
  bankNotice,
  household,
  householdTemplates,
  institutions,
  loading,
  onAddSubscription,
  onApplyTemplate,
  onChangeCatalogCountry,
  onChangeCategoryFamily,
  onChangeDraft,
  onConnectInstitution,
  onDisconnectConnection,
  onEditHousehold,
  onOpenConnectionLink,
  onOpenSubscription,
  onRefresh,
  onResetDemoData,
  onReviewCandidate,
  onSignOut,
  onQuickMockSync,
  onSyncConnection,
  onSwitchMember,
  opportunities,
  popularSubscriptions,
  refreshing,
  recurringCandidates,
  renewalSubscriptions,
  saving,
  syncingConnectionId,
  user,
}: {
  activeMember: HouseholdSummary["members"][number] | null;
  activeSubscriptions: Subscription[];
  bankAccounts: BankAccount[];
  bankConnections: BankConnection[];
  bankProvider: BankConnection["provider"];
  cancelledSubscriptions: Subscription[];
  catalogCountry: HouseholdSummary["country"];
  categoryFamily: CategoryFamilyKey;
  draft: SubscriptionDraft;
  error: string | null;
  bankNotice: string | null;
  household: HouseholdSummary | null;
  householdTemplates: PopularSubscriptionTemplate[];
  institutions: BankInstitution[];
  loading: boolean;
  onAddSubscription: () => void;
  onApplyTemplate: (template: PopularSubscriptionTemplate) => void;
  onChangeCatalogCountry: (country: HouseholdSummary["country"]) => void;
  onChangeCategoryFamily: (category: CategoryFamilyKey) => void;
  onChangeDraft: Dispatch<SetStateAction<SubscriptionDraft>>;
  onConnectInstitution: (institution: BankInstitution) => void;
  onDisconnectConnection: (connectionId: string) => void;
  onEditHousehold: () => void;
  onOpenConnectionLink: (connection: BankConnection) => void;
  onOpenSubscription: (subscription: Subscription) => void;
  onRefresh: () => void;
  onResetDemoData?: () => void;
  onReviewCandidate: (candidateId: string, input: ReviewRecurringCandidateInput) => void;
  onSignOut: () => void;
  onQuickMockSync?: () => void;
  onSyncConnection: (connectionId: string) => void;
  onSwitchMember: (memberId: string) => void;
  opportunities: Opportunity[];
  popularSubscriptions: PopularSubscriptionTemplate[];
  refreshing: boolean;
  recurringCandidates: RecurringCandidate[];
  renewalSubscriptions: Subscription[];
  saving: boolean;
  syncingConnectionId: string | null;
  user: UserSummary | null;
}) {
  const templateMatches = findTemplateMatches(
    popularSubscriptions,
    draft.merchant,
    draft.category,
  );
  const matchingDraftSubscription = findMatchingSubscription(
    [...activeSubscriptions, ...cancelledSubscriptions],
    draft.merchant,
    draft.owner,
    draft.ownerLabel,
  );
  const pendingCandidates = recurringCandidates.filter(
    (candidate) => candidate.status === "pending",
  );
  const categoryTemplates = getTemplatesForCategoryFamily(
    popularSubscriptions,
    categoryFamily,
  );
  const showBankingSections =
    bankProvider !== "unconfigured" ||
    bankConnections.length > 0 ||
    pendingCandidates.length > 0;
  const timelineSubscriptions = [...activeSubscriptions]
    .sort((left, right) => left.nextRenewal.localeCompare(right.nextRenewal))
    .slice(0, 8);

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <LinearGradient colors={["#fffaf2", "#dff5ea"]} style={styles.hero}>
        <View style={styles.heroHeader}>
          <Text style={styles.eyebrow}>Orbit Household</Text>
          <Text style={styles.headline}>Recurring spend, under control.</Text>
          <Text style={styles.subhead}>
            One dashboard for live subscriptions, renewals, and savings actions across
            the household.
          </Text>
        </View>

        <View style={styles.metricsRow}>
          <MetricCard
            label="Live monthly"
            value={
              household
                ? formatCurrency(household.monthlyRecurringTotal)
                : loading
                  ? "..."
                  : "€0.00"
            }
            accent
          />
          <MetricCard
            label="Savings found"
            value={formatCurrency(sumAnnualSavings(opportunities), "/year")}
          />
        </View>

        <View style={styles.metricsRow}>
          <MetricCard
            label="Shared services"
            value={household ? String(household.sharedSubscriptions) : "..."}
          />
          <MetricCard
            label="Renewing soon"
            value={household ? String(household.renewalsDueSoon) : "..."}
            warning
          />
        </View>
      </LinearGradient>

      <View style={styles.connectionCard}>
        <Text style={styles.connectionLabel}>Household</Text>
        <Text style={styles.connectionValue}>{household?.name ?? "Loading..."}</Text>
        <Text style={styles.connectionHint}>
          {household?.country ?? "ES"} · {household?.locale ?? "Pending"} · tap edit to
          change the market setup.
        </Text>
        <Text style={styles.connectionHint}>
          {household?.members.length ?? 0} members · share code {household?.shareCode ?? "..."}
        </Text>
        <Text style={styles.connectionHint}>
          Signed in as {user?.email ?? "member"} · active member {activeMember?.name ?? "Household"}
        </Text>
        <View style={styles.actionRow}>
          <Pressable
            onPress={onEditHousehold}
            style={({ pressed }) => [
              styles.secondaryButton,
              styles.inlineTopButton,
              pressed ? styles.secondaryButtonPressed : null,
            ]}
          >
            <Text style={styles.secondaryButtonLabel}>Edit household</Text>
          </Pressable>
          <Pressable
            onPress={onSignOut}
            style={({ pressed }) => [
              styles.ghostButton,
              styles.inlineTopButton,
              pressed ? styles.ghostButtonPressed : null,
            ]}
          >
            <Text style={styles.ghostButtonLabel}>Sign out</Text>
          </Pressable>
          {onResetDemoData ? (
            <Pressable
              onPress={onResetDemoData}
              style={({ pressed }) => [
                styles.ghostButton,
                styles.inlineTopButton,
                pressed ? styles.ghostButtonPressed : null,
              ]}
            >
              <Text style={styles.ghostButtonLabel}>Reset demo</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <SectionHeader
        title="Member session"
        action={activeMember ? `Testing as ${activeMember.name}` : "Shared account"}
      />
      <View style={styles.formCard}>
        <Text style={styles.formHint}>
          This device can still switch the active household member for ownership flows,
          but every action is now attached to a signed-in account.
        </Text>
        <View style={styles.memberChipRow}>
          {household?.members.map((member) => (
            <ChoiceChip
              key={member.id}
              label={member.name}
              selected={activeMember?.id === member.id}
              onPress={() => onSwitchMember(member.id)}
            />
          ))}
        </View>
        <Text style={styles.formHintMuted}>
          Use the household share code during sign-in on the second device to attach a
          partner account to the same shared household.
        </Text>
      </View>

      <SectionHeader
        title="Household members"
        action={household ? `${household.members.length} active` : "Loading"}
      />
      <View style={styles.memberGrid}>
        {household?.memberSummaries.map((member) => (
          <View key={member.id} style={styles.memberCard}>
            <View style={styles.memberHeader}>
              <View style={[styles.memberDot, { backgroundColor: member.color }]} />
              <Text style={styles.memberName}>{member.name}</Text>
            </View>
            <Text style={styles.memberValue}>
              {formatCurrency(member.monthlyRecurringTotal)}
            </Text>
            <Text style={styles.memberMeta}>
              {member.activeSubscriptions} personal subscription
              {member.activeSubscriptions === 1 ? "" : "s"}
            </Text>
          </View>
        ))}
      </View>

      <SectionHeader
        title={`Start From A Category In ${catalogCountry}`}
        action={`${popularSubscriptions.length} picks`}
      />
      <View style={styles.categoryGrid}>
        {CATEGORY_FAMILIES.map((category) => {
          const summary = summarizeCategoryTemplates(
            getTemplatesForCategoryFamily(popularSubscriptions, category.id),
          );

          return (
            <Pressable
              key={category.id}
              onPress={() => onChangeCategoryFamily(category.id)}
              style={({ pressed }) => [
                styles.categoryCard,
                categoryFamily === category.id ? styles.categoryCardSelected : null,
                pressed ? styles.categoryCardPressed : null,
              ]}
            >
              <Text style={styles.categoryEmoji}>{category.emoji}</Text>
              <Text style={styles.categoryTitle}>{category.title}</Text>
              <Text style={styles.categoryMeta}>
                {summary.count > 0
                  ? `${summary.count} picks${summary.rangeLabel ? ` · ${summary.rangeLabel}` : ""}`
                  : "Custom only"}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.popularScrollContent}
      >
        {categoryTemplates.map((template) => (
          <Pressable
            key={template.id}
            onPress={() => onApplyTemplate(template)}
            style={({ pressed }) => [
              styles.popularCard,
              { borderColor: template.brandColor },
              pressed ? styles.popularCardPressed : null,
            ]}
          >
            <LogoBadge
              merchant={template.merchant}
              logoUrl={template.logoUrl}
              brandColor={template.brandColor}
            />
            <Text style={styles.popularMerchant}>{template.merchant}</Text>
            <Text style={styles.popularMeta}>{template.category}</Text>
            <Text style={styles.popularPrice}>{template.priceHint}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <SectionHeader title="Add subscription" action={saving ? "Saving..." : "Manual"} />
      <View style={styles.formCard}>
        <TextInput
          testID="add-merchant-input"
          value={draft.merchant}
          onChangeText={(merchant) => onChangeDraft((current) => ({ ...current, merchant }))}
          placeholder="Merchant"
          placeholderTextColor="#8a938d"
          style={styles.input}
        />
        <Text style={styles.formHint}>
          Start typing to match the {catalogCountry} subscription catalog and prefill the
          form with one tap.
        </Text>
        {matchingDraftSubscription ? (
          <Text style={styles.formHintMuted}>
            Saving now will update the existing {matchingDraftSubscription.merchant} entry
            for {matchingDraftSubscription.ownerLabel} instead of creating a duplicate.
          </Text>
        ) : null}
        {templateMatches.length > 0 ? (
          <View style={styles.suggestionList}>
            {templateMatches.map((template) => (
                <Pressable
                  key={template.id}
                  testID={`template-suggestion-${template.id}`}
                  onPress={() => onApplyTemplate(template)}
                  style={({ pressed }) => [
                    styles.suggestionRow,
                    pressed ? styles.suggestionRowPressed : null,
                  ]}
                >
                  <LogoBadge
                    merchant={template.merchant}
                    logoUrl={template.logoUrl}
                    brandColor={template.brandColor}
                  />
                  <View style={styles.suggestionContent}>
                    <Text style={styles.suggestionTitle}>{template.merchant}</Text>
                    <Text style={styles.suggestionSubtitle}>
                      {template.category} · {template.priceHint}
                    </Text>
                  </View>
                  <Text style={styles.suggestionAction}>Use</Text>
                </Pressable>
              ))}
          </View>
        ) : draft.merchant.trim().length >= 2 ? (
          <Text style={styles.formHintMuted}>
            No direct match yet. Keep typing or add the service manually.
          </Text>
        ) : null}
        <TextInput
          testID="add-category-input"
          value={draft.category}
          onChangeText={(category) => onChangeDraft((current) => ({ ...current, category }))}
          placeholder="Category"
          placeholderTextColor="#8a938d"
          style={styles.input}
        />
        <View style={styles.twoColumnRow}>
          <TextInput
            value={draft.amount}
            onChangeText={(amount) => onChangeDraft((current) => ({ ...current, amount }))}
            placeholder="Amount"
            placeholderTextColor="#8a938d"
            keyboardType="decimal-pad"
            style={[styles.input, styles.halfInput]}
          />
          <TextInput
            value={draft.nextRenewal}
            onChangeText={(nextRenewal) =>
              onChangeDraft((current) => ({ ...current, nextRenewal }))
            }
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#8a938d"
            style={[styles.input, styles.halfInput]}
          />
        </View>
        <View style={styles.formSection}>
          <Text style={styles.formSectionLabel}>Cadence</Text>
          <View style={styles.chipRow}>
            <ChoiceChip
              label="Monthly"
              selected={draft.cadence === "monthly"}
              onPress={() =>
                onChangeDraft((current) => ({ ...current, cadence: "monthly" }))
              }
            />
            <ChoiceChip
              label="Annual"
              selected={draft.cadence === "annual"}
              onPress={() =>
                onChangeDraft((current) => ({ ...current, cadence: "annual" }))
              }
            />
          </View>
        </View>
        <View style={styles.formSection}>
          <Text style={styles.formSectionLabel}>Owner</Text>
          <View style={styles.chipRow}>
            <ChoiceChip
              label="Shared"
              selected={draft.owner === "shared"}
              onPress={() =>
                onChangeDraft((current) => ({
                  ...current,
                  owner: "shared",
                  ownerLabel: "Household",
                }))
              }
            />
            <ChoiceChip
              label="Personal"
              selected={draft.owner === "personal"}
              onPress={() =>
                onChangeDraft((current) => ({
                  ...current,
                  owner: "personal",
                  ownerLabel:
                    current.ownerLabel === "Household"
                      ? activeMember?.name ?? household?.members[0]?.name ?? "Member"
                      : current.ownerLabel,
                }))
              }
            />
          </View>
        </View>
        {draft.owner === "personal" && household ? (
          <View style={styles.memberChipRow}>
            {household.members.map((member) => (
              <ChoiceChip
                key={member.id}
                label={member.name}
                selected={draft.ownerLabel === member.name}
                onPress={() =>
                  onChangeDraft((current) => ({ ...current, ownerLabel: member.name }))
                }
              />
            ))}
          </View>
        ) : null}
        <TextInput
          value={draft.ownerLabel}
          onChangeText={(ownerLabel) =>
            onChangeDraft((current) => ({ ...current, ownerLabel }))
          }
          placeholder="Owner label"
          placeholderTextColor="#8a938d"
          style={styles.input}
        />
        <Pressable
          onPress={onAddSubscription}
          disabled={saving}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed ? styles.primaryButtonPressed : null,
            saving ? styles.primaryButtonDisabled : null,
          ]}
        >
          <Text style={styles.primaryButtonLabel}>
            {saving ? "Saving subscription..." : "Save subscription"}
          </Text>
        </Pressable>
      </View>

      {showBankingSections ? (
        <>
          <SectionHeader
            title="Connected accounts"
            action={`${bankConnections.length} linked`}
          />
          <View style={styles.formCard}>
            <Text style={styles.formHint}>
              Free bank connectivity starts with read-only account data. Link an institution,
              sync transactions, then review recurring candidates before anything becomes a
              tracked subscription.
            </Text>
            {bankNotice ? (
              <View style={styles.emptyStateCard}>
                <Text style={styles.emptyStateTitle}>Bank consent returned</Text>
                <Text style={styles.emptyStateBody}>{bankNotice}</Text>
              </View>
            ) : null}
            {bankProvider === "unconfigured" ? (
              <Text style={styles.formHintMuted}>
                Real open banking is not configured yet. Add Enable Banking or GoCardless
                credentials on the backend to enable live bank connections for Spain and
                France.
              </Text>
            ) : (
              <>
                <View style={styles.memberChipRow}>
                  {institutions.map((institution) => (
                    <ChoiceChip
                      key={institution.id}
                      label={institution.name}
                      selected={bankConnections.some(
                        (connection) =>
                          connection.institutionId === institution.id &&
                          connection.status !== "revoked",
                      )}
                      onPress={() => onConnectInstitution(institution)}
                    />
                  ))}
                </View>
                {onQuickMockSync && bankProvider === "mock" ? (
                  <Pressable
                    onPress={onQuickMockSync}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      pressed ? styles.secondaryButtonPressed : null,
                    ]}
                  >
                    <Text style={styles.secondaryButtonLabel}>Load demo bank sync</Text>
                  </Pressable>
                ) : null}
              </>
            )}
            {bankConnections.length > 0 ? (
              <View style={styles.suggestionList}>
                {bankConnections.map((connection) => (
                  <View key={connection.id} style={styles.suggestionRow}>
                    <View style={styles.suggestionContent}>
                      <Text style={styles.suggestionTitle}>{connection.institutionName}</Text>
                      <Text style={styles.suggestionSubtitle}>
                        {sentenceCase(connection.status)}
                        {connection.accountCount ? ` · ${connection.accountCount} account(s)` : ""}
                        {connection.lastSyncedAt
                          ? ` · synced ${connection.lastSyncedAt.slice(0, 10)}`
                          : ""}
                      </Text>
                      {connection.errorMessage ? (
                        <Text style={styles.formHintMuted}>{connection.errorMessage}</Text>
                      ) : null}
                      {bankAccounts
                        .filter((account) => account.connectionId === connection.id)
                        .map((account) => (
                          <Text key={account.id} style={styles.formHintMuted}>
                            {account.name}
                            {account.balance !== undefined
                              ? ` · ${formatCurrency(account.balance)}`
                              : ""}
                          </Text>
                        ))}
                    </View>
                    <View style={styles.inlineActionStack}>
                      {connection.status !== "revoked" ? (
                        <Pressable
                          testID={`sync-connection-${connection.id}`}
                          onPress={() => onSyncConnection(connection.id)}
                          style={({ pressed }) => [
                            styles.secondaryButton,
                            pressed ? styles.secondaryButtonPressed : null,
                          ]}
                        >
                          <Text style={styles.secondaryButtonLabel}>
                            {syncingConnectionId === connection.id
                              ? "Syncing..."
                              : connection.status === "pending"
                                ? "Refresh"
                                : "Sync"}
                          </Text>
                        </Pressable>
                      ) : (
                        <Text style={styles.formHintMuted}>Disconnected</Text>
                      )}
                      {connection.linkUrl && connection.status === "pending" ? (
                        <Pressable
                          onPress={() => onOpenConnectionLink(connection)}
                          style={({ pressed }) => [
                            styles.ghostButton,
                            pressed ? styles.ghostButtonPressed : null,
                          ]}
                        >
                          <Text style={styles.ghostButtonLabel}>Continue in bank</Text>
                        </Pressable>
                      ) : null}
                      {connection.status !== "revoked" ? (
                        <Pressable
                          onPress={() => onDisconnectConnection(connection.id)}
                          style={({ pressed }) => [
                            styles.ghostButton,
                            pressed ? styles.ghostButtonPressed : null,
                          ]}
                        >
                          <Text style={styles.ghostButtonLabel}>Disconnect</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            ) : bankProvider !== "unconfigured" ? (
              <Text style={styles.formHintMuted}>
                No linked institutions yet. Use a configured bank connector to import
                transactions and review recurring candidates.
              </Text>
            ) : null}
          </View>

          <SectionHeader
            title="Recurring candidates"
            action={`${pendingCandidates.length} pending review`}
          />
          {pendingCandidates.map((candidate) => (
            <View key={candidate.id} style={styles.opportunityCard}>
              <View style={styles.pillRow}>
                <Text style={styles.pillPrimary}>
                  {Math.round(candidate.confidence * 100)}% confidence
                </Text>
                <Text style={styles.pillSavings}>
                  {formatCurrency(candidate.amount, candidate.cadence === "annual" ? "/year" : "/month")}
                </Text>
              </View>
              <Text style={styles.cardTitle}>{candidate.merchantName}</Text>
              <Text style={styles.cardBody}>
                {candidate.evidenceSummary} Next expected renewal {candidate.nextRenewal}.
              </Text>
              <View style={styles.memberChipRow}>
                <Pressable
                  testID={`candidate-confirm-shared-${candidate.id}`}
                  onPress={() =>
                    onReviewCandidate(candidate.id, {
                      action: "confirm",
                      owner: "shared",
                      ownerLabel: "Household",
                    })
                  }
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed ? styles.secondaryButtonPressed : null,
                  ]}
                >
                  <Text style={styles.secondaryButtonLabel}>Confirm shared</Text>
                </Pressable>
                <Pressable
                  testID={`candidate-confirm-personal-${candidate.id}`}
                  onPress={() =>
                    onReviewCandidate(candidate.id, {
                      action: "confirm",
                      owner: "personal",
                      ownerLabel: activeMember?.name ?? household?.members[0]?.name ?? "Member",
                    })
                  }
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed ? styles.secondaryButtonPressed : null,
                  ]}
                >
                  <Text style={styles.secondaryButtonLabel}>Confirm personal</Text>
                </Pressable>
                <Pressable
                  testID={`candidate-dismiss-${candidate.id}`}
                  onPress={() => onReviewCandidate(candidate.id, { action: "reject" })}
                  style={({ pressed }) => [
                    styles.ghostButton,
                    pressed ? styles.ghostButtonPressed : null,
                  ]}
                >
                  <Text style={styles.ghostButtonLabel}>Dismiss</Text>
                </Pressable>
              </View>
            </View>
          ))}
          {!loading && pendingCandidates.length === 0 ? (
            <EmptyState
              title="No recurring candidates yet"
              body="Sync a bank connection to generate likely recurring payments, then confirm or reject them before they hit the dashboard."
            />
          ) : null}
        </>
      ) : null}

      {opportunities.length > 0 ? (
        <>
          <SectionHeader title="Best next actions" action={`${opportunities.length} live`} />
          {opportunities.map((opportunity) => (
            <View key={opportunity.id} style={styles.opportunityCard}>
              <View style={styles.pillRow}>
                <Text style={styles.pillPrimary}>{labelOpportunity(opportunity.type)}</Text>
                <Text style={styles.pillSavings}>
                  {formatCurrency(opportunity.annualSavings, "/year")}
                </Text>
              </View>
              <Text style={styles.cardTitle}>{opportunity.title}</Text>
              <Text style={styles.cardBody}>{opportunity.summary}</Text>
            </View>
          ))}
        </>
      ) : null}

      <SectionHeader
        title="Live subscriptions"
        action={household ? `${household.activeSubscriptions} tracked` : "Loading"}
      />
      {activeSubscriptions.map((subscription) => (
        <SubscriptionListCard
          key={subscription.id}
          onPress={() => onOpenSubscription(subscription)}
          subscription={subscription}
          template={findTemplateForMerchant(householdTemplates, subscription.merchant)}
        />
      ))}
      {!loading && activeSubscriptions.length === 0 ? (
        <EmptyState
          title="No subscriptions yet"
          body="Start by adding the first recurring payment manually. Bank-assisted detection can layer on later."
        />
      ) : null}

      {cancelledSubscriptions.length > 0 ? (
        <>
          <SectionHeader
            title="Cancelled subscriptions"
            action={`${cancelledSubscriptions.length} archived`}
          />
          {cancelledSubscriptions.map((subscription) => (
            <SubscriptionListCard
              key={subscription.id}
              cancelled
              onPress={() => onOpenSubscription(subscription)}
              subscription={subscription}
              template={findTemplateForMerchant(householdTemplates, subscription.merchant)}
            />
          ))}
        </>
      ) : null}

      <SectionHeader title="Cash-out timeline" action={`Next ${timelineSubscriptions.length}`} />
      <View style={styles.timelineCard}>
        {timelineSubscriptions.length > 0 ? (
          timelineSubscriptions.map((subscription) => (
            <View key={subscription.id} style={styles.timelineRow}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineMerchant}>{subscription.merchant}</Text>
                <Text style={styles.timelineLabel}>
                  {subscription.ownerLabel} · {formatCurrency(subscription.amount)}
                </Text>
              </View>
              <Text style={styles.timelineDate}>{subscription.nextRenewal}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.timelineLabel}>
            Add the first recurring payment and the cash-out calendar will build itself.
          </Text>
        )}
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Unable to sync the dashboard</Text>
          <Text style={styles.errorBody}>{error}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function SubscriptionListCard({
  cancelled,
  onPress,
  subscription,
  template,
}: {
  cancelled?: boolean;
  onPress: () => void;
  subscription: Subscription;
  template: PopularSubscriptionTemplate | null;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        cancelled ? styles.cancelledSubscriptionCard : styles.subscriptionCard,
        pressed ? styles.subscriptionCardPressed : null,
      ]}
    >
      <View style={styles.subscriptionHeader}>
        <View style={styles.subscriptionLeft}>
          <LogoBadge
            merchant={subscription.merchant}
            logoUrl={template?.logoUrl}
            brandColor={template?.brandColor ?? "#0f9d7a"}
          />
          <View style={styles.subscriptionInfo}>
            <Text style={styles.subscriptionMerchant}>{subscription.merchant}</Text>
            <Text style={styles.subscriptionMeta}>
              {subscription.ownerLabel} ·{" "}
              {cancelled ? "Cancelled" : sentenceCase(subscription.cadence)} ·{" "}
              {cancelled ? "Inactive" : sentenceCase(subscription.status)}
            </Text>
          </View>
        </View>
        <View style={styles.subscriptionRight}>
          <Text style={styles.subscriptionAmount}>{formatCurrency(subscription.amount)}</Text>
          <Text style={cancelled ? styles.cancelledStatus : styles.subscriptionStatus}>
            {cancelled ? "Inactive" : sentenceCase(subscription.confidence)}
          </Text>
        </View>
      </View>
      {!cancelled ? (
        <Text style={styles.renewalText}>Next renewal: {subscription.nextRenewal}</Text>
      ) : null}
    </Pressable>
  );
}

function SubscriptionDetailScreen({
  draft,
  error,
  household,
  matchedTemplate,
  onBack,
  onCancel,
  onDelete,
  onRestore,
  onSave,
  onSelectStatus,
  onChangeDraft,
  saving,
  subscription,
}: {
  draft: EditableSubscriptionDraft;
  error: string | null;
  household: HouseholdSummary;
  matchedTemplate: PopularSubscriptionTemplate | null;
  onBack: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onRestore: () => void;
  onSave: () => void;
  onSelectStatus: (status: Subscription["status"]) => void;
  onChangeDraft: Dispatch<SetStateAction<EditableSubscriptionDraft>>;
  saving: boolean;
  subscription: Subscription;
}) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <LinearGradient colors={["#fffaf2", "#dff5ea"]} style={styles.hero}>
        <View style={styles.detailHeroRow}>
          <LogoBadge
            merchant={subscription.merchant}
            logoUrl={matchedTemplate?.logoUrl}
            brandColor={matchedTemplate?.brandColor ?? "#0f9d7a"}
          />
          <View style={styles.heroHeader}>
            <Text style={styles.eyebrow}>Subscription detail</Text>
            <Text style={styles.headline}>{subscription.merchant}</Text>
            <Text style={styles.subhead}>
              Edit the subscription, change its status, or archive it without losing
              the recurring spend history.
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.actionRow}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed ? styles.secondaryButtonPressed : null,
          ]}
        >
          <Text style={styles.secondaryButtonLabel}>Back to dashboard</Text>
        </Pressable>
        {subscription.status === "cancelled" ? (
          <Pressable
            onPress={onRestore}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed ? styles.secondaryButtonPressed : null,
            ]}
          >
            <Text style={styles.secondaryButtonLabel}>Restore</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [
              styles.warningButton,
              pressed ? styles.secondaryButtonPressed : null,
            ]}
          >
            <Text style={styles.warningButtonLabel}>Mark cancelled</Text>
          </Pressable>
        )}
        <Pressable
          onPress={onDelete}
          style={({ pressed }) => [
            styles.ghostButton,
            pressed ? styles.ghostButtonPressed : null,
          ]}
        >
          <Text style={styles.ghostButtonLabel}>Delete</Text>
        </Pressable>
      </View>

      <SectionHeader title="Manage subscription" action={sentenceCase(subscription.status)} />
      <View style={styles.formCard}>
        <TextInput
          value={draft.merchant}
          onChangeText={(merchant) => onChangeDraft((current) => ({ ...current, merchant }))}
          placeholder="Merchant"
          placeholderTextColor="#8a938d"
          style={styles.input}
        />
        <TextInput
          value={draft.category}
          onChangeText={(category) => onChangeDraft((current) => ({ ...current, category }))}
          placeholder="Category"
          placeholderTextColor="#8a938d"
          style={styles.input}
        />
        <View style={styles.twoColumnRow}>
          <TextInput
            value={draft.amount}
            onChangeText={(amount) => onChangeDraft((current) => ({ ...current, amount }))}
            placeholder="Amount"
            placeholderTextColor="#8a938d"
            keyboardType="decimal-pad"
            style={[styles.input, styles.halfInput]}
          />
          <TextInput
            value={draft.nextRenewal}
            onChangeText={(nextRenewal) =>
              onChangeDraft((current) => ({ ...current, nextRenewal }))
            }
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#8a938d"
            style={[styles.input, styles.halfInput]}
          />
        </View>
        <View style={styles.formSection}>
          <Text style={styles.formSectionLabel}>Cadence</Text>
          <View style={styles.chipRow}>
            <ChoiceChip
              label="Monthly"
              selected={draft.cadence === "monthly"}
              onPress={() => onChangeDraft((current) => ({ ...current, cadence: "monthly" }))}
            />
            <ChoiceChip
              label="Annual"
              selected={draft.cadence === "annual"}
              onPress={() => onChangeDraft((current) => ({ ...current, cadence: "annual" }))}
            />
          </View>
        </View>
        <View style={styles.formSection}>
          <Text style={styles.formSectionLabel}>Owner</Text>
          <View style={styles.chipRow}>
            <ChoiceChip
              label="Shared"
              selected={draft.owner === "shared"}
              onPress={() =>
                onChangeDraft((current) => ({
                  ...current,
                  owner: "shared",
                  ownerLabel: "Household",
                }))
              }
            />
            <ChoiceChip
              label="Personal"
              selected={draft.owner === "personal"}
              onPress={() =>
                onChangeDraft((current) => ({
                  ...current,
                  owner: "personal",
                  ownerLabel:
                    current.ownerLabel === "Household"
                      ? household.members[0]?.name ?? "Member"
                      : current.ownerLabel,
                }))
              }
            />
          </View>
        </View>
        {draft.owner === "personal" ? (
          <View style={styles.memberChipRow}>
            {household.members.map((member) => (
              <ChoiceChip
                key={member.id}
                label={member.name}
                selected={draft.ownerLabel === member.name}
                onPress={() =>
                  onChangeDraft((current) => ({ ...current, ownerLabel: member.name }))
                }
              />
            ))}
          </View>
        ) : null}
        <TextInput
          value={draft.ownerLabel}
          onChangeText={(ownerLabel) =>
            onChangeDraft((current) => ({ ...current, ownerLabel }))
          }
          placeholder="Owner label"
          placeholderTextColor="#8a938d"
          style={styles.input}
        />
        <View style={styles.formSection}>
          <Text style={styles.formSectionLabel}>Status</Text>
          <View style={styles.statusRow}>
            {(["active", "trial", "pending_cancellation", "cancelled"] as const).map(
              (status) => (
                <ChoiceChip
                  key={status}
                  label={sentenceCase(status)}
                  selected={draft.status === status}
                  onPress={() => onSelectStatus(status)}
                />
              ),
            )}
          </View>
        </View>
        <Pressable
          onPress={onSave}
          disabled={saving}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed ? styles.primaryButtonPressed : null,
            saving ? styles.primaryButtonDisabled : null,
          ]}
        >
          <Text style={styles.primaryButtonLabel}>
            {saving ? "Saving changes..." : "Save changes"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.emptyStateCard}>
        <Text style={styles.emptyStateTitle}>Why this matters</Text>
        <Text style={styles.emptyStateBody}>
          The first iOS vertical slice needs a full management loop, not just creation.
          This screen is the control point for editing, cancellation, and restoration.
        </Text>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Unable to save subscription</Text>
          <Text style={styles.errorBody}>{error}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function ChoiceChip({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.choiceChip,
        selected ? styles.choiceChipSelected : null,
        pressed ? styles.choiceChipPressed : null,
      ]}
    >
      <Text style={[styles.choiceChipLabel, selected ? styles.choiceChipLabelSelected : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

function MetricCard({
  label,
  value,
  accent,
  warning,
}: {
  label: string;
  value: string;
  accent?: boolean;
  warning?: boolean;
}) {
  return (
    <View
      style={[
        styles.metricCard,
        accent ? styles.metricCardAccent : null,
        warning ? styles.metricCardWarning : null,
      ]}
    >
      <Text style={[styles.metricLabel, accent ? styles.metricLabelAccent : null]}>
        {label}
      </Text>
      <Text style={[styles.metricValue, accent ? styles.metricValueAccent : null]}>
        {value}
      </Text>
    </View>
  );
}

function SectionHeader({ title, action }: { title: string; action: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionAction}>{action}</Text>
    </View>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.emptyStateCard}>
      <Text style={styles.emptyStateTitle}>{title}</Text>
      <Text style={styles.emptyStateBody}>{body}</Text>
    </View>
  );
}

function LogoBadge({
  merchant,
  logoUrl,
  brandColor,
}: {
  merchant: string;
  logoUrl?: string;
  brandColor: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <View style={[styles.logoBadge, { backgroundColor: brandColor }]}>
      {!failed && logoUrl ? (
        <Image
          source={{ uri: logoUrl }}
          onError={() => setFailed(true)}
          style={styles.logoImage}
        />
      ) : null}
      {failed ? <Text style={styles.logoFallback}>{merchant.slice(0, 2)}</Text> : null}
    </View>
  );
}

const CATEGORY_FAMILIES: Array<{
  id: CategoryFamilyKey;
  title: string;
  emoji: string;
  description: string;
}> = [
  {
    id: "tv_entertainment",
    title: "TV & entertainment",
    emoji: "TV",
    description: "Streaming video, music, and household bundles.",
  },
  {
    id: "phone_internet",
    title: "Phone & internet",
    emoji: "TEL",
    description: "Home broadband, mobile, and family telecom bundles.",
  },
  {
    id: "banking",
    title: "Banking",
    emoji: "BANK",
    description: "Premium bank, card, and money app plans.",
  },
  {
    id: "sports_gym",
    title: "Sports & gym",
    emoji: "FIT",
    description: "Sports passes, fitness clubs, and active memberships.",
  },
  {
    id: "cloud_ai",
    title: "Cloud & AI",
    emoji: "AI",
    description: "Storage, productivity, and AI subscriptions.",
  },
  {
    id: "gaming",
    title: "Gaming",
    emoji: "PLAY",
    description: "Console memberships and recurring gaming passes.",
  },
  {
    id: "news_learning",
    title: "News & learning",
    emoji: "READ",
    description: "Books, news, and educational plans.",
  },
  {
    id: "other",
    title: "Other",
    emoji: "MORE",
    description: "Everything else the household pays every month.",
  },
];

function labelOpportunity(type: Opportunity["type"]) {
  switch (type) {
    case "trial":
      return "Trial";
    case "billing_cycle":
      return "Billing";
    case "plan_switch":
      return "Optimize";
    case "duplicate":
      return "Duplicate";
    default:
      return "Opportunity";
  }
}

function sentenceCase(value: string) {
  return value.replaceAll("_", " ").replace(/^\w/, (character) => character.toUpperCase());
}

function formatCurrency(amount: number, suffix = "") {
  return `€${amount.toFixed(2)}${suffix}`;
}

function sumAnnualSavings(opportunities: Opportunity[]) {
  return opportunities.reduce((total, opportunity) => total + opportunity.annualSavings, 0);
}

function findTemplateMatches(
  templates: PopularSubscriptionTemplate[],
  merchantQuery: string,
  categoryQuery: string,
) {
  const merchantTerm = normalizeSearchTerm(merchantQuery);
  const categoryTerm = normalizeSearchTerm(categoryQuery);

  if (merchantTerm.length < 2 && categoryTerm.length < 2) {
    return [];
  }

  return [...templates]
    .filter((template) => {
      const searchable = normalizeSearchTerm(`${template.merchant} ${template.category}`);

      return searchable.includes(merchantTerm || categoryTerm);
    })
    .sort((left, right) => {
      const leftMerchant = normalizeSearchTerm(left.merchant);
      const rightMerchant = normalizeSearchTerm(right.merchant);
      const leftStarts = merchantTerm.length >= 2 && leftMerchant.startsWith(merchantTerm);
      const rightStarts = merchantTerm.length >= 2 && rightMerchant.startsWith(merchantTerm);

      if (leftStarts !== rightStarts) {
        return leftStarts ? -1 : 1;
      }

      return left.merchant.localeCompare(right.merchant);
    })
    .slice(0, 4);
}

function getTemplatesForCategoryFamily(
  templates: PopularSubscriptionTemplate[],
  categoryFamily: CategoryFamilyKey,
) {
  return templates.filter((template) => resolveCategoryFamily(template) === categoryFamily);
}

function resolveCategoryFamily(template: PopularSubscriptionTemplate) {
  const category = normalizeSearchTerm(template.category);

  if (["entertainment", "music", "bundle"].includes(category)) {
    return "tv_entertainment";
  }

  if (category === "telecom") {
    return "phone_internet";
  }

  if (category === "banking") {
    return "banking";
  }

  if (["sports", "fitness"].includes(category)) {
    return "sports_gym";
  }

  if (["cloud", "productivity", "ai"].includes(category)) {
    return "cloud_ai";
  }

  if (category === "gaming") {
    return "gaming";
  }

  if (["news", "books"].includes(category)) {
    return "news_learning";
  }

  return "other";
}

function summarizeCategoryTemplates(templates: PopularSubscriptionTemplate[]) {
  const amounts = templates
    .map((template) => template.defaultAmount)
    .filter((amount): amount is number => amount !== null)
    .sort((left, right) => left - right);

  if (amounts.length === 0) {
    return {
      count: templates.length,
      rangeLabel: null,
    };
  }

  return {
    count: templates.length,
    rangeLabel: `${formatCurrency(amounts[0])} to ${formatCurrency(amounts[amounts.length - 1])}`,
  };
}

function normalizeSearchTerm(value: string) {
  return value.trim().toLowerCase();
}

function findTemplateForMerchant(
  templates: PopularSubscriptionTemplate[],
  merchant: string,
) {
  return (
    templates.find(
      (template) =>
        normalizeSearchTerm(template.merchant) === normalizeSearchTerm(merchant),
    ) ?? null
  );
}

function findMatchingSubscription(
  subscriptions: Subscription[],
  merchant: string,
  owner: Ownership,
  ownerLabel: string,
) {
  const normalizedMerchant = normalizeSearchTerm(merchant);
  const normalizedOwnerLabel = normalizeSearchTerm(ownerLabel);

  return (
    subscriptions.find(
      (subscription) =>
        normalizeSearchTerm(subscription.merchant) === normalizedMerchant &&
        subscription.owner === owner &&
        normalizeSearchTerm(subscription.ownerLabel) === normalizedOwnerLabel,
    ) ?? null
  );
}

function isBankCallbackUrl(url: string) {
  return normalizeSearchTerm(url).includes("open-banking/callback");
}

function readUrlParam(url: string, key: string) {
  try {
    return new URL(url).searchParams.get(key);
  } catch {
    return null;
  }
}

function ensureHouseholdDraftMembers(members: string[]) {
  const safeMembers = [...members];

  while (safeMembers.length < 2) {
    safeMembers.push("");
  }

  return safeMembers.slice(0, 2);
}

function createInitialDraft(): SubscriptionDraft {
  return {
    merchant: "",
    category: "",
    amount: "",
    cadence: "monthly",
    nextRenewal: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
      .toISOString()
      .slice(0, 10),
    owner: "shared",
    ownerLabel: "Household",
  };
}

function createInitialEditDraft(): EditableSubscriptionDraft {
  return {
    ...createInitialDraft(),
    nextRenewal: "",
    status: "active",
  };
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f7f3ea",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  hero: {
    borderRadius: 28,
    padding: 24,
    marginTop: 12,
    gap: 18,
  },
  heroHeader: {
    gap: 10,
  },
  eyebrow: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 14,
    color: "#0b6b57",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  headline: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 34,
    lineHeight: 38,
    color: "#18261f",
  },
  subhead: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 15,
    lineHeight: 22,
    color: "#445149",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#fffaf2",
    borderRadius: 22,
    padding: 16,
    gap: 8,
  },
  metricCardAccent: {
    backgroundColor: "#0f9d7a",
  },
  metricCardWarning: {
    backgroundColor: "#ffe7d6",
  },
  metricLabel: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
    color: "#6f7a72",
  },
  metricLabelAccent: {
    color: "#d8fff3",
  },
  metricValue: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 24,
    color: "#18261f",
  },
  metricValueAccent: {
    color: "#ffffff",
  },
  connectionCard: {
    backgroundColor: "#fffaf2",
    borderRadius: 22,
    padding: 18,
    gap: 6,
  },
  connectionLabel: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 13,
    color: "#6f7a72",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  connectionValue: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 16,
    color: "#18261f",
  },
  connectionHint: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
    color: "#6f7a72",
  },
  inlineTopButton: {
    alignSelf: "flex-start",
    marginTop: 6,
  },
  inlineActionButton: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  inlineActionStack: {
    alignItems: "flex-end",
    gap: 8,
  },
  memberGrid: {
    gap: 12,
  },
  categoryGrid: {
    gap: 12,
  },
  categoryCard: {
    backgroundColor: "#fffaf2",
    borderRadius: 22,
    padding: 16,
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#efe5d6",
  },
  categoryCardSelected: {
    borderColor: "#0b6b57",
    backgroundColor: "#edf8f1",
  },
  categoryCardPressed: {
    opacity: 0.82,
  },
  categoryEmoji: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 12,
    color: "#0b6b57",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  categoryTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 16,
    color: "#18261f",
  },
  categoryBody: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
    color: "#6f7a72",
    lineHeight: 18,
  },
  categoryMeta: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 12,
    color: "#0f7b64",
  },
  memberCard: {
    backgroundColor: "#fffaf2",
    borderRadius: 22,
    padding: 16,
    gap: 8,
  },
  memberHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  memberDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  memberName: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 15,
    color: "#18261f",
  },
  memberValue: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 20,
    color: "#0b6b57",
  },
  memberMeta: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
    color: "#6f7a72",
  },
  popularScrollContent: {
    gap: 12,
    paddingRight: 20,
  },
  countrySwitchRow: {
    flexDirection: "row",
    gap: 10,
  },
  popularCard: {
    width: 152,
    backgroundColor: "#fffaf2",
    borderRadius: 22,
    padding: 16,
    gap: 10,
    borderWidth: 1.5,
  },
  popularCardPressed: {
    opacity: 0.82,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImage: {
    width: 48,
    height: 48,
    backgroundColor: "#ffffff",
  },
  logoFallback: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 16,
    color: "#ffffff",
    textTransform: "uppercase",
  },
  popularMerchant: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 15,
    lineHeight: 18,
    color: "#18261f",
  },
  popularMeta: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 12,
    color: "#6f7a72",
  },
  popularPrice: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 12,
    color: "#0b6b57",
  },
  sectionHeader: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 20,
    color: "#18261f",
  },
  sectionAction: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 14,
    color: "#0b6b57",
  },
  formCard: {
    backgroundColor: "#fffaf2",
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e4ddd2",
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 15,
    color: "#18261f",
  },
  formHint: {
    marginTop: -4,
    marginBottom: 4,
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
    lineHeight: 20,
    color: "#5f6f68",
  },
  formHintMuted: {
    marginTop: -4,
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
    lineHeight: 20,
    color: "#7d8782",
  },
  suggestionList: {
    gap: 10,
    marginBottom: 4,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#d9e7df",
    backgroundColor: "#fbfaf5",
  },
  suggestionRowPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.92,
  },
  suggestionContent: {
    flex: 1,
    gap: 2,
  },
  suggestionTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 14,
    color: "#17352f",
  },
  suggestionSubtitle: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 12,
    color: "#5f6f68",
  },
  suggestionAction: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 12,
    color: "#0b6b57",
    textTransform: "uppercase",
  },
  twoColumnRow: {
    flexDirection: "row",
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  formSection: {
    gap: 8,
  },
  formSectionLabel: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 13,
    color: "#445149",
  },
  chipRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  memberChipRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    marginTop: -4,
  },
  statusRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  choiceChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d9d2c8",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#fffaf2",
  },
  choiceChipSelected: {
    backgroundColor: "#dff5ea",
    borderColor: "#0f9d7a",
  },
  choiceChipPressed: {
    opacity: 0.8,
  },
  choiceChipLabel: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 13,
    color: "#445149",
  },
  choiceChipLabelSelected: {
    color: "#0b6b57",
  },
  primaryButton: {
    backgroundColor: "#18261f",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonPressed: {
    opacity: 0.92,
  },
  primaryButtonDisabled: {
    opacity: 0.55,
  },
  primaryButtonLabel: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 15,
    color: "#ffffff",
  },
  opportunityCard: {
    backgroundColor: "#fffaf2",
    borderRadius: 24,
    padding: 18,
    gap: 10,
  },
  pillRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pillPrimary: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 12,
    color: "#0b6b57",
    backgroundColor: "#dff5ea",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillSavings: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 12,
    color: "#d97841",
  },
  cardTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 18,
    color: "#18261f",
  },
  cardBody: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 14,
    lineHeight: 20,
    color: "#4d5c53",
  },
  subscriptionCard: {
    backgroundColor: "#fffaf2",
    borderRadius: 22,
    padding: 18,
    gap: 12,
  },
  subscriptionCardPressed: {
    opacity: 0.88,
  },
  subscriptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  subscriptionLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionMerchant: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 17,
    color: "#18261f",
  },
  subscriptionMeta: {
    marginTop: 4,
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
    color: "#6f7a72",
  },
  subscriptionRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  subscriptionAmount: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 16,
    color: "#18261f",
  },
  subscriptionStatus: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 12,
    color: "#0b6b57",
  },
  cancelledSubscriptionCard: {
    backgroundColor: "#f0e8de",
    borderRadius: 22,
    padding: 18,
    gap: 12,
  },
  cancelledStatus: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 12,
    color: "#8f4a21",
  },
  renewalText: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
    color: "#445149",
  },
  detailHeroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  secondaryButton: {
    backgroundColor: "#dff5ea",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  warningButton: {
    backgroundColor: "#ffe7d6",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  secondaryButtonPressed: {
    opacity: 0.8,
  },
  secondaryButtonLabel: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 13,
    color: "#0b6b57",
  },
  warningButtonLabel: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 13,
    color: "#8f4a21",
  },
  ghostButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f0e8de",
  },
  ghostButtonPressed: {
    opacity: 0.8,
  },
  ghostButtonLabel: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 13,
    color: "#5a645d",
  },
  timelineCard: {
    backgroundColor: "#fffaf2",
    borderRadius: 24,
    padding: 18,
    gap: 16,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: "#0f9d7a",
  },
  timelineContent: {
    flex: 1,
  },
  timelineMerchant: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 15,
    color: "#18261f",
  },
  timelineLabel: {
    marginTop: 2,
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
    color: "#6f7a72",
  },
  timelineDate: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 14,
    color: "#18261f",
  },
  emptyStateCard: {
    backgroundColor: "#fffaf2",
    borderRadius: 24,
    padding: 18,
    gap: 8,
  },
  emptyStateTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 17,
    color: "#18261f",
  },
  emptyStateBody: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 14,
    lineHeight: 20,
    color: "#6f7a72",
  },
  errorCard: {
    backgroundColor: "#ffe7d6",
    borderRadius: 24,
    padding: 18,
    gap: 8,
  },
  errorTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 16,
    color: "#8f4a21",
  },
  errorBody: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 14,
    lineHeight: 20,
    color: "#8f4a21",
  },
});
