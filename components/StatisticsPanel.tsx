"use client";

import {
  useMemo,
  useState,
} from "react";
import {
  canUseFeature,
  getFeatureLabel,
  type AccessLevel,
} from "@/lib/planLimits";
import type {
  Category,
  Sentence,
} from "@/types/app";

type StatisticsPanelProps = {
  categories: Category[];
  sentences: Sentence[];
  accessLevel?: AccessLevel;
  onOpenPlans?: () => void;
};

function getSentenceStatus(
  sentence: Sentence,
) {
  const now = Date.now();

  if (sentence.srs.reps === 0) {
    return "new";
  }

  if (sentence.srs.due <= now) {
    return "due";
  }

  if (sentence.srs.reps >= 3) {
    return "learned";
  }

  return "learning";
}

export default function StatisticsPanel({
  categories,
  sentences,
  accessLevel = "pro",
  onOpenPlans,
}: StatisticsPanelProps) {
  const [showProLock, setShowProLock] =
    useState(false);

  const hasAdvancedAccess =
    canUseFeature(
      accessLevel,
      "advancedStatistics",
    );

  const statistics = useMemo(() => {
    const newCount = sentences.filter(
      (sentence) =>
        getSentenceStatus(sentence) === "new",
    ).length;

    const dueCount = sentences.filter(
      (sentence) =>
        getSentenceStatus(sentence) === "due",
    ).length;

    const learningCount = sentences.filter(
      (sentence) =>
        getSentenceStatus(sentence) ===
        "learning",
    ).length;

    const learnedCount = sentences.filter(
      (sentence) =>
        getSentenceStatus(sentence) ===
        "learned",
    ).length;

    const totalReviews = sentences.reduce(
      (total, sentence) =>
        total + sentence.srs.reps,
      0,
    );

    const totalLapses = sentences.reduce(
      (total, sentence) =>
        total + sentence.srs.lapses,
      0,
    );

    const successRate =
      totalReviews > 0
        ? Math.max(
            0,
            Math.round(
              ((totalReviews - totalLapses) /
                totalReviews) *
                100,
            ),
          )
        : 0;

    const progress =
      sentences.length > 0
        ? Math.round(
            (learnedCount /
              sentences.length) *
              100,
          )
        : 0;

    return {
      total: sentences.length,
      newCount,
      dueCount,
      learningCount,
      learnedCount,
      totalReviews,
      totalLapses,
      successRate,
      progress,
    };
  }, [sentences]);

  function openAdvancedStatistics() {
    if (hasAdvancedAccess) {
      return;
    }

    setShowProLock(true);
  }

  function openPlans() {
    setShowProLock(false);
    onOpenPlans?.();
  }

  return (
    <>
      <section>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-white/10 bg-[#1e293b] p-3.5 text-center">
            <div className="text-2xl font-black text-[#eab308]">
              {statistics.total}
            </div>

            <div className="mt-1 text-[10px] font-extrabold text-[#94a3b8]">
              📦 TOPLAM CÜMLE
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#1e293b] p-3.5 text-center">
            <div className="text-2xl font-black text-[#10b981]">
              {statistics.learnedCount}
            </div>

            <div className="mt-1 text-[10px] font-extrabold text-[#94a3b8]">
              🏆 ÖĞRENİLEN
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#1e293b] p-3.5 text-center">
            <div className="text-2xl font-black text-[#38bdf8]">
              {statistics.newCount}
            </div>

            <div className="mt-1 text-[10px] font-extrabold text-[#94a3b8]">
              🆕 YENİ CÜMLE
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#1e293b] p-3.5 text-center">
            <div className="text-2xl font-black text-[#f43f5e]">
              {statistics.dueCount}
            </div>

            <div className="mt-1 text-[10px] font-extrabold text-[#94a3b8]">
              🔴 TEKRAR BEKLİYOR
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-white/10 bg-[#1e293b] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-extrabold">
                🎯 Genel İlerleme
              </div>

              <div className="mt-0.5 text-[10px] text-[#94a3b8]">
                Öğrenilen cümlelerin toplam
                cümlelere oranı
              </div>
            </div>

            <div className="text-xl font-black text-[#10b981]">
              %{statistics.progress}
            </div>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-black/30">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#10b981,#38bdf8)] transition-all duration-500"
              style={{
                width: `${statistics.progress}%`,
              }}
            />
          </div>
        </div>

        {hasAdvancedAccess ? (
          <>
            <div className="mt-3 rounded-2xl border border-white/10 bg-[#1e293b] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-extrabold">
                    📈 Ayrıntılı Analiz
                  </div>

                  <div className="mt-0.5 text-[10px] text-[#94a3b8]">
                    Tekrar, unutma ve başarı
                    verilerin
                  </div>
                </div>

                <span className="rounded-md border border-amber-400/25 bg-amber-400/10 px-1.5 py-0.5 text-[8px] font-black text-amber-300">
                  PRO
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-black/20 p-2.5">
                  <div className="text-lg font-extrabold text-[#a855f7]">
                    {statistics.learningCount}
                  </div>

                  <div className="text-[10px] font-bold text-[#94a3b8]">
                    📖 Öğreniliyor
                  </div>
                </div>

                <div className="rounded-xl bg-black/20 p-2.5">
                  <div className="text-lg font-extrabold text-[#38bdf8]">
                    {statistics.totalReviews}
                  </div>

                  <div className="text-[10px] font-bold text-[#94a3b8]">
                    🔁 Toplam tekrar
                  </div>
                </div>

                <div className="rounded-xl bg-black/20 p-2.5">
                  <div className="text-lg font-extrabold text-[#f43f5e]">
                    {statistics.totalLapses}
                  </div>

                  <div className="text-[10px] font-bold text-[#94a3b8]">
                    ❌ Unutulan
                  </div>
                </div>

                <div className="rounded-xl bg-black/20 p-2.5">
                  <div className="text-lg font-extrabold text-[#10b981]">
                    %{statistics.successRate}
                  </div>

                  <div className="text-[10px] font-bold text-[#94a3b8]">
                    ✅ Başarı oranı
                  </div>
                </div>
              </div>
            </div>

            <div className="section-title mt-5 flex items-center justify-between">
              <span>
                📁 Kategori İstatistikleri
              </span>

              <span className="rounded-md border border-amber-400/25 bg-amber-400/10 px-1.5 py-0.5 text-[8px] font-black text-amber-300">
                PRO
              </span>
            </div>

            <div className="space-y-2.5">
              {categories.map((category) => {
                const categorySentences =
                  sentences.filter(
                    (sentence) =>
                      sentence.cat ===
                      category.name,
                  );

                if (
                  categorySentences.length === 0
                ) {
                  return null;
                }

                const learnedCount =
                  categorySentences.filter(
                    (sentence) =>
                      getSentenceStatus(
                        sentence,
                      ) === "learned",
                  ).length;

                const dueCount =
                  categorySentences.filter(
                    (sentence) =>
                      getSentenceStatus(
                        sentence,
                      ) === "due",
                  ).length;

                const newCount =
                  categorySentences.filter(
                    (sentence) =>
                      getSentenceStatus(
                        sentence,
                      ) === "new",
                  ).length;

                const progress = Math.round(
                  (learnedCount /
                    categorySentences.length) *
                    100,
                );

                return (
                  <div
                    key={category.name}
                    className="rounded-2xl border border-white/10 bg-[#1e293b] p-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5 text-xl">
                        {category.icon || "📁"}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate text-sm font-extrabold">
                            {category.name}
                          </div>

                          <div className="shrink-0 text-xs font-black text-[#10b981]">
                            %{progress}
                          </div>
                        </div>

                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <span className="rounded-md bg-white/5 px-1.5 py-1 text-[9px] font-bold text-[#94a3b8]">
                            📦{" "}
                            {
                              categorySentences.length
                            }
                          </span>

                          <span className="rounded-md bg-emerald-500/10 px-1.5 py-1 text-[9px] font-bold text-[#10b981]">
                            🏆 {learnedCount}
                          </span>

                          {newCount > 0 && (
                            <span className="rounded-md bg-sky-400/10 px-1.5 py-1 text-[9px] font-bold text-[#38bdf8]">
                              🆕 {newCount}
                            </span>
                          )}

                          {dueCount > 0 && (
                            <span className="rounded-md bg-rose-500/10 px-1.5 py-1 text-[9px] font-bold text-[#f43f5e]">
                              🔴 {dueCount}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/30">
                          <div
                            className="h-full rounded-full bg-[linear-gradient(90deg,#a855f7,#10b981)]"
                            style={{
                              width: `${progress}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={openAdvancedStatistics}
            className="relative mt-3 block w-full overflow-hidden rounded-2xl border border-amber-400/20 bg-[#1e293b] p-4 text-left shadow-lg"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-400/[0.08] via-transparent to-purple-500/[0.08]" />

            <div className="relative flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-2xl">
                👑
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black">
                    Gelişmiş İstatistikler
                  </span>

                  <span className="rounded-md border border-amber-400/25 bg-amber-400/10 px-1.5 py-0.5 text-[8px] font-black text-amber-300">
                    PRO
                  </span>
                </div>

                <p className="mt-1 text-[10px] leading-4 text-[#94a3b8]">
                  Başarı oranını, toplam tekrarlarını,
                  unutma sayılarını ve kategori bazlı
                  ilerlemeni ayrıntılı gör.
                </p>

                <div className="mt-3 text-[10px] font-black text-amber-300">
                  Planı incele ›
                </div>
              </div>
            </div>
          </button>
        )}

        {sentences.length === 0 && (
          <div className="empty-msg">
            <div className="big-emoji">
              📊
            </div>

            İstatistik oluşturmak için önce
            cümle eklemelisin.
          </div>
        )}
      </section>

      {showProLock && (
        <div
          className="fixed inset-0 z-[210] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowProLock(false);
            }
          }}
        >
          <div className="w-full max-w-[420px] overflow-hidden rounded-[24px] border border-amber-400/20 bg-[#1e293b] shadow-2xl">
            <div className="border-b border-white/10 px-5 py-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-3xl">
                👑
              </div>

              <h3 className="mt-3 text-lg font-black">
                Pro özelliği
              </h3>

              <p className="mt-2 text-xs leading-5 text-[#94a3b8]">
                <strong className="text-amber-300">
                  {getFeatureLabel(
                    "advancedStatistics",
                  )}
                </strong>{" "}
                Free planda kullanılamaz. Pro plan
                veya aktif Pro deneme ile ayrıntılı
                öğrenme analizlerini görebilirsin.
              </p>
            </div>

            <div className="space-y-2 p-4">
              {onOpenPlans && (
                <button
                  type="button"
                  onClick={openPlans}
                  className="w-full rounded-xl border border-amber-400/25 bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-4 py-3 text-xs font-black text-amber-200"
                >
                  👑 Pro Planı İncele
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  setShowProLock(false)
                }
                className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-xs font-extrabold text-[#cbd5e1]"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
