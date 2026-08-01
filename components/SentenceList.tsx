"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getSrsStatus,
  hasCloze,
  plainText,
} from "@/lib/srs";
import type {
  Category,
  Sentence,
} from "@/types/app";

type UpdateSentenceInput = {
  de: string;
  tr: string;
  category: string;
  subcategory: string;
  icon: string;
  grammar: string;
};

type SentenceListProps = {
  categories: Category[];
  sentences: Sentence[];
  onDelete: (sentenceId: number) => void;
  onUpdate: (
    sentenceId: number,
    input: UpdateSentenceInput,
  ) => void;
};

type EditMode = "edit" | "move";

type EditForm = {
  id: number;
  de: string;
  tr: string;
  category: string;
  subcategory: string;
  icon: string;
  grammar: string;
};

function getStatusLabel(
  status: ReturnType<typeof getSrsStatus>,
) {
  if (status === "new") {
    return {
      text: "YENİ",
      className:
        "border-sky-400/20 bg-sky-400/15 text-[#38bdf8]",
    };
  }

  if (status === "due") {
    return {
      text: "TEKRAR",
      className:
        "border-rose-500/20 bg-rose-500/15 text-[#f43f5e]",
    };
  }

  if (status === "learning") {
    return {
      text: "ÖĞRENİYOR",
      className:
        "border-yellow-500/20 bg-yellow-500/15 text-[#eab308]",
    };
  }

  return {
    text: "ÖĞRENİLDİ",
    className:
      "border-emerald-500/20 bg-emerald-500/15 text-[#10b981]",
  };
}

function getSentenceStatusText(
  sentence: Sentence,
) {
  if (sentence.srs.reps === 0) {
    return "Yeni kart";
  }

  return `${sentence.srs.reps} tekrar • ${sentence.srs.interval} gün`;
}

