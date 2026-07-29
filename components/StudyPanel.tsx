"use client";

import { useMemo, useState } from "react";
import { computeSrs, plainText } from "@/lib/srs";
import type { Category, Sentence } from "@/types/app";

type Rating = 0 | 1 | 2 | 3;

type StudyPanelProps = {
  categories: Category[];
  sentences: Sentence[];
  onRate: (sentenceId: number, rating: Rating) => void;
};

type StudyScreen =
  | "categories"
  | "subcategories"
  | "session"
  | "finished";

type StudyState = {
  screen: StudyScreen;
  categoryName: string | null;
  subcategory: string | null;
  queue: Sentence[];
  position: number;
  revealed: boolean;
  completed: number;
};

const INITIAL_STATE: StudyState = {
  screen: "categories",
  categoryName: null,
  subcategory: null,
  queue: [],
  position: 0,
  revealed: false,
  completed: 0,
};

function normalizeSubcategory(value: string): string {
  return value || "Genel";
}

function getCategorySentences(
  sentences: Sentence[],
  categoryName: string,
  subcategory: string | null,
): Sentence[] {
  return sentences.filter((sentence) => {
    if (sentence.cat !== categoryName) {
      return false;
    }

    if (subcategory === null) {
      return true;
    }

    return normalizeSubcategory(sentence.subcat) === subcategory;
  });
}

function getStats(sentences: Sentence[]) {
  const now = Date.now();

  const newCount = sentences.filter(
    (sentence) => sentence.srs.reps === 0,
  ).length;

  const dueCount = sentences.filter(
    (sentence) =>
      sentence.srs.reps > 0 && sentence.srs.due <= now,
  ).length;

  const learnedCount = sentences.filter(
    (sentence) =>
      sentence.srs.reps >= 3 && sentence.srs.due > now,
  ).length;

  return {
    total: sentences.length,
    newCount,
    dueCount,
    learnedCount,
  };
}

function getPreviewText(
  sentence: Sentence,
  rating: Rating,
): string {
  const next = computeSrs(sentence.srs, rating);

  if (rating === 0) {
    return "10 dk";
  }

  return `${next.interval} gün`;
}

