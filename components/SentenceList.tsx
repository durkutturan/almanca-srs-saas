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
  subsubcategory?: string;
  icon: string;
  grammar: string;
};

type SentenceDestination = {
  category: string;
  subcategory?: string;
  subsubcategory?: string;
};

type SentenceListProps = {
  categories: Category[];
  sentences: Sentence[];
  onDelete: (sentenceId: number) => void;
  onDeleteMany?: (sentenceIds: number[]) => void;
  onMoveMany?: (
    sentenceIds: number[],
    destination: SentenceDestination,
  ) => boolean;
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
  subsubcategory: string;
  icon: string;
  grammar: string;
};

type MoveState = {
  ids: number[];
  category: string;
  subcategory: string;
  subsubcategory: string;
};

type DeleteState = {
  ids: number[];
  label: string;
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

function getSentenceStatusText(sentence: Sentence) {
  if (sentence.srs.reps === 0) {
    return "Yeni kart";
  }

  return `${sentence.srs.reps} tekrar • ${sentence.srs.interval} gün`;
}

export default function SentenceList({
  categories,
  sentences,
  onDelete,
  onDeleteMany,
  onMoveMany,
  onUpdate,
}: SentenceListProps) {
  const [search, setSearch] = useState("");
  const [openCategories, setOpenCategories] = useState<
    Record<string, boolean>
  >({});
  const [openSubcategories, setOpenSubcategories] = useState<
    Record<string, boolean>
  >({});
  const [openSubsubcategories, setOpenSubsubcategories] = useState<
    Record<string, boolean>
  >({});
  const [actionSentence, setActionSentence] =
    useState<Sentence | null>(null);
  const [editForm, setEditForm] =
    useState<EditForm | null>(null);
  const [moveState, setMoveState] =
    useState<MoveState | null>(null);
  const [deleteState, setDeleteState] =
    useState<DeleteState | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    new Set(),
  );
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
        sentence.subsubcat,
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
        (category) => category.name === editForm?.category,
      ),
    [categories, editForm?.category],
  );

  const moveCategory = useMemo(
    () =>
      categories.find(
        (category) => category.name === moveState?.category,
      ),
    [categories, moveState?.category],
  );

  const visibleIds = useMemo(
    () => filteredSentences.map((sentence) => sentence.id),
    [filteredSentences],
  );

  useEffect(() => {
    function closeWithEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (deleteState) {
        setDeleteState(null);
      } else if (moveState) {
        setMoveState(null);
      } else if (editForm) {
        setEditForm(null);
      } else {
        setActionSentence(null);
      }
    }

    window.addEventListener("keydown", closeWithEscape);
    return () => {
      window.removeEventListener("keydown", closeWithEscape);
    };
  }, [deleteState, editForm, moveState]);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = window.setTimeout(() => {
      setMessage("");
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    setSelectedIds((current) => {
      const available = new Set(sentences.map((sentence) => sentence.id));
      return new Set(
        Array.from(current).filter((id) => available.has(id)),
      );
    });
  }, [sentences]);

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

  function toggleSubsubcategory(key: string) {
    setOpenSubsubcategories((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function toggleSentenceSelection(sentenceId: number) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(sentenceId)) {
        next.delete(sentenceId);
      } else {
        next.add(sentenceId);
      }
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedIds(new Set(visibleIds));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function openEditor(sentence: Sentence) {
    setEditForm({
      id: sentence.id,
      de: sentence.de,
      tr: sentence.tr,
      category: sentence.cat,
      subcategory: sentence.subcat || "",
      subsubcategory: sentence.subsubcat || "",
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
      subsubcategory: editForm.subsubcategory,
      icon: editForm.icon,
      grammar: editForm.grammar,
    });

    setEditForm(null);
    setMessage("Cümle güncellendi. ✅");
  }

  function openMove(ids: number[], sentence?: Sentence) {
    const firstCategory = sentence?.cat || categories[0]?.name || "";
    setMoveState({
      ids,
      category: firstCategory,
      subcategory: sentence?.subcat || "",
      subsubcategory: sentence?.subsubcat || "",
    });
    setActionSentence(null);
  }

  function saveMove() {
    if (!moveState || !moveState.category) {
      return;
    }

    if (!onMoveMany) {
      const selectedSentences = sentences.filter((sentence) =>
        moveState.ids.includes(sentence.id),
      );

      selectedSentences.forEach((sentence) => {
        onUpdate(sentence.id, {
          de: sentence.de,
          tr: sentence.tr,
          category: moveState.category,
          subcategory: moveState.subcategory,
          subsubcategory: moveState.subsubcategory,
          icon: sentence.icon,
          grammar: sentence.grammar,
        });
      });
    } else {
      const moved = onMoveMany(moveState.ids, {
        category: moveState.category,
        subcategory: moveState.subcategory,
        subsubcategory: moveState.subsubcategory,
      });

      if (!moved) {
        return;
      }
    }

    const count = moveState.ids.length;
    setMoveState(null);
    clearSelection();
    setMessage(
      count === 1
        ? "Cümle taşındı. ✅"
        : `${count} cümle taşındı. ✅`,
    );
  }

  function requestDelete(ids: number[], label: string) {
    setDeleteState({ ids, label });
    setActionSentence(null);
  }

  function confirmDelete() {
    if (!deleteState) {
      return;
    }

    if (deleteState.ids.length === 1) {
      onDelete(deleteState.ids[0]);
    } else if (onDeleteMany) {
      onDeleteMany(deleteState.ids);
    } else {
      deleteState.ids.forEach(onDelete);
    }

    const count = deleteState.ids.length;
    setDeleteState(null);
    clearSelection();
    setMessage(
      count === 1
        ? "Cümle silindi."
        : `${count} cümle silindi.`,
    );
  }

  function renderSentence(sentence: Sentence) {
    const status = getStatusLabel(getSrsStatus(sentence.srs));
    const selected = selectedIds.has(sentence.id);

    return (
      <article
        key={sentence.id}
        className={[
          "flex items-start gap-2 rounded-xl border px-2.5 py-2 transition",
          selected
            ? "border-violet-400/45 bg-violet-500/10"
            : "border-white/[0.08] bg-[#0f172a]",
        ].join(" ")}
      >
        <label className="mt-1 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center">
          <input
            type="checkbox"
            checked={selected}
            onChange={() =>
              toggleSentenceSelection(sentence.id)
            }
            className="h-4 w-4 accent-violet-500"
            aria-label="Cümleyi seç"
          />
        </label>

        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-sm">
          {sentence.icon || "💬"}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-extrabold leading-5">
                {hasCloze(sentence.de) ? "🧩 " : ""}
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
          onClick={() => setActionSentence(sentence)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-lg font-black text-[#cbd5e1] transition hover:bg-white/10"
          aria-label="Cümle seçenekleri"
        >
          ⋮
        </button>
      </article>
    );
  }

  const selectedCount = selectedIds.size;

  return (
    <section>
      <div className="mb-3">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="input-field mb-0"
          placeholder="🔍 Almanca, Türkçe veya kategori ara..."
        />
      </div>

      {selectedCount > 0 && (
        <div className="sticky top-2 z-30 mb-3 rounded-2xl border border-violet-400/25 bg-[#1e293b]/95 p-2.5 shadow-2xl backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-violet-200">
              ✓ {selectedCount} cümle seçildi
            </span>
            <button
              type="button"
              onClick={clearSelection}
              className="rounded-lg bg-white/5 px-2 py-1 text-[9px] font-bold text-[#94a3b8]"
            >
              Seçimi temizle
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={selectAllVisible}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-[10px] font-extrabold"
            >
              Tümünü seç
            </button>
            <button
              type="button"
              onClick={() =>
                openMove(Array.from(selectedIds))
              }
              className="rounded-lg border border-violet-400/25 bg-violet-400/10 px-2 py-2 text-[10px] font-extrabold text-violet-200"
            >
              📂 Taşı
            </button>
            <button
              type="button"
              onClick={() =>
                requestDelete(
                  Array.from(selectedIds),
                  `${selectedCount} seçili cümle`,
                )
              }
              className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-2 py-2 text-[10px] font-extrabold text-rose-300"
            >
              🗑️ Sil
            </button>
          </div>
        </div>
      )}

      {categories.map((category) => {
        const categorySentences = filteredSentences.filter(
          (sentence) => sentence.cat === category.name,
        );

        if (categorySentences.length === 0) {
          return null;
        }

        const directSentences = categorySentences.filter(
          (sentence) => !sentence.subcat,
        );

        const subcategoryNames = Array.from(
          new Set([
            ...category.subcats,
            ...categorySentences
              .map((sentence) => sentence.subcat)
              .filter(Boolean),
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
              onClick={() => toggleCategory(category.name)}
              className="flex w-full items-center justify-between bg-black/20 px-3 py-2.5 text-left"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-extrabold">
                  {category.icon || "📁"} {category.name}
                </span>
                <span className="mt-0.5 block text-[10px] text-[#94a3b8]">
                  {categorySentences.length} cümle
                </span>
              </span>
              <span
                className={[
                  "ml-3 shrink-0 text-[10px] text-[#38bdf8] transition-transform",
                  isCategoryOpen ? "rotate-180" : "",
                ].join(" ")}
              >
                ▼
              </span>
            </button>

            {isCategoryOpen && (
              <div className="space-y-1.5 border-t border-white/10 p-1.5">
                {directSentences.map(renderSentence)}

                {subcategoryNames.map((subcategoryName) => {
                  const allSubcategorySentences =
                    categorySentences.filter(
                      (sentence) =>
                        sentence.subcat === subcategoryName,
                    );

                  if (allSubcategorySentences.length === 0) {
                    return null;
                  }

                  const directSubcategorySentences =
                    allSubcategorySentences.filter(
                      (sentence) => !sentence.subsubcat,
                    );

                  const configuredChildren =
                    category.subsubcats?.[subcategoryName] ?? [];
                  const subsubcategoryNames = Array.from(
                    new Set([
                      ...configuredChildren,
                      ...allSubcategorySentences
                        .map((sentence) => sentence.subsubcat || "")
                        .filter(Boolean),
                    ]),
                  );

                  const subcategoryKey =
                    `${category.name}|${subcategoryName}`;
                  const isSubcategoryOpen =
                    normalizedSearch.length > 0 ||
                    openSubcategories[subcategoryKey];

                  return (
                    <div
                      key={subcategoryKey}
                      className="overflow-hidden rounded-xl border border-white/10 bg-[#0f172a]/50"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          toggleSubcategory(subcategoryKey)
                        }
                        className="flex w-full items-center justify-between border-l-[3px] border-[#38bdf8] px-3 py-2 text-left"
                      >
                        <span className="truncate text-xs font-extrabold text-[#cbd5e1]">
                          {subcategoryName}
                        </span>
                        <span className="ml-2 shrink-0 text-[9px] text-[#94a3b8]">
                          {allSubcategorySentences.length}{" "}
                          {isSubcategoryOpen ? "▲" : "▼"}
                        </span>
                      </button>

                      {isSubcategoryOpen && (
                        <div className="space-y-1.5 border-t border-white/10 p-1.5">
                          {directSubcategorySentences.map(
                            renderSentence,
                          )}

                          {subsubcategoryNames.map(
                            (subsubcategoryName) => {
                              const childSentences =
                                allSubcategorySentences.filter(
                                  (sentence) =>
                                    sentence.subsubcat ===
                                    subsubcategoryName,
                                );

                              if (childSentences.length === 0) {
                                return null;
                              }

                              const childKey = `${subcategoryKey}|${subsubcategoryName}`;
                              const childOpen =
                                normalizedSearch.length > 0 ||
                                openSubsubcategories[childKey];

                              return (
                                <div
                                  key={childKey}
                                  className="ml-2 overflow-hidden rounded-lg border border-violet-400/15 bg-violet-400/[0.04]"
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleSubsubcategory(
                                        childKey,
                                      )
                                    }
                                    className="flex w-full items-center justify-between border-l-[3px] border-violet-400 px-3 py-2 text-left"
                                  >
                                    <span className="truncate text-[11px] font-extrabold text-violet-200">
                                      ↳ {subsubcategoryName}
                                    </span>
                                    <span className="text-[9px] text-[#94a3b8]">
                                      {childSentences.length}{" "}
                                      {childOpen ? "▲" : "▼"}
                                    </span>
                                  </button>

                                  {childOpen && (
                                    <div className="space-y-1.5 border-t border-violet-400/10 p-1.5">
                                      {childSentences.map(
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

      {message && (
        <div className="fixed bottom-24 left-1/2 z-[140] w-[calc(100%-32px)] max-w-[420px] -translate-x-1/2 rounded-xl border border-white/10 bg-[#1e293b] px-4 py-3 text-center text-xs font-extrabold shadow-2xl">
          {message}
        </div>
      )}

      {actionSentence && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-black/70 px-3 pb-3 pt-10 backdrop-blur-sm sm:items-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setActionSentence(null);
            }
          }}
        >
          <div className="w-full max-w-[520px] overflow-hidden rounded-[22px] border border-white/10 bg-[#1e293b] shadow-2xl">
            <div className="flex items-start justify-between border-b border-white/10 px-4 py-3">
              <div className="min-w-0 pr-3">
                <div className="truncate text-sm font-extrabold">
                  {actionSentence.icon || "💬"}{" "}
                  {plainText(actionSentence.de)}
                </div>
                <div className="mt-1 truncate text-[10px] text-[#94a3b8]">
                  {[
                    actionSentence.cat,
                    actionSentence.subcat,
                    actionSentence.subsubcat,
                  ]
                    .filter(Boolean)
                    .join(" › ")}{" "}
                  • {getSentenceStatusText(actionSentence)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActionSentence(null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 p-3">
              <button
                type="button"
                onClick={() => openEditor(actionSentence)}
                className="rounded-xl border border-sky-400/25 bg-sky-400/10 px-3 py-3 text-xs font-extrabold text-[#38bdf8]"
              >
                ✏️ Düzenle
              </button>
              <button
                type="button"
                onClick={() =>
                  openMove([actionSentence.id], actionSentence)
                }
                className="rounded-xl border border-purple-400/25 bg-purple-400/10 px-3 py-3 text-xs font-extrabold text-[#c084fc]"
              >
                📂 Taşı
              </button>
              <button
                type="button"
                onClick={() =>
                  requestDelete(
                    [actionSentence.id],
                    `“${plainText(actionSentence.de)}”`,
                  )
                }
                className="col-span-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-3 text-xs font-extrabold text-[#f43f5e]"
              >
                🗑️ Cümleyi Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {editForm && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 px-3 py-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
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
              <label className="form-label">İkon</label>
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

              <label className="form-label">Almanca cümle</label>
              <textarea
                value={editForm.de}
                onChange={(event) =>
                  setEditForm({
                    ...editForm,
                    de: event.target.value,
                  })
                }
                className="input-field min-h-[82px] resize-y"
              />

              <label className="form-label">Türkçe anlam</label>
              <textarea
                value={editForm.tr}
                onChange={(event) =>
                  setEditForm({
                    ...editForm,
                    tr: event.target.value,
                  })
                }
                className="input-field min-h-[72px] resize-y"
              />

              <label className="form-label">Kategori</label>
              <select
                value={editForm.category}
                onChange={(event) =>
                  setEditForm({
                    ...editForm,
                    category: event.target.value,
                    subcategory: "",
                    subsubcategory: "",
                  })
                }
                className="input-field"
              >
                {categories.map((category) => (
                  <option
                    key={category.name}
                    value={category.name}
                  >
                    {category.icon || "📁"} {category.name}
                  </option>
                ))}
              </select>

              <label className="form-label">Alt kategori</label>
              <select
                value={editForm.subcategory}
                onChange={(event) =>
                  setEditForm({
                    ...editForm,
                    subcategory: event.target.value,
                    subsubcategory: "",
                  })
                }
                className="input-field"
              >
                <option value="">Alt kategori yok</option>
                {selectedCategory?.subcats.map((subcategory) => (
                  <option key={subcategory} value={subcategory}>
                    {subcategory}
                  </option>
                ))}
              </select>

              {editForm.subcategory && (
                <>
                  <label className="form-label">
                    Alt-alt kategori
                  </label>
                  <select
                    value={editForm.subsubcategory}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        subsubcategory: event.target.value,
                      })
                    }
                    className="input-field"
                  >
                    <option value="">
                      Alt-alt kategori yok
                    </option>
                    {(selectedCategory?.subsubcats?.[
                      editForm.subcategory
                    ] ?? []).map((child) => (
                      <option key={child} value={child}>
                        {child}
                      </option>
                    ))}
                  </select>
                </>
              )}

              <label className="form-label">Gramer notu</label>
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

      {moveState && (
        <div
          className="fixed inset-0 z-[125] flex items-center justify-center bg-black/75 px-3 py-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setMoveState(null);
            }
          }}
        >
          <div className="w-full max-w-[520px] overflow-hidden rounded-[22px] border border-violet-400/20 bg-[#1e293b] shadow-2xl">
            <div className="border-b border-white/10 px-4 py-4">
              <div className="text-base font-black">
                📂 {moveState.ids.length} cümleyi taşı
              </div>
              <div className="mt-1 text-[10px] text-[#94a3b8]">
                Hedef üst kategori, alt kategori ve gerekiyorsa
                alt-alt kategoriyi seç.
              </div>
            </div>

            <div className="space-y-2 p-4">
              <select
                value={moveState.category}
                onChange={(event) =>
                  setMoveState({
                    ...moveState,
                    category: event.target.value,
                    subcategory: "",
                    subsubcategory: "",
                  })
                }
                className="input-field"
              >
                {categories.map((category) => (
                  <option key={category.name} value={category.name}>
                    {category.icon || "📁"} {category.name}
                  </option>
                ))}
              </select>

              <select
                value={moveState.subcategory}
                onChange={(event) =>
                  setMoveState({
                    ...moveState,
                    subcategory: event.target.value,
                    subsubcategory: "",
                  })
                }
                className="input-field"
              >
                <option value="">Doğrudan üst kategori</option>
                {moveCategory?.subcats.map((subcategory) => (
                  <option key={subcategory} value={subcategory}>
                    {subcategory}
                  </option>
                ))}
              </select>

              {moveState.subcategory && (
                <select
                  value={moveState.subsubcategory}
                  onChange={(event) =>
                    setMoveState({
                      ...moveState,
                      subsubcategory: event.target.value,
                    })
                  }
                  className="input-field mb-0"
                >
                  <option value="">
                    Doğrudan alt kategori
                  </option>
                  {(moveCategory?.subsubcats?.[
                    moveState.subcategory
                  ] ?? []).map((child) => (
                    <option key={child} value={child}>
                      {child}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-white/10 p-3">
              <button
                type="button"
                onClick={() => setMoveState(null)}
                className="rounded-xl bg-[#0f172a] px-3 py-3 text-xs font-extrabold"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={saveMove}
                className="rounded-xl bg-violet-600 px-3 py-3 text-xs font-extrabold text-white"
              >
                📂 Taşı
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteState && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setDeleteState(null);
            }
          }}
        >
          <div className="w-full max-w-[440px] overflow-hidden rounded-[24px] border border-rose-500/25 bg-[#1e293b] shadow-2xl">
            <div className="px-5 pb-4 pt-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-3xl">
                🗑️
              </div>
              <h3 className="mt-3 text-lg font-black">
                Kalıcı olarak silinsin mi?
              </h3>
              <p className="mt-2 text-xs leading-5 text-[#94a3b8]">
                {deleteState.label} kalıcı olarak silinecek. Bu işlem
                geri alınamaz.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-white/10 p-4">
              <button
                type="button"
                onClick={() => setDeleteState(null)}
                className="rounded-xl border border-white/10 bg-[#0f172a] px-3 py-3 text-xs font-extrabold"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-xl border border-rose-500/30 bg-rose-600 px-3 py-3 text-xs font-extrabold text-white"
              >
                Kalıcı Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
