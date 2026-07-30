"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getSrsStatus,
  hasCloze,
  plainText,
} from "@/lib/srs";
import type { Category, Sentence } from "@/types/app";

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
      className: "bg-sky-400/20 text-[#38bdf8]",
    };
  }

  if (status === "due") {
    return {
      text: "TEKRAR",
      className: "bg-rose-500/20 text-[#f43f5e]",
    };
  }

  if (status === "learning") {
    return {
      text: "ÖĞRENİLİYOR",
      className: "bg-yellow-500/20 text-[#eab308]",
    };
  }

  return {
    text: "ÖĞRENİLDİ",
    className: "bg-emerald-500/20 text-[#10b981]",
  };
}

export default function SentenceList({
  categories,
  sentences,
  onDelete,
  onUpdate,
}: SentenceListProps) {
  const [search, setSearch] = useState("");
  const [openCategories, setOpenCategories] = useState<
    Record<string, boolean>
  >({});
  const [openSubcategories, setOpenSubcategories] = useState<
    Record<string, boolean>
  >({});
  const [editForm, setEditForm] =
    useState<EditForm | null>(null);

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

      return searchableText.includes(normalizedSearch);
    });
  }, [normalizedSearch, sentences]);

  const selectedCategory = useMemo(
    () =>
      categories.find(
        (category) =>
          category.name === editForm?.category,
      ),
    [categories, editForm?.category],
  );

  useEffect(() => {
    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setEditForm(null);
      }
    }

    window.addEventListener("keydown", closeWithEscape);

    return () => {
      window.removeEventListener("keydown", closeWithEscape);
    };
  }, []);

  function toggleCategory(categoryName: string) {
    setOpenCategories((current) => ({
      ...current,
      [categoryName]: !current[categoryName],
    }));
  }

  function toggleSubcategory(key: string) {
    setOpenSubcategories((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function confirmDelete(sentenceId: number) {
    const approved = window.confirm(
      "Bu cümle kalıcı olarak silinsin mi?",
    );

    if (approved) {
      onDelete(sentenceId);
    }
  }

  function openEdit(sentence: Sentence) {
    setEditForm({
      id: sentence.id,
      de: sentence.de,
      tr: sentence.tr,
      category: sentence.cat,
      subcategory: sentence.subcat || "Genel",
      icon: sentence.icon || "💬",
      grammar: sentence.grammar || "",
    });
  }

  function saveEdit() {
    if (!editForm) {
      return;
    }

    if (!editForm.de.trim()) {
      window.alert("Almanca cümle boş bırakılamaz.");
      return;
    }

    if (!editForm.tr.trim()) {
      window.alert("Türkçe anlam boş bırakılamaz.");
      return;
    }

    if (!editForm.category) {
      window.alert("Bir kategori seçmelisin.");
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
  }

  return (
    <section>
      <div className="mb-3.5">
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

        if (categorySentences.length === 0) {
          return null;
        }

        const isCategoryOpen =
          normalizedSearch.length > 0 ||
          openCategories[category.name];

        const subcategoryNames = Array.from(
          new Set([
            "Genel",
            ...category.subcats,
            ...categorySentences.map(
              (sentence) =>
                sentence.subcat || "Genel",
            ),
          ]),
        );

        return (
          <div
            key={category.name}
            className="mb-3 overflow-hidden rounded-2xl border border-white/10 bg-[#1e293b]"
          >
            <button
              type="button"
              onClick={() =>
                toggleCategory(category.name)
              }
              className="flex w-full items-center justify-between border-b border-white/10 bg-black/20 p-3 text-left text-[15px] font-bold"
            >
              <span>
                {category.icon || "📁"}{" "}
                {category.name}

                <span className="ml-1.5 text-[10px] opacity-60">
                  {categorySentences.length} cümle
                </span>
              </span>

              <span className="text-xs text-[#38bdf8]">
                {isCategoryOpen ? "▲" : "▼"}
              </span>
            </button>

            {isCategoryOpen && (
              <div className="p-1">
                {subcategoryNames.map(
                  (subcategoryName) => {
                    const subcategorySentences =
                      categorySentences.filter(
                        (sentence) =>
                          (sentence.subcat ||
                            "Genel") ===
                          subcategoryName,
                      );

                    if (
                      subcategorySentences.length === 0
                    ) {
                      return null;
                    }

                    const subcategoryKey = `${category.name}|${subcategoryName}`;

                    const isSubcategoryOpen =
                      normalizedSearch.length > 0 ||
                      openSubcategories[
                        subcategoryKey
                      ];

                    return (
                      <div
                        key={subcategoryKey}
                        className="border-b border-white/10 last:border-b-0"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            toggleSubcategory(
                              subcategoryKey,
                            )
                          }
                          className="flex w-full items-center justify-between border-l-[3px] border-[#38bdf8] bg-black/15 px-3 py-2.5 text-left text-[13px] font-extrabold text-[#94a3b8]"
                        >
                          <span>
                            {subcategoryName}
                          </span>

                          <span className="text-[10px] opacity-70">
                            {subcategorySentences.length}{" "}
                            {isSubcategoryOpen
                              ? "▲"
                              : "▼"}
                          </span>
                        </button>

                        {isSubcategoryOpen && (
                          <div className="p-2">
                            {subcategorySentences.map(
                              (sentence) => {
                                const status =
                                  getStatusLabel(
                                    getSrsStatus(
                                      sentence.srs,
                                    ),
                                  );

                                return (
                                  <div
                                    key={sentence.id}
                                    className="mb-2 rounded-xl border border-white/10 border-l-4 border-l-[#a855f7] bg-[#0f172a] p-3 last:mb-0"
                                  >
                                    <div className="flex items-start gap-2.5">
                                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-lg">
                                        {sentence.icon ||
                                          "💬"}
                                      </div>

                                      <div className="min-w-0 flex-1">
                                        <div className="text-sm font-bold leading-5">
                                          {hasCloze(
                                            sentence.de,
                                          )
                                            ? "🧩 "
                                            : ""}

                                          {plainText(
                                            sentence.de,
                                          )}
                                        </div>

                                        <div className="mt-1 text-[12px] leading-4 text-[#94a3b8]">
                                          {sentence.tr}
                                        </div>

                                        {sentence.grammar && (
                                          <div className="mt-2 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-2 py-1.5 text-[10px] text-[#eab308]">
                                            💡{" "}
                                            {sentence.grammar}
                                          </div>
                                        )}
                                      </div>

                                      <span
                                        className={[
                                          "shrink-0 rounded-lg px-1.5 py-0.5 text-[9px] font-extrabold",
                                          status.className,
                                        ].join(" ")}
                                      >
                                        {status.text}
                                      </span>
                                    </div>

                                    <div className="mt-3 flex gap-2 border-t border-white/10 pt-2.5">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          openEdit(
                                            sentence,
                                          )
                                        }
                                        className="flex-1 rounded-lg border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-[11px] font-extrabold text-[#38bdf8]"
                                      >
                                        ✏️ Düzenle
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          confirmDelete(
                                            sentence.id,
                                          )
                                        }
                                        className="flex-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] font-extrabold text-[#f43f5e]"
                                      >
                                        🗑️ Sil
                                      </button>
                                    </div>
                                  </div>
                                );
                              },
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
          <div className="big-emoji">📭</div>

          {search
            ? "Aramana uygun cümle bulunamadı."
            : "Henüz cümle yok."}
        </div>
      )}

      {editForm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-3 py-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setEditForm(null);
            }
          }}
        >
          <div className="flex max-h-[calc(100dvh-32px)] w-full max-w-[560px] flex-col overflow-hidden rounded-[20px] border border-white/10 bg-[#1e293b] shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <div className="text-base font-extrabold">
                  ✏️ Cümleyi Düzenle
                </div>

                <div className="mt-0.5 text-[10px] text-[#94a3b8]">
                  Cümle ve kategori bilgilerini düzenle.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditForm(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              <label className="form-label">
                İkon
              </label>

              <input
                type="text"
                value={editForm.icon}
                onChange={(event) =>
                  setEditForm({
                    ...editForm,
                    icon: event.target.value,
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
                    de: event.target.value,
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
                    tr: event.target.value,
                  })
                }
                className="input-field min-h-[72px] resize-y"
                placeholder="Türkçe anlam"
              />

              <label className="form-label">
                Kategori
              </label>

              <select
                value={editForm.category}
                onChange={(event) => {
                  const category =
                    categories.find(
                      (item) =>
                        item.name ===
                        event.target.value,
                    );

                  setEditForm({
                    ...editForm,
                    category: event.target.value,
                    subcategory:
                      category?.subcats[0] ||
                      "Genel",
                  });
                }}
                className="input-field"
              >
                {categories.map((category) => (
                  <option
                    key={category.name}
                    value={category.name}
                  >
                    {category.icon || "📁"}{" "}
                    {category.name}
                  </option>
                ))}
              </select>

              <label className="form-label">
                Alt kategori
              </label>

              <select
                value={editForm.subcategory}
                onChange={(event) =>
                  setEditForm({
                    ...editForm,
                    subcategory:
                      event.target.value,
                  })
                }
                className="input-field"
              >
                <option value="Genel">
                  Genel
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

              <label className="form-label">
                Gramer notu
              </label>

              <textarea
                value={editForm.grammar}
                onChange={(event) =>
                  setEditForm({
                    ...editForm,
                    grammar: event.target.value,
                  })
                }
                className="input-field mb-0 min-h-[68px] resize-y"
                placeholder="İsteğe bağlı gramer notu"
              />
            </div>

            <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-white/10 bg-[#1e293b] px-4 py-3">
              <button
                type="button"
                onClick={() => setEditForm(null)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-[#cbd5e1]"
              >
                Vazgeç
              </button>

              <button
                type="button"
                onClick={saveEdit}
                className="rounded-lg border border-emerald-400/30 bg-[#10b981] px-3 py-2 text-xs font-extrabold text-white"
              >
                💾 Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