export default function SentenceList({
  categories,
  sentences,
  onDelete,
  onUpdate,
}: SentenceListProps) {
  const [search, setSearch] = useState("");

  const [
    openCategories,
    setOpenCategories,
  ] = useState<Record<string, boolean>>({});

  const [
    openSubcategories,
    setOpenSubcategories,
  ] = useState<Record<string, boolean>>({});

  const [actionSentence, setActionSentence] =
    useState<Sentence | null>(null);

  const [editForm, setEditForm] =
    useState<EditForm | null>(null);

  const [editMode, setEditMode] =
    useState<EditMode>("edit");

  const [message, setMessage] = useState("");

  const normalizedSearch = search
    .trim()
    .toLocaleLowerCase("tr-TR");

  const filteredSentences = useMemo(() => {
    if (!normalizedSearch) {
      return sentences;
    }

    return sentences.filter((sentence) => {
      const searchableText = [
        sentence.de,
        sentence.tr,
        sentence.cat,
        sentence.subcat,
        sentence.grammar,
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      return searchableText.includes(
        normalizedSearch,
      );
    });
  }, [normalizedSearch, sentences]);

  const selectedCategory = useMemo(
    () =>
      categories.find(
        (category) =>
          category.name ===
          editForm?.category,
      ),
    [categories, editForm?.category],
  );

  useEffect(() => {
    function closeWithEscape(
      event: KeyboardEvent,
    ) {
      if (event.key !== "Escape") {
        return;
      }

      if (editForm) {
        setEditForm(null);
        return;
      }

      setActionSentence(null);
    }

    window.addEventListener(
      "keydown",
      closeWithEscape,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        closeWithEscape,
      );
    };
  }, [editForm]);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = window.setTimeout(() => {
      setMessage("");
    }, 2400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [message]);

  function toggleCategory(
    categoryName: string,
  ) {
    setOpenCategories((current) => ({
      ...current,
      [categoryName]:
        !current[categoryName],
    }));
  }

  function toggleSubcategory(key: string) {
    setOpenSubcategories((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function openEditor(
    sentence: Sentence,
    mode: EditMode,
  ) {
    setEditMode(mode);

    setEditForm({
      id: sentence.id,
      de: sentence.de,
      tr: sentence.tr,
      category: sentence.cat,
      subcategory: sentence.subcat || "",
      icon: sentence.icon || "💬",
      grammar: sentence.grammar || "",
    });

    setActionSentence(null);
  }

  function saveEdit() {
    if (!editForm) {
      return;
    }

    if (!editForm.de.trim()) {
      window.alert(
        "Almanca cümle boş bırakılamaz.",
      );
      return;
    }

    if (!editForm.tr.trim()) {
      window.alert(
        "Türkçe anlam boş bırakılamaz.",
      );
      return;
    }

    if (!editForm.category) {
      window.alert(
        "Bir kategori seçmelisin.",
      );
      return;
    }

    onUpdate(editForm.id, {
      de: editForm.de,
      tr: editForm.tr,
      category: editForm.category,
      subcategory: editForm.subcategory,
      icon: editForm.icon,
      grammar: editForm.grammar,
    });

    setEditForm(null);

    setMessage(
      editMode === "move"
        ? "Cümle taşındı. ✅"
        : "Cümle güncellendi. ✅",
    );
  }

  function confirmDelete(
    sentence: Sentence,
  ) {
    const approved = window.confirm(
      `"${plainText(
        sentence.de,
      )}" cümlesi kalıcı olarak silinsin mi?`,
    );

    if (!approved) {
      return;
    }

    onDelete(sentence.id);
    setActionSentence(null);
    setMessage("Cümle silindi.");
  }

  function renderSentence(
    sentence: Sentence,
  ) {
    const status = getStatusLabel(
      getSrsStatus(sentence.srs),
    );

    return (
      <article
        key={sentence.id}
        className="flex items-start gap-2 rounded-xl border border-white/[0.08] bg-[#0f172a] px-2.5 py-2"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-sm">
          {sentence.icon || "💬"}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-extrabold leading-5">
                {hasCloze(sentence.de)
                  ? "🧩 "
                  : ""}

                {plainText(sentence.de)}
              </div>

              <div className="truncate text-[11px] leading-4 text-[#94a3b8]">
                {sentence.tr}
              </div>
            </div>

            <span
              className={[
                "shrink-0 rounded-md border px-1.5 py-0.5 text-[8px] font-extrabold",
                status.className,
              ].join(" ")}
            >
              {status.text}
            </span>
          </div>

          {sentence.grammar && (
            <div className="mt-1 truncate text-[9px] text-[#eab308]">
              💡 {sentence.grammar}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() =>
            setActionSentence(sentence)
          }
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-lg font-black text-[#cbd5e1] transition hover:bg-white/10"
          aria-label="Cümle seçenekleri"
        >
          ⋮
        </button>
      </article>
    );
  }

  return (
    <section>
      <div className="mb-3">
        <input
          type="text"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          className="input-field mb-0"
          placeholder="🔍 Almanca, Türkçe veya kategori ara..."
        />
      </div>

      {categories.map((category) => {
        const categorySentences =
          filteredSentences.filter(
            (sentence) =>
              sentence.cat === category.name,
          );

        if (
          categorySentences.length === 0
        ) {
          return null;
        }

        const directSentences =
          categorySentences.filter(
            (sentence) => !sentence.subcat,
          );

        const subcategoryNames =
          Array.from(
            new Set([
              ...category.subcats,
              ...categorySentences
                .map(
                  (sentence) =>
                    sentence.subcat,
                )
                .filter(
                  (
                    subcategory,
                  ): subcategory is string =>
                    Boolean(subcategory),
                ),
            ]),
          );

        const isCategoryOpen =
          normalizedSearch.length > 0 ||
          openCategories[category.name];

        return (
          <div
            key={category.name}
            className="mb-2.5 overflow-hidden rounded-2xl border border-white/10 bg-[#1e293b]"
          >
            <button
              type="button"
              onClick={() =>
                toggleCategory(
                  category.name,
                )
              }
              className="flex w-full items-center justify-between bg-black/20 px-3 py-2.5 text-left"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-extrabold">
                  {category.icon || "📁"}{" "}
                  {category.name}
                </span>

                <span className="mt-0.5 block text-[10px] text-[#94a3b8]">
                  {categorySentences.length}{" "}
                  cümle
                </span>
              </span>

              <span
                className={[
                  "ml-3 shrink-0 text-[10px] text-[#38bdf8] transition-transform",
                  isCategoryOpen
                    ? "rotate-180"
                    : "",
                ].join(" ")}
              >
                ▼
              </span>
            </button>

            {isCategoryOpen && (
              <div className="space-y-1.5 border-t border-white/10 p-1.5">
                {directSentences.map(
                  renderSentence,
                )}

                {subcategoryNames.map(
                  (subcategoryName) => {
                    const subcategorySentences =
                      categorySentences.filter(
                        (sentence) =>
                          sentence.subcat ===
                          subcategoryName,
                      );

                    if (
                      subcategorySentences.length ===
                      0
                    ) {
                      return null;
                    }

                    const subcategoryKey =
                      `${category.name}|${subcategoryName}`;

                    const isSubcategoryOpen =
                      normalizedSearch.length >
                        0 ||
                      openSubcategories[
                        subcategoryKey
                      ];

                    return (
                      <div
                        key={subcategoryKey}
                        className="overflow-hidden rounded-xl border border-white/10 bg-[#0f172a]/50"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            toggleSubcategory(
                              subcategoryKey,
                            )
                          }
                          className="flex w-full items-center justify-between border-l-[3px] border-[#38bdf8] px-3 py-2 text-left"
                        >
                          <span className="truncate text-xs font-extrabold text-[#cbd5e1]">
                            📄 {subcategoryName}
                          </span>

                          <span className="ml-2 shrink-0 text-[9px] text-[#94a3b8]">
                            {
                              subcategorySentences.length
                            }{" "}
                            {isSubcategoryOpen
                              ? "▲"
                              : "▼"}
                          </span>
                        </button>

                        {isSubcategoryOpen && (
                          <div className="space-y-1.5 border-t border-white/10 p-1.5">
                            {subcategorySentences.map(
                              renderSentence,
                            )}
                          </div>
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </div>
        );
      })}

      {filteredSentences.length === 0 && (
        <div className="empty-msg">
          <div className="big-emoji">
            📭
          </div>

          {search
            ? "Aramana uygun cümle bulunamadı."
            : "Henüz cümle yok."}
        </div>
      )}

      {message && (
        <div className="fixed bottom-24 left-1/2 z-[140] w-[calc(100%-32px)] max-w-[420px] -translate-x-1/2 rounded-xl border border-white/10 bg-[#1e293b] px-4 py-3 text-center text-xs font-extrabold shadow-2xl">
          {message}
        </div>
      )}

      {actionSentence && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-black/70 px-3 pb-3 pt-10 backdrop-blur-sm sm:items-center"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setActionSentence(null);
            }
          }}
        >
          <div className="w-full max-w-[520px] overflow-hidden rounded-[22px] border border-white/10 bg-[#1e293b] shadow-2xl">
            <div className="flex items-start justify-between border-b border-white/10 px-4 py-3">
              <div className="min-w-0 pr-3">
                <div className="truncate text-sm font-extrabold">
                  {actionSentence.icon ||
                    "💬"}{" "}
                  {plainText(
                    actionSentence.de,
                  )}
                </div>

                <div className="mt-1 truncate text-[10px] text-[#94a3b8]">
                  {actionSentence.cat}

                  {actionSentence.subcat
                    ? ` › ${actionSentence.subcat}`
                    : ""}

                  {" • "}

                  {getSentenceStatusText(
                    actionSentence,
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setActionSentence(null)
                }
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 p-3">
              <button
                type="button"
                onClick={() =>
                  openEditor(
                    actionSentence,
                    "edit",
                  )
                }
                className="rounded-xl border border-sky-400/25 bg-sky-400/10 px-3 py-3 text-xs font-extrabold text-[#38bdf8]"
              >
                ✏️ Düzenle
              </button>

              <button
                type="button"
                onClick={() =>
                  openEditor(
                    actionSentence,
                    "move",
                  )
                }
                className="rounded-xl border border-purple-400/25 bg-purple-400/10 px-3 py-3 text-xs font-extrabold text-[#c084fc]"
              >
                📂 Taşı
              </button>

              <button
                type="button"
                onClick={() =>
                  confirmDelete(
                    actionSentence,
                  )
                }
                className="col-span-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-3 text-xs font-extrabold text-[#f43f5e]"
              >
                🗑️ Cümleyi Sil
              </button>
            </div>

            <div className="border-t border-white/10 p-3">
              <button
                type="button"
                onClick={() =>
                  setActionSentence(null)
                }
                className="w-full rounded-xl bg-[#0f172a] px-3 py-3 text-xs font-extrabold"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {editForm && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 px-3 py-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setEditForm(null);
            }
          }}
        >
          <div className="flex max-h-[calc(100dvh-32px)] w-full max-w-[560px] flex-col overflow-hidden rounded-[20px] border border-white/10 bg-[#1e293b] shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <div className="text-base font-extrabold">
                  {editMode === "move"
                    ? "📂 Cümleyi Taşı"
                    : "✏️ Cümleyi Düzenle"}
                </div>

                <div className="mt-0.5 text-[10px] text-[#94a3b8]">
                  {editMode === "move"
                    ? "Yeni kategori ve varsa alt kategoriyi seç."
                    : "Cümle ve kategori bilgilerini düzenle."}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setEditForm(null)
                }
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {editMode === "edit" && (
                <>
                  <label className="form-label">
                    İkon
                  </label>

                  <input
                    type="text"
                    value={editForm.icon}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        icon:
                          event.target.value,
                      })
                    }
                    className="input-field"
                    placeholder="💬"
                    maxLength={8}
                  />

                  <label className="form-label">
                    Almanca cümle
                  </label>

                  <textarea
                    value={editForm.de}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        de:
                          event.target.value,
                      })
                    }
                    className="input-field min-h-[82px] resize-y"
                    placeholder="Almanca cümle"
                  />

                  <label className="form-label">
                    Türkçe anlam
                  </label>

                  <textarea
                    value={editForm.tr}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        tr:
                          event.target.value,
                      })
                    }
                    className="input-field min-h-[72px] resize-y"
                    placeholder="Türkçe anlam"
                  />
                </>
              )}

              <label className="form-label">
                Kategori
              </label>

              <select
                value={editForm.category}
                onChange={(event) =>
                  setEditForm({
                    ...editForm,
                    category:
                      event.target.value,
                    subcategory: "",
                  })
                }
                className="input-field"
              >
                {categories.map(
                  (category) => (
                    <option
                      key={category.name}
                      value={category.name}
                    >
                      {category.icon ||
                        "📁"}{" "}
                      {category.name}
                    </option>
                  ),
                )}
              </select>

              <label className="form-label">
                Alt kategori
              </label>

              <select
                value={
                  editForm.subcategory
                }
                onChange={(event) =>
                  setEditForm({
                    ...editForm,
                    subcategory:
                      event.target.value,
                  })
                }
                className={
                  editMode === "move"
                    ? "input-field mb-0"
                    : "input-field"
                }
              >
                <option value="">
                  Alt kategori yok
                </option>

                {selectedCategory?.subcats.map(
                  (subcategory) => (
                    <option
                      key={subcategory}
                      value={subcategory}
                    >
                      {subcategory}
                    </option>
                  ),
                )}
              </select>

              {editMode === "edit" && (
                <>
                  <label className="form-label">
                    Gramer notu
                  </label>

                  <textarea
                    value={editForm.grammar}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        grammar:
                          event.target.value,
                      })
                    }
                    className="input-field mb-0 min-h-[68px] resize-y"
                    placeholder="İsteğe bağlı gramer notu"
                  />
                </>
              )}
            </div>

            <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-white/10 bg-[#1e293b] px-4 py-3">
              <button
                type="button"
                onClick={() =>
                  setEditForm(null)
                }
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-[#cbd5e1]"
              >
                Vazgeç
              </button>

              <button
                type="button"
                onClick={saveEdit}
                className="rounded-lg border border-emerald-400/30 bg-[#10b981] px-3 py-2 text-xs font-extrabold text-white"
              >
                {editMode === "move"
                  ? "📂 Taşı"
                  : "💾 Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
