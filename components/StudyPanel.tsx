"use client";

import { useMemo, useState } from "react";
import { computeSrs, plainText } from "@/lib/srs";
import type { Category, Sentence } from "@/types/app";

type Rating = 0 | 1 | 2 | 3;

type StudyMode =
  | "flash"
  | "type"
  | "cloze"
  | "listen"
  | "mix";

type ActiveMode = Exclude<StudyMode, "mix">;

type StudyDirection = "de-tr" | "tr-de";

type StudyPanelProps = {
  categories: Category[];
  sentences: Sentence[];
  onRate: (sentenceId: number, rating: Rating) => void;
};

type StudyScreen =
  | "categories"
  | "subcategories"
  | "setup"
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
  selectedMode: StudyMode;
  activeMode: ActiveMode;
  direction: StudyDirection;
};

const INITIAL_STATE: StudyState = {
  screen: "categories",
  categoryName: null,
  subcategory: null,
  queue: [],
  position: 0,
  revealed: false,
  completed: 0,
  selectedMode: "flash",
  activeMode: "flash",
  direction: "de-tr",
};

const MODE_OPTIONS: {
  value: StudyMode;
  icon: string;
  title: string;
  description: string;
}[] = [
  {
    value: "flash",
    icon: "🃏",
    title: "Kart",
    description: "Kartı çevirerek çalış",
  },
  {
    value: "type",
    icon: "⌨️",
    title: "Yazarak",
    description: "Cevabı klavyeyle yaz",
  },
  {
    value: "cloze",
    icon: "🧩",
    title: "Boşluk",
    description: "Eksik kelimeyi tamamla",
  },
  {
    value: "listen",
    icon: "🎧",
    title: "Dinleme",
    description: "Dinleyip anlamını bul",
  },
  {
    value: "mix",
    icon: "🎲",
    title: "Karışık",
    description: "Modlar rastgele seçilir",
  },
];

function normalizeSubcategory(value: string) {
  return value || "";
}

