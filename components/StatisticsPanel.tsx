"use client";

import { useMemo } from "react";
import type { Category, Sentence } from "@/types/app";

type StatisticsPanelProps = {
  categories: Category[];
  sentences: Sentence[];
};

function getSentenceStatus(sentence: Sentence) {
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
}: StatisticsPanelProps) {
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
        getSentenceStatus(sentence) === "learning",
    ).length;

    const learnedCount = sentences.filter(
      (sentence) =>
        getSentenceStatus(sentence) === "learned",
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
            (learnedCount / sentences.length) *
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

  return (
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
              Öğrenilen cümlelerin toplam cümlelere
              oranı
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

        <div className="mt-3 grid grid-cols-2 gap-2">
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

      <div className="section-title mt-5">
        📁 Kategori İstatistikleri
      </div>

      <div className="space-y-2.5">
        {categories.map((category) => {
          const categorySentences =
            sentences.filter(
              (sentence) =>
                sentence.cat === category.name,
            );

          if (categorySentences.length === 0) {
            return null;
          }

          const learnedCount =
            categorySentences.filter(
              (sentence) =>
                getSentenceStatus(sentence) ===
                "learned",
            ).length;

          const dueCount =
            categorySentences.filter(
              (sentence) =>
                getSentenceStatus(sentence) ===
                "due",
            ).length;

          const newCount =
            categorySentences.filter(
              (sentence) =>
                getSentenceStatus(sentence) ===
                "new",
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
                      📦 {categorySentences.length}
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

      {sentences.length === 0 && (
        <div className="empty-msg">
          <div className="big-emoji">📊</div>
          İstatistik oluşturmak için önce cümle
          eklemelisin.
        </div>
      )}
    </section>
  );
}