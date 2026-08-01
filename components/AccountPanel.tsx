"use client";

import {
  useEffect,
  useMemo,
} from "react";
import type { User } from "firebase/auth";
import DataTools from "@/components/DataTools";
import type {
  UserAccess,
  UserAccount,
} from "@/lib/cloudData";
import {
  getLimitLabel,
  type PlanLimits,
} from "@/lib/planLimits";
import type { AppData } from "@/types/app";

type AccountPanelProps = {
  isOpen: boolean;
  user: User;
  account: UserAccount | null;
  access: UserAccess | null;
  appData: AppData;
  planLimits: PlanLimits;
  onClose: () => void;
  onLogout: () => void | Promise<void>;
  onOpenPlans: () => void;
  onResetProgress: () => void;
  onApplyData: (data: AppData) => void;
};

function getUserInitials(
  displayName: string | null,
  email: string | null,
) {
  const source =
    displayName?.trim() ||
    email?.trim() ||
    "Kullanıcı";

  const words = source
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 1) {
    return words[0]
      .slice(0, 1)
      .toLocaleUpperCase("tr-TR");
  }

  return `${words[0][0]}${
    words[words.length - 1][0]
  }`.toLocaleUpperCase("tr-TR");
}

function getPlanTitle(
  access: UserAccess | null,
) {
  if (
    access?.reason === "subscription"
  ) {
    return "Pro Plan";
  }

  if (access?.trialActive) {
    return "Pro Deneme";
  }

  return "Free Plan";
}

function getPlanDescription(
  access: UserAccess | null,
) {
  if (
    access?.reason === "subscription"
  ) {
    return "Pro aboneliğin aktif.";
  }

  if (access?.trialActive) {
    return `${access.trialDaysLeft} günlük Pro kullanım hakkın kaldı.`;
  }

  return "Temel özelliklerle devam ediyorsun.";
}

export default function AccountPanel({
  isOpen,
  user,
  account,
  access,
  appData,
  planLimits,
  onClose,
  onLogout,
  onOpenPlans,
  onResetProgress,
  onApplyData,
}: AccountPanelProps) {
  const userName =
    account?.displayName ||
    user.displayName ||
    "Kullanıcı";

  const userEmail =
    account?.email ||
    user.email ||
    "";

  const userPhoto =
    account?.photoURL ||
    user.photoURL ||
    null;

  const isPro =
    access?.level === "pro";

  const sentenceUsage = useMemo(
    () =>
      getLimitLabel(
        appData.sentences.length,
        planLimits.maxSentences,
      ),
    [
      appData.sentences.length,
      planLimits.maxSentences,
    ],
  );

  const categoryUsage = useMemo(
    () =>
      getLimitLabel(
        appData.categories.length,
        planLimits.maxCategories,
      ),
    [
      appData.categories.length,
      planLimits.maxCategories,
    ],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function closeWithEscape(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      closeWithEscape,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        closeWithEscape,
      );
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[160] flex justify-end bg-black/70 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <aside className="flex h-dvh w-full max-w-[600px] flex-col border-l border-white/10 bg-[#0f172a] shadow-2xl">
        <header className="flex min-h-[58px] shrink-0 items-center justify-between border-b border-white/10 bg-[#1e293b] px-4 py-3">
          <div>
            <h2 className="text-base font-black">
              👤 Hesap ve Ayarlar
            </h2>

            <p className="mt-0.5 text-[10px] text-[#94a3b8]">
              Hesap, plan ve veri yönetimi
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm transition hover:bg-white/10"
            aria-label="Hesap ekranını kapat"
          >
            ✕
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          <section className="overflow-hidden rounded-[22px] border border-white/10 bg-[#1e293b] shadow-lg">
            <div className="relative overflow-hidden px-4 pb-4 pt-5">
              <div className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full bg-sky-400/10 blur-2xl" />

              <div className="relative flex items-center gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[20px] border border-white/10 bg-[#0f172a] text-lg font-black shadow-lg">
                  {userPhoto ? (
                    <img
                      src={userPhoto}
                      alt={userName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getUserInitials(
                      userName,
                      userEmail,
                    )
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-black text-[#f8fafc]">
                    {userName}
                  </div>

                  <div className="mt-1 truncate text-[11px] text-[#94a3b8]">
                    {userEmail}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={[
                        "rounded-lg border px-2 py-1 text-[9px] font-black",
                        isPro
                          ? "border-amber-400/25 bg-amber-400/10 text-amber-300"
                          : "border-white/10 bg-white/5 text-[#cbd5e1]",
                      ].join(" ")}
                    >
                      {isPro
                        ? "👑 PRO"
                        : "🆓 FREE"}
                    </span>

                    <span className="text-[10px] text-[#94a3b8]">
                      Bulut senkronizasyonu aktif
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-3 rounded-[22px] border border-white/10 bg-[#1e293b] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-black">
                  {getPlanTitle(access)}
                </div>

                <div className="mt-1 text-[10px] leading-4 text-[#94a3b8]">
                  {getPlanDescription(access)}
                </div>
              </div>

              <span className="shrink-0 text-2xl">
                {access?.reason ===
                "subscription"
                  ? "👑"
                  : access?.trialActive
                    ? "✨"
                    : "🆓"}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-white/[0.08] bg-[#0f172a] p-3">
                <div className="text-[9px] font-extrabold uppercase tracking-wide text-[#64748b]">
                  Cümleler
                </div>

                <div className="mt-1 text-sm font-black text-[#38bdf8]">
                  {sentenceUsage}
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-[#0f172a] p-3">
                <div className="text-[9px] font-extrabold uppercase tracking-wide text-[#64748b]">
                  Kategoriler
                </div>

                <div className="mt-1 text-sm font-black text-[#c084fc]">
                  {categoryUsage}
                </div>
              </div>
            </div>

            {access?.trialActive && (
              <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.07] px-3 py-2.5 text-[10px] leading-4 text-amber-200">
                Deneme süren bitince hesabın
                otomatik olarak Free plana geçer.
                Mevcut verilerin silinmez.
              </div>
            )}

            {!isPro && (
              <button
                type="button"
                onClick={onOpenPlans}
                className="mt-3 w-full rounded-xl border border-amber-400/25 bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-3 py-3 text-xs font-black text-amber-200 transition hover:from-amber-500/25 hover:to-orange-500/25"
              >
                👑 Pro Planı İncele
              </button>
            )}
          </section>

          <section className="mt-3">
            <DataTools
              appData={appData}
              accessLevel={
                access?.level ?? "free"
              }
              onOpenPlans={onOpenPlans}
              onResetProgress={
                onResetProgress
              }
              onApplyData={onApplyData}
            />
          </section>

          <section className="mt-3 rounded-[22px] border border-white/10 bg-[#1e293b] p-3">
            <div className="mb-2 px-1 text-[10px] font-extrabold uppercase tracking-wider text-[#64748b]">
              Hesap
            </div>

            <button
              type="button"
              onClick={() =>
                void onLogout()
              }
              className="flex w-full items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-3 text-left transition hover:bg-rose-500/15"
            >
              <span>
                <span className="block text-xs font-extrabold text-[#f43f5e]">
                  🚪 Çıkış Yap
                </span>

                <span className="mt-0.5 block text-[9px] text-[#94a3b8]">
                  Verilerin bulutta korunur
                </span>
              </span>

              <span className="text-xs text-[#f43f5e]">
                Çık ›
              </span>
            </button>
          </section>

          <div className="px-3 py-5 text-center text-[9px] text-[#475569]">
            Almanca Cümle SRS Pro
          </div>
        </div>
      </aside>
    </div>
  );
}
