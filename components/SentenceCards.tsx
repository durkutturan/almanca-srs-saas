"use client";

import { useEffect, useMemo, useState } from "react";
import { plainText } from "@/lib/srs";
import type { Category, Sentence } from "@/types/app";

type CardDirection = "de-tr" | "tr-de";

type SentenceCardsProps = {
  categories: Category[];
  sentences: Sentence[];
};

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

export default function SentenceCards({
  categories,
  sentences,
}: SentenceCardsProps) {
  const [filter, setFilter] = useState("all");
  const [direction, setDirection] =
    useState<CardDirection>("de-tr");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const filteredSentences = useMemo(() => {
    if (filter === "all") {
      return sentences;
    }

    if (filter.startsWith("category|")) {
      const categoryName = filter.slice("category|".length);

      return sentences.filter(
        (sentence) => sentence.cat === categoryName,
      );
    }

    if (filter.startsWith("subcategory|")) {
      const [, categoryName, subcategoryName] =
        filter.split("|");

      return sentences.filter((sentence) => {
        const sentenceSubcategory =
          sentence.subcat || "Genel";

        return (
          sentence.cat === categoryName &&
          sentenceSubcategory === subcategoryName
        );
      });
    }

    return sentences;
  }, [filter, sentences]);

  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [filter, direction]);

  useEffect(() => {
    if (currentIndex >= filteredSentences.length) {
      setCurrentIndex(0);
      setIsFlipped(false);
    }
  }, [currentIndex, filteredSentences.length]);

  function showPreviousCard() {
    if (filteredSentences.length === 0) {
      return;
    }

    setCurrentIndex((current) =>
      current === 0
        ? filteredSentences.length - 1
        : current - 1,
    );

    setIsFlipped(false);
  }

  function showNextCard() {
    if (filteredSentences.length === 0) {
      return;
    }

    setCurrentIndex(
      (current) =>
        (current + 1) % filteredSentences.length,
    );

    setIsFlipped(false);
  }

  function toggleDirection() {
    setDirection((current) =>
      current === "de-tr" ? "tr-de" : "de-tr",
    );
  }

  const currentSentence =
    filteredSentences[currentIndex];

  return (
    <section>
      <div className="mb-2.5 flex items-center gap-2">
        <select
          value={filter}
          onChange={(event) =>
            setFilter(event.target.value)
          }
          className="input-field mb-0 flex-1"
        >
          <option value="all">
            🌍 Tüm Kategoriler
          </option>

          {categories.map((category) => (
            <optgroup
              key={category.name}
              label={`${category.icon || "📁"} ${category.name}`}
            >
              <option
                value={`category|${category.name}`}
              >
                {category.icon || "📁"}{" "}
                {category.name} (Tümü)
              </option>

              <option
                value={`subcategory|${category.name}|Genel`}
              >
                ↳ Genel
              </option>

              {category.subcats.map((subcategory) => (
                <option
                  key={`${category.name}-${subcategory}`}
                  value={`subcategory|${category.name}|${subcategory}`}
                >
                  ↳ {subcategory}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <button
          type="button"
          onClick={toggleDirection}
          className="h-11 shrink-0 rounded-xl border border-white/10 bg-[#1e293b] px-3.5 text-[13px] font-bold text-[#f8fafc]"
        >
          {direction === "de-tr"
            ? "🇩🇪➔🇹🇷"
            : "🇹🇷➔🇩🇪"}
        </button>
      </div>

      {!currentSentence ? (
        <div className="empty-msg">
          <div className="big-emoji">🗂️</div>
          Bu kategoride cümle yok.
        </div>
      ) : (
        <>
          <div className="relative mb-2.5 h-[46vh] min-h-[360px] max-h-[520px] w-full [perspective:1000px]">
            <div className="absolute -top-2.5 left-2.5 z-10 rounded-xl border border-white/10 bg-[#1e293b] px-3 py-1.5 text-[11px] font-extrabold text-[#94a3b8]">
              {currentSentence.subcat || "Genel"} •{" "}
              {currentIndex + 1}/
              {filteredSentences.length}
            </div>

            <button
              type="button"
              onClick={() =>
                setIsFlipped((current) => !current)
              }
              className={[
                "relative mt-2.5 h-full w-full cursor-pointer border-0 bg-transparent text-left transition-transform duration-500 [transform-style:preserve-3d]",
                isFlipped
                  ? "[transform:rotateY(180deg)]"
                  : "",
              ].join(" ")}
            >
              <div className="absolute inset-0 flex [backface-visibility:hidden] flex-col items-center justify-center rounded-[18px] border border-white/10 bg-[#1e293b] p-3.5 text-center shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
                <div className="text-2xl font-extrabold leading-[1.3]">
                  {currentSentence.icon || "💬"}{" "}
                  {direction === "de-tr"
                    ? plainText(currentSentence.de)
                    : currentSentence.tr}
                </div>

                <div className="pointer-events-none absolute bottom-3 left-0 w-full text-center text-[11px] font-bold text-[#94a3b8] opacity-60">
                  Çevirmek İçin Dokun 👆
                </div>
              </div>

              <div className="absolute inset-0 flex [backface-visibility:hidden] [transform:rotateY(180deg)] flex-col items-center overflow-y-auto rounded-[18px] border-2 border-[#1e293b] bg-[#0f172a] px-3.5 pb-3.5 pt-6">
                <div className="flex min-h-max w-full flex-col items-center pb-2.5">
                  {currentSentence.grammar && (
                    <div className="mb-3 w-full rounded-lg border border-dashed border-yellow-500/40 bg-yellow-500/15 px-2.5 py-1.5 text-center text-xs font-extrabold text-[#eab308]">
                      💡 {currentSentence.grammar}
                    </div>
                  )}

                  <div className="mb-2.5 flex w-full flex-col items-center gap-1.5 rounded-[14px] border-b-[3px] border-[#FC0] bg-[linear-gradient(145deg,#1e293b,#0f172a)] p-3 text-center">
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
                      className="mt-1 rounded-full border border-sky-400/30 bg-sky-400/15 px-3 py-1 text-xs font-extrabold text-[#38bdf8]"
                    >
                      🔊 Dinle
                    </button>
                  </div>

                  <div className="mb-2.5 flex w-full flex-col items-center gap-1.5 rounded-[14px] border-b-[3px] border-[#E30A17] bg-[linear-gradient(145deg,#3f0f16,#1a080a)] p-3 text-center">
                    <div className="text-lg font-extrabold">
                      {currentSentence.tr}
                    </div>
                  </div>

                  <div className="mt-1.5 text-[11px] text-[#94a3b8]">
                    📊{" "}
                    {currentSentence.srs.reps === 0
                      ? "Yeni kart"
                      : `${currentSentence.srs.reps} tekrar • kolaylık: ${currentSentence.srs.ease.toFixed(2)}`}
                  </div>
                </div>

                <div className="mt-auto pt-3 text-center text-[11px] font-bold text-[#94a3b8] opacity-60">
                  Geri Dönmek İçin Dokun 👆
                </div>
              </div>
            </button>
          </div>

          <div className="mt-2.5 flex gap-3">
            <button
              type="button"
              onClick={showPreviousCard}
              className="flex-1 rounded-xl border-2 border-white/10 bg-[#1e293b] p-3 text-sm font-extrabold text-[#f8fafc]"
            >
              ⬅️ Önceki
            </button>

            <button
              type="button"
              onClick={showNextCard}
              className="flex-1 rounded-xl border-2 border-[#38bdf8] bg-[#38bdf8] p-3 text-sm font-extrabold text-white"
            >
              Sonraki ➡️
            </button>
          </div>
        </>
      )}
    </section>
  );
}