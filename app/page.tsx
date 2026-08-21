"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import AccountPanel from "@/components/AccountPanel";
import AdminPanel from "@/components/AdminPanel";
import PlanPanel from "@/components/PlanPanel";
import AppHeader from "@/components/AppHeader";
import AuthPanel from "@/components/AuthPanel";
import BottomNavigation from "@/components/BottomNavigation";
import CategoryManager from "@/components/CategoryManager";
import SentenceCards from "@/components/SentenceCards";
import SentenceForm from "@/components/SentenceForm";
import SentenceList from "@/components/SentenceList";
import StatisticsPanel from "@/components/StatisticsPanel";
import StudyPanel from "@/components/StudyPanel";
import { useAppData } from "@/hooks/useAppData";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useAppSettings } from "@/hooks/useAppSettings";
import {
  ensureUserAccount,
  getUserAccess,
  loadCloudData,
  loadUserAccount,
  saveCloudData,
  type UserAccess,
  type UserAccount,
} from "@/lib/cloudData";
import type { PageName } from "@/types/app";

type CloudSyncState =
  | "idle"
  | "loading"
  | "ready"
  | "error";

const PAGE_TITLES: Record<PageName, string> = {
  cumle: "💬 Cümle Ekle",
  kart: "🗣️ Kart",
  study: "🎯 Çalış",
  stat: "📊 İstatistik",
  liste: "📚 Liste",
};

