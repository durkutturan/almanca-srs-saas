"use client";

import { useEffect, useMemo } from "react";
import type { UserAccess } from "@/lib/cloudData";

type PlanPanelProps = {
  isOpen: boolean;
  access: UserAccess | null;
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  onClose: () => void;
};

const FREE_FEATURES = [
  "100 cümle",
  "5 kategori",
  "Kategori başına 10 alt kategori",
  "Bulut senkronizasyonu",
  "Tekli cümle ekleme",
  "Temel çalışma modları",
  "Kişisel JSON yedeği",
];

const PRO_FEATURES = [
  "Sınırsız cümle",
  "Sınırsız kategori ve alt kategori",
  "Toplu cümle ekleme",
  "Cümle paketi paylaşma",
  "Excel / CSV dışa aktarma",
  "PDF raporu",
  "Gelişmiş istatistikler",
  "Yeni Pro özelliklerine erişim",
];

const PRO_PRICE_LABEL =
  process.env.NEXT_PUBLIC_PRO_PRICE_LABEL?.trim() ||
  "100 TL / ay";

function createCheckoutUrl({
  userId,
  userEmail,
  userName,
}: {
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
}) {
  const checkoutBaseUrl =
    process.env
      .NEXT_PUBLIC_LEMON_SQUEEZY_CHECKOUT_URL
      ?.trim();

  if (
    !checkoutBaseUrl ||
    !userId
  ) {
    return null;
  }

  let checkoutUrl: URL;

  try {
    checkoutUrl = new URL(
      checkoutBaseUrl,
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
  userId,
  userEmail,
  userName,
  onClose,
}: PlanPanelProps) {
  const checkoutUrl = useMemo(
    () =>
      createCheckoutUrl({
        userId,
        userEmail,
        userName,
      }),
    [
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
    access?.reason === "subscription";

  const isTrial =
    access?.trialActive === true;

  return (
    <div
      className="fixed inset-0 z-[220] flex items-end justify-center bg-black/75 px-3 pt-8 backdrop-blur-sm sm:items-center sm:py-6"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
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
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm transition hover:bg-white/10"
            aria-label="Plan ekranını kapat"
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
                {access.trialDaysLeft} günlük Pro
                kullanım hakkın kaldı. Deneme
                bitmeden aylık Pro aboneliğini
                başlatabilirsin.
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <article className="rounded-[22px] border border-white/10 bg-[#1e293b] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-black">
                    Free
                  </div>

                  <div className="mt-1 text-[10px] text-[#94a3b8]">
                    Temel çalışma için
                  </div>
                </div>

                <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-black text-[#cbd5e1]">
                  ÜCRETSİZ
                </span>
              </div>

              <div className="my-4 h-px bg-white/10" />

              <div className="space-y-2">
                {FREE_FEATURES.map(
                  (feature) => (
                    <div
                      key={feature}
                      className="flex items-start gap-2 text-[11px] leading-4 text-[#cbd5e1]"
                    >
                      <span className="mt-0.5 text-emerald-400">
                        ✓
                      </span>

                      <span>{feature}</span>
                    </div>
                  ),
                )}
              </div>

              <button
                type="button"
                disabled={
                  access?.level === "free"
                }
                onClick={onClose}
                className="mt-5 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs font-extrabold text-[#cbd5e1] disabled:cursor-default disabled:opacity-60"
              >
                {access?.level === "free"
                  ? "Mevcut Planın"
                  : "Free Plana Geçiş Sonra Eklenecek"}
              </button>
            </article>

            <article className="relative overflow-hidden rounded-[22px] border border-amber-400/25 bg-gradient-to-b from-amber-400/[0.12] to-[#1e293b] p-4 shadow-[0_16px_50px_rgba(245,158,11,0.08)]">
              <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-amber-400/10 blur-3xl" />

              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-black text-amber-200">
                      Pro
                    </div>

                    <div className="mt-1 text-[10px] text-amber-100/70">
                      {PRO_PRICE_LABEL}
                    </div>
                  </div>

                  <span className="rounded-lg border border-amber-400/25 bg-amber-400/10 px-2 py-1 text-[9px] font-black text-amber-300">
                    EN İYİ
                  </span>
                </div>

                <div className="my-4 h-px bg-amber-300/15" />

                <div className="space-y-2">
                  {PRO_FEATURES.map(
                    (feature) => (
                      <div
                        key={feature}
                        className="flex items-start gap-2 text-[11px] leading-4 text-[#f8fafc]"
                      >
                        <span className="mt-0.5 text-amber-300">
                          ✓
                        </span>

                        <span>{feature}</span>
                      </div>
                    ),
                  )}
                </div>

                {isPaidPro ? (
                  <button
                    type="button"
                    disabled
                    className="mt-5 w-full cursor-default rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-3 text-xs font-black text-emerald-300"
                  >
                    👑 Pro Planın Aktif
                  </button>
                ) : checkoutUrl ? (
                  <a
                    href={checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 block w-full rounded-xl border border-amber-400/30 bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-3 text-center text-xs font-black text-white shadow-lg transition hover:brightness-110 active:scale-[0.99]"
                  >
                    💳 Aylık Pro’ya Geç
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="mt-5 w-full cursor-not-allowed rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-3 text-xs font-black text-rose-300"
                  >
                    Ödeme ayarları eksik
                  </button>
                )}
              </div>
            </article>
          </div>

          {!checkoutUrl && !isPaidPro && (
            <div className="mt-3 rounded-2xl border border-rose-400/15 bg-rose-500/[0.06] px-4 py-3">
              <div className="text-xs font-black text-rose-300">
                ⚠️ Checkout bağlantısı oluşturulamadı
              </div>

              <p className="mt-1 text-[10px] leading-4 text-[#94a3b8]">
                .env.local içindeki gerçek Lemon Squeezy
                checkout bağlantısını kontrol edip
                geliştirme sunucusunu yeniden başlat.
              </p>
            </div>
          )}

          <div className="mt-3 rounded-2xl border border-sky-400/15 bg-sky-400/[0.05] px-4 py-3">
            <div className="text-xs font-black text-[#38bdf8]">
              🔒 Verilerin güvende
            </div>

            <p className="mt-1 text-[10px] leading-4 text-[#94a3b8]">
              Plan değişiklikleri cümlelerini,
              kategorilerini veya çalışma geçmişini
              silmez. Free limite geçildiğinde mevcut
              veriler korunur; yalnızca yeni eklemeler
              sınırlanır.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}