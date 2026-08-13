"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import AccountPanel from "@/components/AccountPanel";
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
import {
  ensureUserAccount,
  getUserAccess,
  loadCloudData,
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
        }
      : previewPlan === "pro"
        ? {
            level: "pro",
            reason: "subscription",
            trialActive: false,
            trialDaysLeft: 0,
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
    rateSentence,
    addCategory,
    updateCategory,
    deleteCategory,
    addSubcategory,
    renameSubcategory,
    deleteSubcategory,
    resetStudyProgress,
    resetCategorySrs,
    resetSubcategorySrs,
    replaceAppData,
    clearLocalData,
    totalDue,
    planLimits,
  } = useAppData(accessLevel);

  const latestAppDataRef = useRef(appData);

  const {
    user,
    isAuthLoading,
    authError,
    loginWithGoogle,
    logout,
  } = useAuth();

  const userId = user?.uid ?? null;

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
      try {
        /*
         * İlk girişte hesap profili ve 14 günlük
         * Pro deneme süresi oluşturulur. Mevcut
         * kullanıcıların deneme tarihi yeniden başlamaz.
         */
        const account =
          await ensureUserAccount(currentUser);

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
      } catch (error) {
        console.error(
          "Hesap veya bulut verileri yüklenemedi:",
          error,
        );

        if (!cancelled) {
          setUserAccount(null);
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
     * Çıkıştan hemen önce son değişiklikleri buluta gönder.
     * Firestore kaydı takılırsa çıkışın sonsuza kadar
     * beklememesi için en fazla 3 saniye beklenir.
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
      <main className="app-shell">
        <section className="flex min-h-dvh flex-col justify-center px-4 py-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[24px] border border-sky-400/20 bg-sky-400/10 text-4xl shadow-[0_12px_40px_rgba(56,189,248,0.12)]">
              🇩🇪
            </div>

            <h1 className="text-2xl font-black text-[#f8fafc]">
              Almanca Cümle
            </h1>

            <p className="mt-2 text-sm leading-6 text-[#94a3b8]">
              Cümlelerini kaydet, kartlarla çalış
              ve ilerlemeni bütün cihazlarında
              senkronize et.
            </p>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-white/10 bg-[#1e293b] p-3 text-center">
              <div className="text-xl">🃏</div>
              <div className="mt-1 text-[10px] font-extrabold">
                Akıllı Kartlar
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#1e293b] p-3 text-center">
              <div className="text-xl">🎯</div>
              <div className="mt-1 text-[10px] font-extrabold">
                SRS Çalışma
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#1e293b] p-3 text-center">
              <div className="text-xl">☁️</div>
              <div className="mt-1 text-[10px] font-extrabold">
                Bulut Kaydı
              </div>
            </div>
          </div>

          <AuthPanel
            user={null}
            isLoading={isAuthLoading}
            error={authError}
            onLogin={loginWithGoogle}
            onLogout={handleLogout}
          />

          <p className="mt-5 text-center text-[10px] leading-4 text-[#64748b]">
            Devam ederek cümlelerinin hesabına
            özel olarak bulutta saklanmasını kabul
            etmiş olursun.
          </p>
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
        userId={user.uid}
        userEmail={user.email}
        userName={user.displayName}
        onClose={() =>
          setPlanPanelOpen(false)
        }
      />

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
        onResetCategorySrs={
          resetCategorySrs
        }
        onResetSubcategorySrs={
          resetSubcategorySrs
        }
      />
    </main>
  );
}