function normalizeAnswer(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("de-DE")
    .replace(/[.,!?;:„“"']/g, "")
    .replace(/\s+/g, " ");
}

function getCategorySentences(
  sentences: Sentence[],
  categoryName: string,
  subcategory: string | null,
) {
  return sentences.filter((sentence) => {
    if (sentence.cat !== categoryName) {
      return false;
    }

    if (subcategory === null) {
      return true;
    }

    return (
      normalizeSubcategory(sentence.subcat) ===
      subcategory
    );
  });
}

function getStats(sentences: Sentence[]) {
  const now = Date.now();

  const newCount = sentences.filter(
    (sentence) => sentence.srs.reps === 0,
  ).length;

  const dueCount = sentences.filter(
    (sentence) =>
      sentence.srs.reps > 0 &&
      sentence.srs.due <= now,
  ).length;

  const learnedCount = sentences.filter(
    (sentence) =>
      sentence.srs.reps >= 3 &&
      sentence.srs.due > now,
  ).length;

  return {
    total: sentences.length,
    newCount,
    dueCount,
    learnedCount,
  };
}

function getRandomMode(sentence: Sentence): ActiveMode {
  const availableModes: ActiveMode[] = [
    "flash",
    "type",
    "listen",
  ];

  if (getClozeAnswer(sentence.de)) {
    availableModes.push("cloze");
  }

  return availableModes[
    Math.floor(Math.random() * availableModes.length)
  ];
}

function getClozeAnswer(text: string) {
  const match = text.match(/\{\{(.+?)\}\}/);

  return match?.[1]?.trim() || "";
}

function createClozeText(text: string) {
  return text.replace(
    /\{\{(.+?)\}\}/,
    "__________",
  );
}

function getPreviewText(
  sentence: Sentence,
  rating: Rating,
) {
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

  const utterance =
    new SpeechSynthesisUtterance(text);

  utterance.lang = "de-DE";
  utterance.rate = 0.88;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function AnswerButtons({
  sentence,
  onRate,
}: {
  sentence: Sentence;
  onRate: (rating: Rating) => void;
}) {
  const buttons: {
    rating: Rating;
    label: string;
    className: string;
  }[] = [
    {
      rating: 0,
      label: "😵 Tekrar",
      className: "bg-[#f43f5e] text-white",
    },
    {
      rating: 1,
      label: "😬 Zor",
      className: "bg-[#eab308] text-[#1a1a1a]",
    },
    {
      rating: 2,
      label: "🙂 İyi",
      className: "bg-[#38bdf8] text-white",
    },
    {
      rating: 3,
      label: "😎 Kolay",
      className: "bg-[#10b981] text-white",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {buttons.map((button) => (
        <button
          key={button.rating}
          type="button"
          onClick={() => onRate(button.rating)}
          className={`rounded-xl px-1 py-3 text-xs font-extrabold ${button.className}`}
        >
          {button.label}

          <small className="mt-1 block text-[9px]">
            {getPreviewText(
              sentence,
              button.rating,
            )}
          </small>
        </button>
      ))}
    </div>
  );
}

function FlashExercise({
  sentence,
  direction,
  revealed,
  onReveal,
}: {
  sentence: Sentence;
  direction: StudyDirection;
  revealed: boolean;
  onReveal: () => void;
}) {
  const question =
    direction === "de-tr"
      ? plainText(sentence.de)
      : sentence.tr;

  const answer =
    direction === "de-tr"
      ? sentence.tr
      : plainText(sentence.de);

  return (
    <div className="relative mb-3 min-h-[350px] rounded-[18px] border border-white/10 bg-[#1e293b] p-5">
      {!revealed ? (
        <button
          type="button"
          onClick={onReveal}
          className="flex min-h-[310px] w-full flex-col items-center justify-center text-center"
        >
          <div className="mb-4 text-3xl">
            {sentence.icon || "💬"}
          </div>

          <div className="text-xl font-extrabold leading-8">
            {question}
          </div>

          <div className="mt-auto pt-8 text-[11px] font-bold text-[#94a3b8]">
            Cevabı görmek için dokun 👆
          </div>
        </button>
      ) : (
        <div className="flex min-h-[310px] flex-col items-center justify-center text-center">
          {sentence.grammar && (
            <div className="mb-4 w-full rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-2 text-xs font-bold text-[#eab308]">
              💡 {sentence.grammar}
            </div>
          )}

          <div className="w-full rounded-xl border border-sky-400/20 bg-sky-400/10 p-4">
            <div className="text-lg font-extrabold">
              {answer}
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              speakGerman(plainText(sentence.de))
            }
            className="mt-4 rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-xs font-extrabold text-[#38bdf8]"
          >
            🔊 Almancayı Dinle
          </button>
        </div>
      )}
    </div>
  );
}

function TypeExercise({
  sentence,
  direction,
  revealed,
  onReveal,
}: {
  sentence: Sentence;
  direction: StudyDirection;
  revealed: boolean;
  onReveal: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);

  const question =
    direction === "de-tr"
      ? plainText(sentence.de)
      : sentence.tr;

  const correctAnswer =
    direction === "de-tr"
      ? sentence.tr
      : plainText(sentence.de);

  const isCorrect =
    normalizeAnswer(answer) ===
    normalizeAnswer(correctAnswer);

  function checkAnswer() {
    if (!answer.trim()) {
      return;
    }

    setChecked(true);
    onReveal();
  }

  return (
    <div className="mb-3 rounded-[18px] border border-white/10 bg-[#1e293b] p-4">
      <div className="mb-4 text-center">
        <div className="mb-3 text-2xl">
          {sentence.icon || "⌨️"}
        </div>

        <div className="text-lg font-extrabold leading-7">
          {question}
        </div>
      </div>

      <textarea
        value={answer}
        onChange={(event) => {
          setAnswer(event.target.value);
          setChecked(false);
        }}
        disabled={checked}
        className="input-field min-h-[90px] resize-none"
        placeholder="Cevabını yaz..."
      />

      {!checked ? (
        <button
          type="button"
          onClick={checkAnswer}
          className="app-button bg-[#38bdf8] text-white"
        >
          Kontrol Et
        </button>
      ) : (
        <div>
          <div
            className={`rounded-xl border p-3 ${
              isCorrect
                ? "border-emerald-400/30 bg-emerald-500/10"
                : "border-rose-500/30 bg-rose-500/10"
            }`}
          >
            <div
              className={`text-xs font-extrabold ${
                isCorrect
                  ? "text-[#10b981]"
                  : "text-[#f43f5e]"
              }`}
            >
              {isCorrect
                ? "✅ Doğru cevap"
                : "❌ Cevabın farklı"}
            </div>

            {!isCorrect && (
              <div className="mt-2 text-sm font-bold">
                Doğru cevap: {correctAnswer}
              </div>
            )}
          </div>

          {direction === "tr-de" && (
            <button
              type="button"
              onClick={() =>
                speakGerman(
                  plainText(sentence.de),
                )
              }
              className="mt-3 w-full rounded-xl border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-xs font-extrabold text-[#38bdf8]"
            >
              🔊 Doğru Telaffuzu Dinle
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ClozeExercise({
  sentence,
  revealed,
  onReveal,
}: {
  sentence: Sentence;
  revealed: boolean;
  onReveal: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);

  const correctAnswer = getClozeAnswer(sentence.de);
  const question = createClozeText(sentence.de);

  const isCorrect =
    normalizeAnswer(answer) ===
    normalizeAnswer(correctAnswer);

  function checkAnswer() {
    if (!answer.trim()) {
      return;
    }

    setChecked(true);
    onReveal();
  }

  if (!correctAnswer) {
    return (
      <FlashExercise
        sentence={sentence}
        direction="de-tr"
        revealed={revealed}
        onReveal={onReveal}
      />
    );
  }

  return (
    <div className="mb-3 rounded-[18px] border border-white/10 bg-[#1e293b] p-4">
      <div className="mb-3 text-center text-xs font-bold text-[#a855f7]">
        🧩 Boşluğa uygun Almanca kelimeyi yaz
      </div>

      <div className="mb-4 rounded-xl bg-black/20 p-4 text-center text-lg font-extrabold leading-7">
        {question}
      </div>

      <div className="mb-3 rounded-lg bg-white/5 p-2 text-center text-xs text-[#94a3b8]">
        🇹🇷 {sentence.tr}
      </div>

      <input
        type="text"
        value={answer}
        onChange={(event) => {
          setAnswer(event.target.value);
          setChecked(false);
        }}
        disabled={checked}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            checkAnswer();
          }
        }}
        className="input-field"
        placeholder="Eksik kelime..."
        autoComplete="off"
      />

      {!checked ? (
        <button
          type="button"
          onClick={checkAnswer}
          className="app-button bg-[#a855f7] text-white"
        >
          Kontrol Et
        </button>
      ) : (
        <div
          className={`rounded-xl border p-3 ${
            isCorrect
              ? "border-emerald-400/30 bg-emerald-500/10"
              : "border-rose-500/30 bg-rose-500/10"
          }`}
        >
          <div
            className={`text-xs font-extrabold ${
              isCorrect
                ? "text-[#10b981]"
                : "text-[#f43f5e]"
            }`}
          >
            {isCorrect
              ? "✅ Doğru"
              : "❌ Doğru cevap:"}
          </div>

          {!isCorrect && (
            <div className="mt-1 text-base font-extrabold">
              {correctAnswer}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ListenExercise({
  sentence,
  revealed,
  onReveal,
}: {
  sentence: Sentence;
  revealed: boolean;
  onReveal: () => void;
}) {
  return (
    <div className="mb-3 rounded-[18px] border border-white/10 bg-[#1e293b] p-5 text-center">
      <div className="mb-3 text-xs font-extrabold text-[#38bdf8]">
        🎧 Cümleyi dinle ve anlamını düşün
      </div>

      <button
        type="button"
        onClick={() =>
          speakGerman(plainText(sentence.de))
        }
        className="mx-auto my-8 flex h-24 w-24 items-center justify-center rounded-full border-4 border-sky-400/30 bg-sky-400/10 text-4xl shadow-lg"
      >
        🔊
      </button>

      <div className="mb-6 text-[11px] text-[#94a3b8]">
        Dinlemek için ses düğmesine bas
      </div>

      {!revealed ? (
        <button
          type="button"
          onClick={onReveal}
          className="app-button bg-[#38bdf8] text-white"
        >
          👁️ Cevabı Göster
        </button>
      ) : (
        <div className="space-y-2">
          <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 p-3 text-base font-extrabold">
            🇩🇪 {plainText(sentence.de)}
          </div>

          <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-base font-extrabold">
            🇹🇷 {sentence.tr}
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudyPanel({
  categories,
  sentences,
  onRate,
}: StudyPanelProps) {
  const [study, setStudy] =
    useState<StudyState>(INITIAL_STATE);

  const [
    expandedCategories,
    setExpandedCategories,
  ] = useState<Set<string>>(new Set());

  const totalDue = useMemo(() => {
    const now = Date.now();

    return sentences.filter(
      (sentence) =>
        sentence.srs.reps === 0 ||
        sentence.srs.due <= now,
    ).length;
  }, [sentences]);

  function toggleStudyCategory(
    categoryName: string,
  ) {
    setExpandedCategories((current) => {
      const next = new Set<string>();

      if (!current.has(categoryName)) {
        next.add(categoryName);
      }

      return next;
    });
  }

  function openSetup(
    categoryName: string,
    subcategory: string | null,
  ) {
    setStudy({
      ...INITIAL_STATE,
      screen: "setup",
      categoryName,
      subcategory,
    });
  }

  function startSession() {
    if (!study.categoryName) {
      return;
    }

    const now = Date.now();

    const group = getCategorySentences(
      sentences,
      study.categoryName,
      study.subcategory,
    );

    let queue = group.filter(
      (sentence) =>
        sentence.srs.reps === 0 ||
        sentence.srs.due <= now,
    );

    if (queue.length === 0) {
      queue = group;
    }

    queue = [...queue].sort(
      () => Math.random() - 0.5,
    );

    if (queue.length === 0) {
      return;
    }

    const firstMode =
      study.selectedMode === "mix"
        ? getRandomMode(queue[0])
        : study.selectedMode;

    setStudy({
      ...study,
      screen: "session",
      queue,
      position: 0,
      revealed: false,
      completed: 0,
      activeMode: firstMode,
    });
  }

  function revealAnswer() {
    setStudy((current) => ({
      ...current,
      revealed: true,
    }));
  }

  function rateCurrent(rating: Rating) {
    if (study.screen !== "session") {
      return;
    }

    const currentSentence =
      study.queue[study.position];

    if (!currentSentence) {
      return;
    }

    onRate(currentSentence.id, rating);

    const completed = study.completed + 1;
    const position = study.position + 1;

    if (rating === 0) {
      const repeatedSentence = {
        ...currentSentence,
        srs: computeSrs(
          currentSentence.srs,
          rating,
        ),
      };

      const nextQueue = [
        ...study.queue,
        repeatedSentence,
      ];

      const nextSentence =
        nextQueue[position] || repeatedSentence;

      setStudy({
        ...study,
        queue: nextQueue,
        position,
        revealed: false,
        completed,
        activeMode:
          study.selectedMode === "mix"
            ? getRandomMode(nextSentence)
            : study.selectedMode,
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

    const nextSentence = study.queue[position];

    setStudy({
      ...study,
      position,
      revealed: false,
      completed,
      activeMode:
        study.selectedMode === "mix"
          ? getRandomMode(nextSentence)
          : study.selectedMode,
    });
  }

  if (study.screen === "finished") {
    return (
      <div className="empty-msg">
        <div className="big-emoji">🏆</div>

        <div className="mb-2 text-lg font-extrabold text-[#f8fafc]">
          Oturum tamamlandı
        </div>

        <div className="mb-5 text-sm">
          {study.completed} cümle çalışıldı.
        </div>

        <button
          type="button"
          onClick={() =>
            setStudy({
              ...INITIAL_STATE,
              screen: "setup",
              categoryName: study.categoryName,
              subcategory: study.subcategory,
              selectedMode: study.selectedMode,
              direction: study.direction,
            })
          }
          className="app-button app-button-primary"
        >
          🔁 Yeniden Çalış
        </button>

        <button
          type="button"
          onClick={() => {
            if (study.categoryName) {
              setExpandedCategories(
                new Set([study.categoryName]),
              );
            }

            setStudy(INITIAL_STATE);
          }}
          className="app-button app-button-secondary mt-2"
        >
          📂 Kategorilere Dön
        </button>
      </div>
    );
  }

  if (
    study.screen === "setup" &&
    study.categoryName
  ) {
    const group = getCategorySentences(
      sentences,
      study.categoryName,
      study.subcategory,
    );

    return (
      <section>
        <div className="section-title">
          🎯 Çalışma Modunu Seç
        </div>

        <div className="mb-4 rounded-xl border border-white/10 bg-[#1e293b] p-3">
          <div className="text-sm font-extrabold">
            {study.categoryName}
          </div>

          <div className="mt-1 text-[10px] text-[#94a3b8]">
            {study.subcategory || "Tüm Kategori"} •{" "}
            {group.length} cümle
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {MODE_OPTIONS.map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() =>
                setStudy({
                  ...study,
                  selectedMode: mode.value,
                })
              }
              className={`rounded-xl border p-3 text-left ${
                study.selectedMode === mode.value
                  ? "border-[#38bdf8] bg-sky-400/10"
                  : "border-white/10 bg-[#1e293b]"
              }`}
            >
              <div className="text-xl">
                {mode.icon}
              </div>

              <div className="mt-1 text-xs font-extrabold">
                {mode.title}
              </div>

              <div className="mt-1 text-[9px] leading-3 text-[#94a3b8]">
                {mode.description}
              </div>
            </button>
          ))}
        </div>

        {(study.selectedMode === "flash" ||
          study.selectedMode === "type" ||
          study.selectedMode === "mix") && (
          <div className="mt-4">
            <div className="mb-2 text-[11px] font-extrabold text-[#94a3b8]">
              Çalışma yönü
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setStudy({
                    ...study,
                    direction: "de-tr",
                  })
                }
                className={`rounded-xl border px-3 py-3 text-xs font-extrabold ${
                  study.direction === "de-tr"
                    ? "border-[#38bdf8] bg-sky-400/10 text-[#38bdf8]"
                    : "border-white/10 bg-[#1e293b]"
                }`}
              >
                🇩🇪 → 🇹🇷
              </button>

              <button
                type="button"
                onClick={() =>
                  setStudy({
                    ...study,
                    direction: "tr-de",
                  })
                }
                className={`rounded-xl border px-3 py-3 text-xs font-extrabold ${
                  study.direction === "tr-de"
                    ? "border-[#38bdf8] bg-sky-400/10 text-[#38bdf8]"
                    : "border-white/10 bg-[#1e293b]"
                }`}
              >
                🇹🇷 → 🇩🇪
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={startSession}
          className="app-button app-button-primary mt-4"
        >
          ▶️ Çalışmayı Başlat
        </button>

        <button
          type="button"
          onClick={() => {
            setExpandedCategories(
              new Set([study.categoryName!]),
            );
            setStudy(INITIAL_STATE);
          }}
          className="app-button app-button-secondary mt-2"
        >
          ⬅️ Kategorilere Dön
        </button>
      </section>
    );
  }

  if (
    study.screen === "subcategories" &&
    study.categoryName
  ) {
    const category = categories.find(
      (item) =>
        item.name === study.categoryName,
    );

    const groupSentences =
      getCategorySentences(
        sentences,
        study.categoryName,
        null,
      );

    const subcategories = Array.from(
      new Set([
        ...(category?.subcats ?? []),
        ...groupSentences
          .map((sentence) =>
            normalizeSubcategory(
              sentence.subcat,
            ),
          )
          .filter(Boolean),
      ]),
    );

    return (
      <section>
        <div className="section-title">
          📂 Çalışma Grubunu Seç
        </div>

        <button
          type="button"
          onClick={() =>
            openSetup(study.categoryName!, null)
          }
          className="mb-2.5 flex w-full items-center justify-between rounded-xl border-2 border-[#a855f7] bg-purple-500/10 p-3.5"
        >
          <span className="text-sm font-extrabold">
            🌍 Tüm Kategori
          </span>

          <span className="text-[10px] text-[#94a3b8]">
            {groupSentences.length} cümle
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
                openSetup(
                  study.categoryName!,
                  subcategory,
                )
              }
              className="mb-2.5 flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#1e293b] p-3.5"
            >
              <span className="text-sm font-extrabold">
                📁 {subcategory}
              </span>

              <span className="flex gap-1">
                {stats.newCount > 0 && (
                  <span className="rounded-md bg-sky-400/10 px-2 py-1 text-[9px] text-[#38bdf8]">
                    🆕 {stats.newCount}
                  </span>
                )}

                {stats.dueCount > 0 && (
                  <span className="rounded-md bg-rose-500/10 px-2 py-1 text-[9px] text-[#f43f5e]">
                    🔴 {stats.dueCount}
                  </span>
                )}

                <span className="rounded-md bg-white/5 px-2 py-1 text-[9px] text-[#94a3b8]">
                  📦 {stats.total}
                </span>
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() =>
            setStudy(INITIAL_STATE)
          }
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
        <div className="mb-3 flex items-center justify-between rounded-xl border border-white/10 bg-[#1e293b] px-3 py-2">
          <span className="text-[10px] font-bold text-[#94a3b8]">
            {study.activeMode === "flash" &&
              "🃏 Kart"}
            {study.activeMode === "type" &&
              "⌨️ Yazarak"}
            {study.activeMode === "cloze" &&
              "🧩 Boşluk"}
            {study.activeMode === "listen" &&
              "🎧 Dinleme"}
          </span>

          <span className="text-[10px] font-bold text-[#94a3b8]">
            Kalan: {remaining}/
            {study.queue.length}
          </span>
        </div>

        {study.activeMode === "flash" && (
          <FlashExercise
            key={currentSentence.id}
            sentence={currentSentence}
            direction={study.direction}
            revealed={study.revealed}
            onReveal={revealAnswer}
          />
        )}

        {study.activeMode === "type" && (
          <TypeExercise
            key={currentSentence.id}
            sentence={currentSentence}
            direction={study.direction}
            revealed={study.revealed}
            onReveal={revealAnswer}
          />
        )}

        {study.activeMode === "cloze" && (
          <ClozeExercise
            key={currentSentence.id}
            sentence={currentSentence}
            revealed={study.revealed}
            onReveal={revealAnswer}
          />
        )}

        {study.activeMode === "listen" && (
          <ListenExercise
            key={currentSentence.id}
            sentence={currentSentence}
            revealed={study.revealed}
            onReveal={revealAnswer}
          />
        )}

        {study.revealed && (
          <AnswerButtons
            sentence={currentSentence}
            onRate={rateCurrent}
          />
        )}

        <button
          type="button"
          onClick={() =>
            setStudy({
              ...INITIAL_STATE,
              screen: "setup",
              categoryName:
                study.categoryName,
              subcategory:
                study.subcategory,
              selectedMode:
                study.selectedMode,
              direction: study.direction,
            })
          }
          className="app-button app-button-secondary mt-2.5"
        >
          ⏹️ Oturumu Bitir
        </button>
      </section>
    );
  }

  return (
    <section>
      <div className="section-title">
        📅 Bugün Çalışılacaklar
      </div>

      <div className="space-y-2">
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
                  (stats.learnedCount /
                    stats.total) *
                    100,
                )
              : 0;

          const isExpanded =
            expandedCategories.has(
              category.name,
            );

          const subcategories = Array.from(
            new Set([
              ...category.subcats,
              ...group
                .map((sentence) =>
                  normalizeSubcategory(
                    sentence.subcat,
                  ),
                )
                .filter(Boolean),
            ]),
          );

          return (
            <div
              key={category.name}
              className="overflow-hidden rounded-2xl border border-white/10 bg-[#1e293b]"
            >
              <button
                type="button"
                onClick={() =>
                  toggleStudyCategory(
                    category.name,
                  )
                }
                className="flex w-full items-center gap-3 p-3.5 text-left"
                aria-expanded={isExpanded}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 text-2xl">
                  {category.icon || "📁"}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="truncate text-[15px] font-extrabold">
                      {category.name}
                    </span>

                    <span
                      className={[
                        "shrink-0 text-xs text-[#94a3b8] transition-transform",
                        isExpanded
                          ? "rotate-180"
                          : "",
                      ].join(" ")}
                    >
                      ▼
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {stats.dueCount > 0 && (
                      <span className="rounded-lg bg-rose-500/15 px-2 py-1 text-[10px] font-extrabold text-[#f43f5e]">
                        🔴 {stats.dueCount} tekrar
                      </span>
                    )}

                    {stats.newCount > 0 && (
                      <span className="rounded-lg bg-sky-400/15 px-2 py-1 text-[10px] font-extrabold text-[#38bdf8]">
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
                      style={{
                        width: `${progress}%`,
                      }}
                    />
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-white/10 bg-black/10 p-3">
                  <button
                    type="button"
                    onClick={() =>
                      openSetup(
                        category.name,
                        null,
                      )
                    }
                    className="mb-2 flex w-full items-center justify-between rounded-xl border border-purple-400/30 bg-purple-500/10 px-3 py-3 text-left"
                  >
                    <span className="text-xs font-extrabold text-purple-200">
                      🌍 Tüm Kategoriyi Çalış
                    </span>

                    <span className="text-[10px] text-[#94a3b8]">
                      {group.length} cümle
                    </span>
                  </button>

                  <div className="space-y-1.5">
                    {subcategories.map(
                      (subcategory) => {
                        const subcategoryGroup =
                          getCategorySentences(
                            sentences,
                            category.name,
                            subcategory,
                          );

                        if (
                          subcategoryGroup.length === 0
                        ) {
                          return null;
                        }

                        const subcategoryStats =
                          getStats(
                            subcategoryGroup,
                          );

                        return (
                          <button
                            key={`${category.name}-${subcategory}`}
                            type="button"
                            onClick={() =>
                              openSetup(
                                category.name,
                                subcategory,
                              )
                            }
                            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left hover:bg-white/[0.07]"
                          >
                            <span className="min-w-0 truncate text-xs font-extrabold">
                              📁 {subcategory}
                            </span>

                            <span className="ml-2 flex shrink-0 gap-1">
                              {subcategoryStats.newCount >
                                0 && (
                                <span className="rounded-md bg-sky-400/10 px-1.5 py-1 text-[9px] text-[#38bdf8]">
                                  🆕{" "}
                                  {
                                    subcategoryStats.newCount
                                  }
                                </span>
                              )}

                              {subcategoryStats.dueCount >
                                0 && (
                                <span className="rounded-md bg-rose-500/10 px-1.5 py-1 text-[9px] text-[#f43f5e]">
                                  🔴{" "}
                                  {
                                    subcategoryStats.dueCount
                                  }
                                </span>
                              )}

                              <span className="rounded-md bg-white/5 px-1.5 py-1 text-[9px] text-[#94a3b8]">
                                📦{" "}
                                {
                                  subcategoryStats.total
                                }
                              </span>
                            </span>
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {sentences.length === 0 && (
        <div className="empty-msg">
          <div className="big-emoji">➕</div>
          Çalışmak için önce cümle ekle.
        </div>
      )}

      {totalDue === 0 &&
        sentences.length > 0 && (
          <div className="mt-3 text-center text-xs text-[#94a3b8]">
            Bugün tekrar bekleyen kart yok.
            Kategori seçerek tekrar çalışabilirsin.
          </div>
        )}
    </section>
  );
}