function speakGerman(text: string) {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window)
  ) {
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);

  utterance.lang = "de-DE";
  utterance.rate = 0.9;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export default function StudyPanel({
  categories,
  sentences,
  onRate,
}: StudyPanelProps) {
  const [study, setStudy] =
    useState<StudyState>(INITIAL_STATE);

  const totalDue = useMemo(() => {
    const now = Date.now();

    return sentences.filter(
      (sentence) =>
        sentence.srs.reps === 0 ||
        sentence.srs.due <= now,
    ).length;
  }, [sentences]);

  function openSubcategories(categoryName: string) {
    setStudy({
      ...INITIAL_STATE,
      screen: "subcategories",
      categoryName,
    });
  }

  function startSession(
    categoryName: string,
    subcategory: string | null,
  ) {
    const now = Date.now();

    const group = getCategorySentences(
      sentences,
      categoryName,
      subcategory,
    );

    let queue = group.filter(
      (sentence) =>
        sentence.srs.reps === 0 ||
        sentence.srs.due <= now,
    );

    if (queue.length === 0) {
      queue = group;
    }

    queue = [...queue].sort(() => Math.random() - 0.5);

    if (queue.length === 0) {
      return;
    }

    setStudy({
      screen: "session",
      categoryName,
      subcategory,
      queue,
      position: 0,
      revealed: false,
      completed: 0,
    });
  }

  function rateCurrent(rating: Rating) {
    if (study.screen !== "session") {
      return;
    }

    const currentSentence = study.queue[study.position];

    if (!currentSentence) {
      return;
    }

    onRate(currentSentence.id, rating);

    const completed = study.completed + 1;
    const position = study.position + 1;

    if (rating === 0) {
      const repeatedSentence = {
        ...currentSentence,
        srs: computeSrs(currentSentence.srs, rating),
      };

      setStudy({
        ...study,
        queue: [...study.queue, repeatedSentence],
        position,
        revealed: false,
        completed,
      });

      return;
    }

    if (position >= study.queue.length) {
      setStudy({
        ...study,
        screen: "finished",
        completed,
      });

      return;
    }

    setStudy({
      ...study,
      position,
      revealed: false,
      completed,
    });
  }

  if (study.screen === "finished") {
    return (
      <div className="empty-msg">
        <div className="big-emoji">🏆</div>

        <div className="mb-2 text-lg font-extrabold text-[#f8fafc]">
          Oturum Tamamlandı
        </div>

        <div className="mb-5 text-sm">
          {study.completed} cümle çalışıldı.
        </div>

        <button
          type="button"
          onClick={() =>
            setStudy({
              ...INITIAL_STATE,
              screen: "subcategories",
              categoryName: study.categoryName,
            })
          }
          className="app-button app-button-primary"
        >
          📂 Başka Grup Seç
        </button>

        <button
          type="button"
          onClick={() => setStudy(INITIAL_STATE)}
          className="app-button app-button-secondary mt-2.5"
        >
          ⬅️ Kategorilere Dön
        </button>
      </div>
    );
  }

  if (
    study.screen === "subcategories" &&
    study.categoryName
  ) {
    const category = categories.find(
      (item) => item.name === study.categoryName,
    );

    const groupSentences = getCategorySentences(
      sentences,
      study.categoryName,
      null,
    );

    const usedSubcategories = Array.from(
      new Set(
        groupSentences.map((sentence) =>
          normalizeSubcategory(sentence.subcat),
        ),
      ),
    );

    const subcategories = Array.from(
      new Set([
        "Genel",
        ...(category?.subcats ?? []),
        ...usedSubcategories,
      ]),
    );

    const allStats = getStats(groupSentences);

    return (
      <section>
        <div className="section-title">
          📂 Hangi grupla çalışmak istersin?
        </div>

        <button
          type="button"
          onClick={() =>
            startSession(study.categoryName!, null)
          }
          className="mb-2.5 flex w-full items-center justify-between rounded-[14px] border-2 border-[#a855f7] bg-purple-500/10 p-3.5 text-left"
        >
          <span className="text-sm font-extrabold">
            🌍 Tüm Kategori
          </span>

          <span className="text-[10px] font-extrabold text-[#94a3b8]">
            📦 {allStats.total}
          </span>
        </button>

        {subcategories.map((subcategory) => {
          const group = getCategorySentences(
            sentences,
            study.categoryName!,
            subcategory,
          );

          if (group.length === 0) {
            return null;
          }

          const stats = getStats(group);

          return (
            <button
              key={subcategory}
              type="button"
              onClick={() =>
                startSession(
                  study.categoryName!,
                  subcategory,
                )
              }
              className="mb-2.5 flex w-full items-center justify-between rounded-[14px] border-2 border-white/10 bg-[#1e293b] p-3.5 text-left"
            >
              <span className="text-sm font-extrabold">
                📁 {subcategory}
              </span>

              <span className="flex flex-wrap justify-end gap-1">
                {stats.dueCount > 0 && (
                  <span className="rounded-lg bg-rose-500/15 px-2 py-1 text-[10px] font-extrabold text-[#f43f5e]">
                    🔴 {stats.dueCount}
                  </span>
                )}

                {stats.newCount > 0 && (
                  <span className="rounded-lg bg-sky-400/15 px-2 py-1 text-[10px] font-extrabold text-[#38bdf8]">
                    🆕 {stats.newCount}
                  </span>
                )}

                <span className="rounded-lg bg-white/5 px-2 py-1 text-[10px] font-extrabold text-[#94a3b8]">
                  📦 {stats.total}
                </span>
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setStudy(INITIAL_STATE)}
          className="app-button app-button-secondary mt-2"
        >
          ⬅️ Kategorilere Dön
        </button>
      </section>
    );
  }

  if (study.screen === "session") {
    const currentSentence =
      study.queue[study.position];

    if (!currentSentence) {
      return null;
    }

    const remaining =
      study.queue.length - study.position;

    return (
      <section>
        <div className="relative mb-2.5 h-[46vh] min-h-[360px] max-h-[520px] w-full [perspective:1000px]">
          <div className="absolute -top-2.5 left-2.5 z-10 rounded-xl border border-white/10 bg-[#1e293b] px-3 py-1.5 text-[11px] font-extrabold text-[#94a3b8]">
            {study.subcategory || "Tüm Kategori"} • Kalan:{" "}
            {remaining}/{study.queue.length}
          </div>

          <button
            type="button"
            onClick={() =>
              setStudy({
                ...study,
                revealed: !study.revealed,
              })
            }
            className={[
              "relative mt-2.5 h-full w-full border-0 bg-transparent transition-transform duration-500 [transform-style:preserve-3d]",
              study.revealed
                ? "[transform:rotateY(180deg)]"
                : "",
            ].join(" ")}
          >
            <div className="absolute inset-0 flex [backface-visibility:hidden] flex-col items-center justify-center rounded-[18px] border border-white/10 bg-[#1e293b] p-3.5 text-center shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
              <div className="text-2xl font-extrabold leading-[1.3]">
                {currentSentence.icon || "💬"}{" "}
                {plainText(currentSentence.de)}
              </div>

              <div className="pointer-events-none absolute bottom-3 left-0 w-full text-[11px] font-bold text-[#94a3b8] opacity-60">
                Cevap için dokun 👆
              </div>
            </div>

            <div className="absolute inset-0 flex [backface-visibility:hidden] [transform:rotateY(180deg)] flex-col items-center overflow-y-auto rounded-[18px] border-2 border-[#1e293b] bg-[#0f172a] px-3.5 pb-3.5 pt-6">
              <div className="flex min-h-max w-full flex-col items-center pb-2.5">
                {currentSentence.grammar && (
                  <div className="mb-3 w-full rounded-lg border border-dashed border-yellow-500/40 bg-yellow-500/15 px-2.5 py-1.5 text-center text-xs font-extrabold text-[#eab308]">
                    💡 {currentSentence.grammar}
                  </div>
                )}

                <div className="mb-2.5 w-full rounded-[14px] border-b-[3px] border-[#FC0] bg-[linear-gradient(145deg,#1e293b,#0f172a)] p-3 text-center">
                  <div className="text-lg font-extrabold">
                    {plainText(currentSentence.de)}
                  </div>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      speakGerman(
                        plainText(currentSentence.de),
                      );
                    }}
                    className="mt-2 rounded-full border border-sky-400/30 bg-sky-400/15 px-3 py-1 text-xs font-extrabold text-[#38bdf8]"
                  >
                    🔊 Dinle
                  </button>
                </div>

                <div className="mb-2.5 w-full rounded-[14px] border-b-[3px] border-[#E30A17] bg-[linear-gradient(145deg,#3f0f16,#1a080a)] p-3 text-center">
                  <div className="text-lg font-extrabold">
                    {currentSentence.tr}
                  </div>
                </div>
              </div>
            </div>
          </button>
        </div>

        {!study.revealed ? (
          <button
            type="button"
            onClick={() =>
              setStudy({
                ...study,
                revealed: true,
              })
            }
            className="app-button bg-[#38bdf8] text-white"
          >
            👁️ Cevabı Göster
          </button>
        ) : (
          <div className="grid grid-cols-4 gap-1.5">
            {(
              [
                [0, "😵 Tekrar", "#f43f5e", "white"],
                [1, "😬 Zor", "#eab308", "#1a1a1a"],
                [2, "🙂 İyi", "#38bdf8", "white"],
                [3, "😎 Kolay", "#10b981", "white"],
              ] as const
            ).map(([rating, label, background, color]) => (
              <button
                key={rating}
                type="button"
                onClick={() => rateCurrent(rating)}
                className="rounded-xl px-1 py-3 text-xs font-extrabold"
                style={{ background, color }}
              >
                {label}

                <small className="mt-1 block text-[9px]">
                  {getPreviewText(
                    currentSentence,
                    rating,
                  )}
                </small>
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() =>
            setStudy({
              ...INITIAL_STATE,
              screen: "subcategories",
              categoryName: study.categoryName,
            })
          }
          className="app-button app-button-secondary mt-2.5"
        >
          ⏹️ Bitir
        </button>
      </section>
    );
  }

  return (
    <section>
      <div className="section-title">
        📅 Bugün Çalışılacaklar
      </div>

      {categories.map((category) => {
        const group = getCategorySentences(
          sentences,
          category.name,
          null,
        );

        if (group.length === 0) {
          return null;
        }

        const stats = getStats(group);
        const activeCount =
          stats.newCount + stats.dueCount;

        const progress =
          stats.total > 0
            ? Math.round(
                (stats.learnedCount / stats.total) * 100,
              )
            : 0;

        return (
          <button
            key={category.name}
            type="button"
            onClick={() =>
              openSubcategories(category.name)
            }
            className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-[#1e293b] p-3.5 text-left"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 text-2xl">
              {category.icon || "📁"}
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-1.5 text-[15px] font-extrabold">
                {category.name}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {stats.dueCount > 0 && (
                  <span className="rounded-lg border border-rose-500/30 bg-rose-500/15 px-2 py-1 text-[10px] font-extrabold text-[#f43f5e]">
                    🔴 {stats.dueCount} tekrar
                  </span>
                )}

                {stats.newCount > 0 && (
                  <span className="rounded-lg border border-sky-400/30 bg-sky-400/15 px-2 py-1 text-[10px] font-extrabold text-[#38bdf8]">
                    🆕 {stats.newCount} yeni
                  </span>
                )}

                {activeCount === 0 && (
                  <span className="rounded-lg bg-emerald-500/15 px-2 py-1 text-[10px] font-extrabold text-[#10b981]">
                    ✅ Bugünlük bitti
                  </span>
                )}

                <span className="rounded-lg bg-white/5 px-2 py-1 text-[10px] font-extrabold text-[#94a3b8]">
                  📦 {stats.total}
                </span>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/30">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#10b981,#38bdf8)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </button>
        );
      })}

      {sentences.length === 0 && (
        <div className="empty-msg">
          <div className="big-emoji">➕</div>
          Çalışmak için önce cümle ekle.
        </div>
      )}

      {totalDue === 0 && sentences.length > 0 && (
        <div className="mt-3 text-center text-xs text-[#94a3b8]">
          Bugün tekrar bekleyen kart yok. Bir kategoriye
          basarak yine de çalışabilirsin.
        </div>
      )}
    </section>
  );
}