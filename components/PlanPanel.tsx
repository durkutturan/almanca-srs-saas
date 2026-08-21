"use client";

import {
  useEffect,
  useMemo,
} from "react";
import type { UserAccess } from "@/lib/cloudData";
import type { AppSettings } from "@/lib/appSettings";

type PlanPanelProps = {
  isOpen: boolean;
  access: UserAccess | null;
  settings: AppSettings;
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  onClose: () => void;
};

function createCheckoutUrl({
  baseUrl,
  userId,
  userEmail,
  userName,
}: {
  baseUrl: string;
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
}) {
  if (!baseUrl.trim() || !userId) {
    return null;
  }

  let checkoutUrl: URL;

  try {
    checkoutUrl = new URL(
      baseUrl.trim(),
    );
  } catch {
    return null;
  }

  checkoutUrl.searchParams.set(
    "checkout[custom][user_id]",
    userId,
  );

  if (userEmail?.trim()) {
    checkoutUrl.searchParams.set(
      "checkout[email]",
      userEmail.trim(),
    );
  }

  if (userName?.trim()) {
    checkoutUrl.searchParams.set(
      "checkout[name]",
      userName.trim(),
    );
  }

  checkoutUrl.searchParams.set(
    "checkout[billing_address][country]",
    "TR",
  );

  return checkoutUrl.toString();
}

export default function PlanPanel({
  isOpen,
  access,
  settings,
  userId,
  userEmail,
  userName,
  onClose,
}: PlanPanelProps) {
  const checkoutUrl = useMemo(
    () =>
      createCheckoutUrl({
        baseUrl:
          settings.checkoutUrl,
        userId,
        userEmail,
        userName,
      }),
    [
      settings.checkoutUrl,
      userId,
      userEmail,
      userName,
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

  const isPaidPro =
    access?.reason ===
    "subscription";

  const isManualPro =
    access?.reason === "manual";

  const isTrial =
    access?.trialActive === true;

  const freeFeatures = [
    `${settings.freeLimits.maxSentences} cümle`,
    `${settings.freeLimits.maxCategories} kategori`,
    `Kategori başına ${settings.freeLimits.maxSubcategoriesPerCategory} alt kategori`,
    "Bulut senkronizasyonu",
    "Tekli cümle ekleme",
    "Temel çalışma modları",
    "Kişisel JSON yedeği",
  ];

  const proFeatures = [
    "Sınırsız cümle",
    "Sınırsız kategori ve alt kategori",
    "Toplu cümle ekleme",
    "Cümle paketi paylaşma",
    "Excel / CSV dışa aktarma",
    "PDF raporu",
    "Gelişmiş istatistikler",
    "Yeni Pro özelliklerine erişim",
  ];

  return (
    <div className="fixed inset-0 z-[220] flex items-end justify-center bg-black/75 px-3 pt-8 backdrop-blur-sm sm:items-center sm:py-6">
      <section className="flex max-h-[calc(100dvh-32px)] w-full max-w-[560px] flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-[#0f172a] shadow-2xl sm:rounded-[28px]">
        <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#1e293b] px-4 py-3">
          <div>
            <h2 className="text-base font-black">
              👑 Planları Karşılaştır
            </h2>
            <p className="mt-0.5 text-[10px] text-[#94a3b8]">
              İhtiyacına uygun planı seç
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5"
          >
            ✕
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {isTrial && (
            <div className="mb-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.07] px-4 py-3">
              <div className="text-xs font-black text-amber-300">
                ✨ Pro denemen aktif
              </div>
              <div className="mt-1 text-[10px] leading-4 text-amber-100/80">
                {access.trialDaysLeft} günlük Pro kullanım hakkın kaldı.
              </div>
            </div>
          )}

          {isManualPro && (
            <div className="mb-3 rounded-2xl border border-violet-400/20 bg-violet-400/[0.07] px-4 py-3">
              <div className="text-xs font-black text-violet-300">
                🎁 Manuel Pro aktif
              </div>
              <div className="mt-1 text-[10px] leading-4 text-violet-100/80">
                {access.manualDaysLeft} gün kaldı.
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <article className="rounded-[22px] border border-white/10 bg-[#1e293b] p-4">
              <div className="text-lg font-black">
                Free
              </div>
              <div className="mt-1 text-[10px] text-[#94a3b8]">
                Temel çalışma için
              </div>

              <div className="my-4 h-px bg-white/10" />

              <div className="space-y-2">
                {freeFeatures.map(
                  (feature) => (
                    <div
                      key={feature}
                      className="flex gap-2 text-[11px] text-[#cbd5e1]"
                    >
                      <span className="text-emerald-400">
                        ✓
                      </span>
                      <span>{feature}</span>
                    </div>
                  ),
                )}
              </div>
            </article>

            <article className="rounded-[22px] border border-amber-400/25 bg-gradient-to-b from-amber-400/[0.12] to-[#1e293b] p-4">
              <div className="text-lg font-black text-amber-200">
                {settings.proTitle}
              </div>

              <div className="mt-1 text-[10px] text-amber-100/70">
                {settings.priceLabel}
              </div>

              {settings.trialEnabled &&
                settings.trialDays > 0 &&
                !isPaidPro &&
                !isManualPro && (
                  <div className="mt-2 inline-flex rounded-lg border border-sky-400/20 bg-sky-400/10 px-2 py-1 text-[9px] font-black text-sky-200">
                    🎁 {settings.trialDays} gün ücretsiz Pro deneme
                  </div>
                )}

              <div className="mt-2 text-[10px] text-amber-100/60">
                {settings.proDescription}
              </div>

              <div className="my-4 h-px bg-amber-300/15" />

              <div className="space-y-2">
                {proFeatures.map(
                  (feature) => (
                    <div
                      key={feature}
                      className="flex gap-2 text-[11px] text-[#f8fafc]"
                    >
                      <span className="text-amber-300">
                        ✓
                      </span>
                      <span>{feature}</span>
                    </div>
                  ),
                )}
              </div>

              {isPaidPro ||
              isManualPro ? (
                <button
                  type="button"
                  disabled
                  className="mt-5 w-full rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-3 text-xs font-black text-emerald-300"
                >
                  👑 Pro Planın Aktif
                </button>
              ) : checkoutUrl ? (
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 block w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-3 text-center text-xs font-black text-white"
                >
                  {
                    settings.purchaseButtonLabel
                  }
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="mt-5 w-full rounded-xl bg-rose-500/10 px-3 py-3 text-xs font-black text-rose-300"
                >
                  Ödeme ayarları eksik
                </button>
              )}
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}