export default function Home() {
  const [activePage, setActivePage] =
    useState<PageName>("cumle");

  const [
    categoryManagerOpen,
    setCategoryManagerOpen,
  ] = useState(false);

  const [
    accountPanelOpen,
    setAccountPanelOpen,
  ] = useState(false);

  const [
    planPanelOpen,
    setPlanPanelOpen,
  ] = useState(false);

  const [
    adminPanelOpen,
    setAdminPanelOpen,
  ] = useState(false);

  const [
    previewPlan,
    setPreviewPlan,
  ] = useState<"free" | "pro" | null>(
    null,
  );

  const [cloudSyncState, setCloudSyncState] =
    useState<CloudSyncState>("idle");

  const [cloudReloadKey, setCloudReloadKey] =
    useState(0);

  const [userAccount, setUserAccount] =
    useState<UserAccount | null>(null);

  const userAccess = userAccount
    ? getUserAccess(userAccount)
    : null;

  const previewAccess: UserAccess | null =
    previewPlan === "free"
      ? {
          level: "free",
          reason: "free",
          trialActive: false,
          trialDaysLeft: 0,
          manualDaysLeft: 0,
        }
      : previewPlan === "pro"
        ? {
            level: "pro",
            reason: "subscription",
            trialActive: false,
            trialDaysLeft: 0,
            manualDaysLeft: 0,
          }
        : null;

  /*
   * Geliştirme sırasında URL'ye ?plan=free veya
   * ?plan=pro eklenirse gerçek Firestore planı
   * değiştirilmeden o planın arayüzü test edilir.
   */
  const effectiveAccess =
    previewAccess ?? userAccess;

  /*
   * Hesap bilgisi yüklenene kadar güvenli olarak
   * Free kuralları kullanılır. Pro abonelik veya
   * aktif deneme tespit edildiğinde limitler otomatik
   * olarak Pro seviyesine geçer.
   */
  const accessLevel =
    effectiveAccess?.level ?? "free";

  const {
    settings,
    reloadSettings,
  } = useAppSettings();

  const cloudSaveTimer =
    useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );

  const {
    appData,
    isLoaded,
    addSentence,
    updateSentence,
    deleteSentence,
    deleteSentences,
    moveSentences,
    rateSentence,
    addCategory,
    updateCategory,
    deleteCategory,
    addSubcategory,
    renameSubcategory,
    deleteSubcategory,
    addSubsubcategory,
    renameSubsubcategory,
    deleteSubsubcategory,
    moveSubcategories,
    resetStudyProgress,
    resetCategorySrs,
    resetSubcategorySrs,
    resetSubsubcategorySrs,
    replaceAppData,
    clearLocalData,
    totalDue,
    planLimits,
  } = useAppData(
    accessLevel,
    settings.freeLimits,
  );

  const latestAppDataRef = useRef(appData);

  const {
    user,
    isAuthLoading,
    authError,
    loginWithGoogle,
    logout,
  } = useAuth();

  const userId = user?.uid ?? null;

  const isAdmin = useAdminAccess(user);

  useEffect(() => {
    latestAppDataRef.current = appData;
  }, [appData]);

  useEffect(() => {
    if (
      process.env.NODE_ENV !==
      "development"
    ) {
      return;
    }

    const plan =
      new URLSearchParams(
        window.location.search,
      ).get("plan");

    if (
      plan === "free" ||
      plan === "pro"
    ) {
      setPreviewPlan(plan);
      return;
    }

    setPreviewPlan(null);
  }, []);

  function clearPlanPreview() {
    const url = new URL(
      window.location.href,
    );

    url.searchParams.delete("plan");
    window.location.href = url.toString();
  }

  /*
   * Kullanıcı giriş yaptıktan sonra önce bulut verisi yüklenir.
   * Bulutta veri yoksa cihazdaki mevcut veri ilk kez buluta yazılır.
   */
  useEffect(() => {
    if (!user || !isLoaded) {
      setCloudSyncState("idle");
      setUserAccount(null);
      return;
    }

    const currentUser = user;
    let cancelled = false;

    setCloudSyncState("loading");

    async function initializeCloudData() {
      /*
       * Hesap/trial servisi ile bulut veri yüklemesini
       * birbirinden ayırıyoruz. Böylece sunucu tarafı
       * hesap servisi geçici hata verse bile kullanıcının
       * mevcut cümle verileri açılmaya devam eder.
       */
      let account: UserAccount | null = null;

      try {
        account =
          await ensureUserAccount(currentUser);
      } catch (accountError) {
        console.error(
          "Hesap servisi kullanılamadı:",
          accountError,
        );

        /*
         * Mevcut kullanıcıysa Firestore'daki hesabı
         * salt okunur olarak almaya çalış.
         */
        try {
          account =
            await loadUserAccount(
              currentUser.uid,
            );
        } catch (accountLoadError) {
          console.error(
            "Mevcut hesap bilgisi okunamadı:",
            accountLoadError,
          );
        }
      }

      try {
        const cloudData =
          await loadCloudData(currentUser.uid);

        if (cancelled) {
          return;
        }

        if (cloudData) {
          replaceAppData(cloudData);
        } else {
          await saveCloudData(
            currentUser.uid,
            latestAppDataRef.current,
          );
        }

        if (!cancelled) {
          setUserAccount(account);
          setCloudSyncState("ready");
        }
      } catch (cloudError) {
        console.error(
          "Bulut verileri yüklenemedi:",
          cloudError,
        );

        if (!cancelled) {
          setUserAccount(account);
          setCloudSyncState("error");
        }
      }
    }

    void initializeCloudData();

    return () => {
      cancelled = true;
    };
  }, [
    user,
    isLoaded,
    replaceAppData,
    cloudReloadKey,
  ]);

  /*
   * Bulut verisi hazırlandıktan sonra yapılan değişiklikler
   * 800 ms gecikmeyle otomatik kaydedilir.
   */
  useEffect(() => {
    if (
      !userId ||
      !isLoaded ||
      cloudSyncState !== "ready"
    ) {
      return;
    }

    if (cloudSaveTimer.current) {
      clearTimeout(cloudSaveTimer.current);
    }

    cloudSaveTimer.current = setTimeout(() => {
      void saveCloudData(
        userId,
        appData,
      ).catch((error) => {
        console.error(
          "Bulut verisi kaydedilemedi:",
          error,
        );
      });
    }, 800);

    return () => {
      if (cloudSaveTimer.current) {
        clearTimeout(cloudSaveTimer.current);
        cloudSaveTimer.current = null;
      }
    };
  }, [
    userId,
    isLoaded,
    cloudSyncState,
    appData,
  ]);

  async function handleLogout() {
    if (cloudSaveTimer.current) {
      clearTimeout(cloudSaveTimer.current);
      cloudSaveTimer.current = null;
    }

    /*
     * Son bulut kaydı takılırsa çıkışın bloke olmaması
     * için en fazla 3 saniye beklenir.
     */
    if (userId && cloudSyncState === "ready") {
      try {
        await Promise.race([
          saveCloudData(userId, appData),
          new Promise<never>((_, reject) => {
            window.setTimeout(() => {
              reject(
                new Error(
                  "Çıkış öncesi bulut kaydı zaman aşımına uğradı.",
                ),
              );
            }, 3000);
          }),
        ]);
      } catch (error) {
        console.error(
          "Çıkış öncesi son kayıt yapılamadı:",
          error,
        );
      }
    }

    try {
      await logout();

      clearLocalData();
      setUserAccount(null);
      setCloudSyncState("idle");
      setCategoryManagerOpen(false);
      setAccountPanelOpen(false);
      setPlanPanelOpen(false);
      setAdminPanelOpen(false);
      setActivePage("cumle");
    } catch (error) {
      console.error(
        "Oturum kapatılamadı:",
        error,
      );
    }
  }

  /*
   * Firebase oturum durumu kontrol edilirken
   * uygulama içeriği gösterilmez.
   */
  if (isAuthLoading) {
    return (
      <main className="app-shell">
        <section className="flex min-h-dvh items-center justify-center px-5">
          <div className="text-center">
            <div className="mb-4 text-5xl">
              🇩🇪
            </div>

            <div className="text-lg font-extrabold">
              Almanca Cümle
            </div>

            <div className="mt-2 text-sm text-[#94a3b8]">
              Oturum kontrol ediliyor...
            </div>

            <div className="mx-auto mt-5 h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#38bdf8]" />
          </div>
        </section>
      </main>
    );
  }

  /*
   * Giriş yapılmadığında yalnızca giriş ekranı görünür.
   * Uygulamanın cümle, kart ve çalışma sayfaları açılmaz.
   */
  if (!user) {
    return (
      <main className="relative min-h-dvh overflow-hidden bg-[#f8f7ff] text-[#241b3a]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-violet-300/35 blur-3xl" />
          <div className="absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-fuchsia-200/45 blur-3xl" />
          <div className="absolute left-1/2 top-[-110px] h-80 w-80 -translate-x-1/2 rounded-full bg-white blur-3xl" />
        </div>

        <section className="relative mx-auto flex min-h-dvh w-full max-w-[560px] items-center px-4 py-7 sm:px-6">
          <div className="w-full overflow-hidden rounded-[32px] border border-white/80 bg-white/85 p-5 shadow-[0_24px_80px_rgba(88,28,135,0.16)] backdrop-blur-2xl sm:p-7">
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[26px] bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-500 shadow-[0_16px_40px_rgba(124,58,237,0.30)]">
                <div className="flex h-[66px] w-[66px] items-center justify-center rounded-[21px] bg-white">
                  <div className="h-8 w-11 overflow-hidden rounded-md border border-black/10 shadow-sm">
                    <div className="h-1/3 bg-black" />
                    <div className="h-1/3 bg-red-600" />
                    <div className="h-1/3 bg-yellow-400" />
                  </div>
                </div>
              </div>

              <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-violet-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Akıllı Almanca Çalışma
              </div>

              <h1 className="text-[30px] font-black tracking-tight text-[#241b3a] sm:text-4xl">
                Almanca Cümle
              </h1>

              <p className="mx-auto mt-3 max-w-md text-[13px] leading-6 text-[#6f6680]">
                Cümlelerini kaydet, akıllı tekrar sistemiyle öğren
                ve tüm cihazlarında kaldığın yerden devam et.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2.5">
              <div className="rounded-2xl border border-violet-100 bg-gradient-to-b from-white to-violet-50 p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-lg">
                  🃏
                </div>
                <div className="mt-2 text-[10px] font-black text-[#34294a]">
                  Akıllı Kartlar
                </div>
                <div className="mt-1 text-[9px] leading-4 text-[#8b8198]">
                  Cümlelerini kolay öğren
                </div>
              </div>

              <div className="rounded-2xl border border-violet-100 bg-gradient-to-b from-white to-violet-50 p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-fuchsia-100 text-lg">
                  🎯
                </div>
                <div className="mt-2 text-[10px] font-black text-[#34294a]">
                  SRS Tekrar
                </div>
                <div className="mt-1 text-[9px] leading-4 text-[#8b8198]">
                  Doğru zamanda tekrar et
                </div>
              </div>

              <div className="rounded-2xl border border-violet-100 bg-gradient-to-b from-white to-violet-50 p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-lg">
                  ☁️
                </div>
                <div className="mt-2 text-[10px] font-black text-[#34294a]">
                  Bulut Kaydı
                </div>
                <div className="mt-1 text-[9px] leading-4 text-[#8b8198]">
                  Her cihazda senkronize
                </div>
              </div>
            </div>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-violet-100" />
              <span className="text-[9px] font-black uppercase tracking-[0.18em] text-[#9a8fac]">
                Güvenli giriş
              </span>
              <div className="h-px flex-1 bg-violet-100" />
            </div>

            <div className="rounded-[22px] border border-violet-100 bg-[#fbfaff] p-3.5 shadow-inner">
              <AuthPanel
                user={null}
                isLoading={isAuthLoading}
                error={authError}
                onLogin={loginWithGoogle}
                onLogout={handleLogout}
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[9px] font-semibold text-[#8b8198]">
              <span>🔒 Verilerin sana özel</span>
              <span>☁️ Bulut senkronizasyonu</span>
              <span>⚡ Hızlı giriş</span>
            </div>

            <p className="mx-auto mt-4 max-w-md text-center text-[9px] leading-4 text-[#a59bad]">
              Devam ederek cümlelerinin hesabına özel olarak
              bulutta saklanmasını kabul etmiş olursun.
            </p>
          </div>
        </section>
      </main>
    );
  }

  /*
   * Yerel ve bulut verileri hazırlanırken uygulama
   * içeriğinin kısa süreli yanlış görünmesi engellenir.
   */
  if (
    !isLoaded ||
    cloudSyncState === "idle" ||
    cloudSyncState === "loading"
  ) {
    return (
      <main className="app-shell">
        <section className="flex min-h-dvh items-center justify-center px-5">
          <div className="text-center">
            <div className="mb-4 text-5xl">
              ☁️
            </div>

            <div className="text-lg font-extrabold">
              Verilerin hazırlanıyor
            </div>

            <div className="mt-2 text-sm text-[#94a3b8]">
              Hesabın ve bulut kayıtların yükleniyor...
            </div>

            <div className="mx-auto mt-5 h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#38bdf8]" />
          </div>
        </section>
      </main>
    );
  }

  if (cloudSyncState === "error") {
    return (
      <main className="app-shell">
        <section className="flex min-h-dvh items-center justify-center px-4">
          <div className="app-card w-full text-center">
            <div className="mb-3 text-4xl">
              ⚠️
            </div>

            <div className="text-lg font-extrabold">
              Bulut verileri yüklenemedi
            </div>

            <p className="mt-2 text-xs leading-5 text-[#94a3b8]">
              İnternet bağlantını kontrol edip
              tekrar deneyebilirsin.
            </p>

            <button
              type="button"
              onClick={() =>
                setCloudReloadKey(
                  (current) => current + 1,
                )
              }
              className="app-button app-button-primary mt-4"
            >
              🔄 Tekrar Dene
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="app-button app-button-secondary mt-2"
            >
              Çıkış Yap
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <AppHeader
        title={PAGE_TITLES[activePage]}
        dueCount={totalDue}
        onAccountClick={() =>
          setAccountPanelOpen(true)
        }
        isAdmin={isAdmin}
        onAdminClick={() =>
          setAdminPanelOpen(true)
        }
        userPhotoUrl={user.photoURL}
        userName={user.displayName}
        planLabel={
          effectiveAccess?.level === "pro"
            ? "PRO"
            : "FREE"
        }
      />

      {previewPlan && (
        <div className="flex items-center justify-between gap-3 border-b border-amber-400/20 bg-amber-400/[0.08] px-4 py-2">
          <span className="text-[10px] font-extrabold text-amber-200">
            🧪 Test modu:{" "}
            {previewPlan.toUpperCase()}
          </span>

          <button
            type="button"
            onClick={clearPlanPreview}
            className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[9px] font-black text-amber-200"
          >
            Gerçek plana dön
          </button>
        </div>
      )}

      <section className="app-content">
        {activePage === "cumle" && (
          <SentenceForm
            categories={appData.categories}
            onSave={addSentence}
            accessLevel={accessLevel}
            onOpenPlans={() =>
              setPlanPanelOpen(true)
            }
          />
        )}

        {activePage === "kart" && (
          <SentenceCards
            categories={appData.categories}
            sentences={appData.sentences}
          />
        )}

        {activePage === "study" && (
          <StudyPanel
            categories={appData.categories}
            sentences={appData.sentences}
            onRate={rateSentence}
          />
        )}

        {activePage === "stat" && (
          <StatisticsPanel
            categories={appData.categories}
            sentences={appData.sentences}
            accessLevel={accessLevel}
            onOpenPlans={() =>
              setPlanPanelOpen(true)
            }
          />
        )}

        {activePage === "liste" && (
          <>
            <button
              type="button"
              onClick={() =>
                setCategoryManagerOpen(true)
              }
              className="mb-3 flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#1e293b] px-3 py-2.5 text-left"
            >
              <span className="text-xs font-extrabold">
                ⚙️ Kategori ve Alt Kategori
                Yönetimi
              </span>

              <span className="text-xs text-[#38bdf8]">
                Aç ›
              </span>
            </button>

            <SentenceList
              categories={appData.categories}
              sentences={appData.sentences}
              onDelete={deleteSentence}
              onDeleteMany={deleteSentences}
              onMoveMany={moveSentences}
              onUpdate={updateSentence}
            />
          </>
        )}
      </section>

      <BottomNavigation
        activePage={activePage}
        dueCount={totalDue}
        onChange={setActivePage}
      />

      <AccountPanel
        isOpen={accountPanelOpen}
        user={user}
        account={userAccount}
        access={effectiveAccess}
        appData={appData}
        planLimits={planLimits}
        onClose={() =>
          setAccountPanelOpen(false)
        }
        onLogout={handleLogout}
        onOpenPlans={() => {
          setAccountPanelOpen(false);
          setPlanPanelOpen(true);
        }}
        onResetProgress={
          resetStudyProgress
        }
        onApplyData={replaceAppData}
      />

      <PlanPanel
        isOpen={planPanelOpen}
        access={effectiveAccess}
        settings={settings}
        userId={user.uid}
        userEmail={user.email}
        userName={user.displayName}
        onClose={() =>
          setPlanPanelOpen(false)
        }
      />

      {isAdmin && (
        <AdminPanel
          isOpen={adminPanelOpen}
          user={user}
          onClose={() =>
            setAdminPanelOpen(false)
          }
          onSettingsChanged={() => {
            void reloadSettings();
          }}
        />
      )}

      <CategoryManager
        isOpen={categoryManagerOpen}
        categories={appData.categories}
        sentences={appData.sentences}
        onClose={() =>
          setCategoryManagerOpen(false)
        }
        onAddCategory={addCategory}
        onUpdateCategory={updateCategory}
        onDeleteCategory={deleteCategory}
        onAddSubcategory={addSubcategory}
        onRenameSubcategory={
          renameSubcategory
        }
        onDeleteSubcategory={
          deleteSubcategory
        }
        onAddSubsubcategory={
          addSubsubcategory
        }
        onRenameSubsubcategory={
          renameSubsubcategory
        }
        onDeleteSubsubcategory={
          deleteSubsubcategory
        }
        onMoveSubcategories={
          moveSubcategories
        }
        onResetCategorySrs={
          resetCategorySrs
        }
        onResetSubcategorySrs={
          resetSubcategorySrs
        }
        onResetSubsubcategorySrs={
          resetSubsubcategorySrs
        }
      />
    </main>
  );
}