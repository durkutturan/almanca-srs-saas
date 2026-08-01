"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getSrsStatus,
  plainText,
} from "@/lib/srs";
import type {
  Category,
  Sentence,
} from "@/types/app";

type CategoryManagerProps = {
  isOpen: boolean;
  categories: Category[];
  sentences?: Sentence[];
  onClose: () => void;
  onAddCategory: (
    name: string,
    icon: string,
  ) => boolean;
  onUpdateCategory: (
    oldName: string,
    newName: string,
    icon: string,
  ) => boolean;
  onDeleteCategory: (
    categoryName: string,
  ) => boolean;
  onAddSubcategory: (
    categoryName: string,
    subcategoryName: string,
  ) => boolean;
  onRenameSubcategory: (
    categoryName: string,
    oldName: string,
    newName: string,
  ) => boolean;
  onDeleteSubcategory: (
    categoryName: string,
    subcategoryName: string,
  ) => boolean;
  onResetCategorySrs?: (
    categoryName: string,
  ) => void;
  onResetSubcategorySrs?: (
    categoryName: string,
    subcategoryName: string,
  ) => void;
};

type EditingCategory = {
  oldName: string;
  name: string;
  icon: string;
};

type EditingSubcategory = {
  categoryName: string;
  oldName: string;
  name: string;
};

type ActionTarget =
  | {
      type: "category";
      categoryName: string;
      subcategoryName?: never;
    }
  | {
      type: "subcategory";
      categoryName: string;
      subcategoryName: string;
    };

type GroupStats = {
  total: number;
  newCount: number;
  dueCount: number;
  learningCount: number;
  learnedCount: number;
};

function normalizeSubcategory(value: string) {
  return value || "Genel";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getGroupStats(
  groupSentences: Sentence[],
): GroupStats {
  const stats: GroupStats = {
    total: groupSentences.length,
    newCount: 0,
    dueCount: 0,
    learningCount: 0,
    learnedCount: 0,
  };

  groupSentences.forEach((sentence) => {
    const status = getSrsStatus(sentence.srs);

    if (status === "new") {
      stats.newCount += 1;
    } else if (status === "due") {
      stats.dueCount += 1;
    } else if (status === "learning") {
      stats.learningCount += 1;
    } else {
      stats.learnedCount += 1;
    }
  });

  return stats;
}

export default function CategoryManager({
  isOpen,
  categories,
  sentences = [],
  onClose,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onAddSubcategory,
  onRenameSubcategory,
  onDeleteSubcategory,
  onResetCategorySrs,
  onResetSubcategorySrs,
}: CategoryManagerProps) {
  const [newCategoryName, setNewCategoryName] =
    useState("");

  const [newCategoryIcon, setNewCategoryIcon] =
    useState("📁");

  const [
    newSubcategories,
    setNewSubcategories,
  ] = useState<Record<string, string>>({});

  const [
    editingCategory,
    setEditingCategory,
  ] = useState<EditingCategory | null>(null);

  const [
    editingSubcategory,
    setEditingSubcategory,
  ] =
    useState<EditingSubcategory | null>(null);

  const [actionTarget, setActionTarget] =
    useState<ActionTarget | null>(null);

  const [message, setMessage] = useState("");

  const categoryByName = useMemo(
    () =>
      new Map(
        categories.map((category) => [
          category.name,
          category,
        ]),
      ),
    [categories],
  );

  useEffect(() => {
    function handleEscape(
      event: KeyboardEvent,
    ) {
      if (event.key !== "Escape") {
        return;
      }

      if (actionTarget) {
        setActionTarget(null);
        return;
      }

      if (
        editingCategory ||
        editingSubcategory
      ) {
        setEditingCategory(null);
        setEditingSubcategory(null);
        return;
      }

      onClose();
    }

    if (isOpen) {
      window.addEventListener(
        "keydown",
        handleEscape,
      );

      document.body.style.overflow =
        "hidden";
    }

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape,
      );

      document.body.style.overflow = "";
    };
  }, [
    isOpen,
    onClose,
    actionTarget,
    editingCategory,
    editingSubcategory,
  ]);

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

  if (!isOpen) {
    return null;
  }

  function getCategorySentences(
    categoryName: string,
  ) {
    return sentences.filter(
      (sentence) =>
        sentence.cat === categoryName,
    );
  }

  function getSubcategorySentences(
    categoryName: string,
    subcategoryName: string,
  ) {
    return sentences.filter(
      (sentence) =>
        sentence.cat === categoryName &&
        normalizeSubcategory(
          sentence.subcat,
        ) === subcategoryName,
    );
  }

  function addCategory() {
    const name = newCategoryName.trim();
    const icon =
      newCategoryIcon.trim() || "📁";

    if (!name) {
      window.alert(
        "Kategori adını yazmalısın.",
      );
      return;
    }

    const added = onAddCategory(
      name,
      icon,
    );

    if (added) {
      setNewCategoryName("");
      setNewCategoryIcon("📁");
      setMessage(
        "Kategori oluşturuldu. ✅",
      );
    }
  }

  function startCategoryEdit(
    categoryName: string,
  ) {
    const category =
      categoryByName.get(categoryName);

    if (!category) {
      return;
    }

    setEditingCategory({
      oldName: category.name,
      name: category.name,
      icon: category.icon || "📁",
    });

    setActionTarget(null);
  }

  function saveCategoryEdit() {
    if (!editingCategory) {
      return;
    }

    const name =
      editingCategory.name.trim();

    const icon =
      editingCategory.icon.trim() || "📁";

    if (!name) {
      window.alert(
        "Kategori adı boş bırakılamaz.",
      );
      return;
    }

    const updated = onUpdateCategory(
      editingCategory.oldName,
      name,
      icon,
    );

    if (updated) {
      setEditingCategory(null);
      setMessage(
        "Kategori güncellendi. ✅",
      );
    }
  }

  function deleteCategory(
    categoryName: string,
  ) {
    const approved = window.confirm(
      `"${categoryName}" kategorisi silinsin mi?\n\nBu kategorideki cümleler başka kategoriye taşınacaktır.`,
    );

    if (!approved) {
      return;
    }

    const deleted =
      onDeleteCategory(categoryName);

    if (deleted) {
      setActionTarget(null);
      setMessage("Kategori silindi.");
    }
  }

  function addSubcategory(
    categoryName: string,
  ) {
    const name =
      newSubcategories[
        categoryName
      ]?.trim() || "";

    if (!name) {
      window.alert(
        "Alt kategori adını yazmalısın.",
      );
      return;
    }

    const added = onAddSubcategory(
      categoryName,
      name,
    );

    if (added) {
      setNewSubcategories(
        (current) => ({
          ...current,
          [categoryName]: "",
        }),
      );

      setMessage(
        "Alt kategori oluşturuldu. ✅",
      );
    }
  }

  function startSubcategoryEdit(
    categoryName: string,
    subcategoryName: string,
  ) {
    if (subcategoryName === "Genel") {
      return;
    }

    setEditingSubcategory({
      categoryName,
      oldName: subcategoryName,
      name: subcategoryName,
    });

    setActionTarget(null);
  }

  function saveSubcategoryEdit() {
    if (!editingSubcategory) {
      return;
    }

    const name =
      editingSubcategory.name.trim();

    if (!name) {
      window.alert(
        "Alt kategori adı boş bırakılamaz.",
      );
      return;
    }

    const updated =
      onRenameSubcategory(
        editingSubcategory.categoryName,
        editingSubcategory.oldName,
        name,
      );

    if (updated) {
      setEditingSubcategory(null);
      setMessage(
        "Alt kategori güncellendi. ✅",
      );
    }
  }

  function deleteSubcategory(
    categoryName: string,
    subcategoryName: string,
  ) {
    if (subcategoryName === "Genel") {
      return;
    }

    const approved = window.confirm(
      `"${subcategoryName}" alt kategorisi silinsin mi?\n\nBu gruptaki cümleler doğrudan üst kategoriye taşınacaktır.`,
    );

    if (!approved) {
      return;
    }

    const deleted =
      onDeleteSubcategory(
        categoryName,
        subcategoryName,
      );

    if (deleted) {
      setActionTarget(null);
      setMessage(
        "Alt kategori silindi.",
      );
    }
  }

  function resetCategorySrs(
    categoryName: string,
  ) {
    if (!onResetCategorySrs) {
      window.alert(
        "SRS sıfırlama bağlantısı bir sonraki adımda eklenecek.",
      );
      return;
    }

    const approved = window.confirm(
      `"${categoryName}" kategorisindeki tüm cümlelerin çalışma ilerlemesi sıfırlansın mı?`,
    );

    if (!approved) {
      return;
    }

    onResetCategorySrs(categoryName);
    setActionTarget(null);

    setMessage(
      "Kategori SRS ilerlemesi sıfırlandı. ✅",
    );
  }

  function resetSubcategorySrs(
    categoryName: string,
    subcategoryName: string,
  ) {
    if (!onResetSubcategorySrs) {
      window.alert(
        "SRS sıfırlama bağlantısı bir sonraki adımda eklenecek.",
      );
      return;
    }

    const approved = window.confirm(
      `"${subcategoryName}" bölümündeki tüm cümlelerin çalışma ilerlemesi sıfırlansın mı?`,
    );

    if (!approved) {
      return;
    }

    onResetSubcategorySrs(
      categoryName,
      subcategoryName,
    );

    setActionTarget(null);

    setMessage(
      "Alt kategori SRS ilerlemesi sıfırlandı. ✅",
    );
  }

  function downloadGroupPdf(
    title: string,
    subtitle: string,
    groupSentences: Sentence[],
  ) {
    if (groupSentences.length === 0) {
      window.alert(
        "Bu bölümde PDF'e aktarılacak cümle bulunmuyor.",
      );
      return;
    }

    const printWindow = window.open(
      "",
      "_blank",
      "width=900,height=760",
    );

    if (!printWindow) {
      window.alert(
        "PDF penceresi açılamadı. Tarayıcı açılır pencere iznini kontrol et.",
      );
      return;
    }

    const rows = groupSentences
      .map(
        (sentence, index) => `
          <article class="sentence">
            <div class="number">
              ${index + 1}
            </div>

            <div class="content">
              <div class="german">
                ${escapeHtml(
                  plainText(sentence.de),
                )}
              </div>

              <div class="turkish">
                ${escapeHtml(sentence.tr)}
              </div>

              ${
                sentence.grammar
                  ? `
                    <div class="grammar">
                      💡 ${escapeHtml(
                        sentence.grammar,
                      )}
                    </div>
                  `
                  : ""
              }
            </div>
          </article>
        `,
      )
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html lang="tr">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(title)}</title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 38px;
              color: #0f172a;
              background: #ffffff;
              font-family: Arial, Helvetica, sans-serif;
            }

            .sheet {
              max-width: 820px;
              margin: 0 auto;
            }

            .header {
              margin-bottom: 26px;
              padding-bottom: 18px;
              border-bottom: 2px solid #0f172a;
            }

            h1 {
              margin: 0;
              font-size: 26px;
            }

            .subtitle {
              margin-top: 7px;
              color: #64748b;
              font-size: 13px;
            }

            .sentence {
              display: flex;
              gap: 13px;
              margin-bottom: 12px;
              padding: 14px;
              border: 1px solid #cbd5e1;
              border-radius: 12px;
              break-inside: avoid;
            }

            .number {
              display: flex;
              width: 28px;
              height: 28px;
              flex: 0 0 28px;
              align-items: center;
              justify-content: center;
              border-radius: 8px;
              color: #ffffff;
              background: #0f172a;
              font-size: 12px;
              font-weight: 700;
            }

            .content {
              min-width: 0;
              flex: 1;
            }

            .german {
              font-size: 16px;
              font-weight: 700;
              line-height: 1.45;
            }

            .turkish {
              margin-top: 5px;
              color: #475569;
              font-size: 14px;
              line-height: 1.45;
            }

            .grammar {
              margin-top: 9px;
              padding: 8px 10px;
              border-radius: 8px;
              color: #854d0e;
              background: #fef9c3;
              font-size: 12px;
              line-height: 1.4;
            }

            .footer {
              margin-top: 24px;
              color: #94a3b8;
              text-align: center;
              font-size: 11px;
            }

            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>

        <body>
          <main class="sheet">
            <header class="header">
              <h1>${escapeHtml(title)}</h1>

              <div class="subtitle">
                ${escapeHtml(subtitle)} •
                ${groupSentences.length} cümle
              </div>
            </header>

            ${rows}

            <div class="footer">
              Almanca Cümle – SRS Pro
            </div>
          </main>

          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
    setActionTarget(null);
  }

  const targetCategory =
    actionTarget
      ? categoryByName.get(
          actionTarget.categoryName,
        )
      : null;

  const targetSentences =
    actionTarget?.type === "category"
      ? getCategorySentences(
          actionTarget.categoryName,
        )
      : actionTarget?.type ===
          "subcategory"
        ? getSubcategorySentences(
            actionTarget.categoryName,
            actionTarget.subcategoryName,
          )
        : [];

  const targetStats =
    getGroupStats(targetSentences);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 px-3 py-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[calc(100dvh-32px)] w-full max-w-[600px] flex-col overflow-hidden rounded-[20px] border border-white/10 bg-[#1e293b] shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <div className="text-base font-extrabold">
              ⚙️ Kategori Yönetimi
            </div>

            <div className="mt-0.5 text-[10px] text-[#94a3b8]">
              Kategori ve alt kategorileri
              düzenle.
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-3">
            <div className="mb-2 text-xs font-extrabold text-[#10b981]">
              ➕ Yeni Kategori
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryIcon}
                onChange={(event) =>
                  setNewCategoryIcon(
                    event.target.value,
                  )
                }
                className="h-10 w-14 rounded-lg border border-white/10 bg-[#0f172a] px-2 text-center text-lg outline-none"
                maxLength={8}
                placeholder="📁"
              />

              <input
                type="text"
                value={newCategoryName}
                onChange={(event) =>
                  setNewCategoryName(
                    event.target.value,
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter"
                  ) {
                    addCategory();
                  }
                }}
                className="h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-[#0f172a] px-3 text-sm outline-none focus:border-[#38bdf8]"
                placeholder="Kategori adı"
              />

              <button
                type="button"
                onClick={addCategory}
                className="h-10 shrink-0 rounded-lg bg-[#10b981] px-3 text-xs font-extrabold text-white"
              >
                Ekle
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {categories.map((category) => {
              const categorySentences =
                getCategorySentences(
                  category.name,
                );

              const categoryStats =
                getGroupStats(
                  categorySentences,
                );

              return (
                <div
                  key={category.name}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f172a]"
                >
                  <div className="flex items-center gap-2 border-b border-white/10 p-3">
                    {editingCategory?.oldName ===
                    category.name ? (
                      <>
                        <input
                          type="text"
                          value={
                            editingCategory.icon
                          }
                          onChange={(event) =>
                            setEditingCategory({
                              ...editingCategory,
                              icon:
                                event.target
                                  .value,
                            })
                          }
                          className="h-9 w-12 rounded-lg border border-white/10 bg-[#1e293b] px-2 text-center"
                          maxLength={8}
                        />

                        <input
                          type="text"
                          value={
                            editingCategory.name
                          }
                          onChange={(event) =>
                            setEditingCategory({
                              ...editingCategory,
                              name:
                                event.target
                                  .value,
                            })
                          }
                          className="h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-[#1e293b] px-3 text-sm outline-none"
                        />

                        <button
                          type="button"
                          onClick={
                            saveCategoryEdit
                          }
                          className="h-9 rounded-lg bg-[#10b981] px-3 text-[11px] font-extrabold text-white"
                        >
                          Kaydet
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setEditingCategory(
                              null,
                            )
                          }
                          className="h-9 rounded-lg bg-white/10 px-3 text-[11px] font-bold"
                        >
                          İptal
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-lg">
                          {category.icon ||
                            "📁"}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-extrabold">
                            {category.name}
                          </div>

                          <div className="mt-0.5 flex flex-wrap gap-x-2 text-[9px] text-[#94a3b8]">
                            <span>
                              {
                                category.subcats
                                  .length
                              }{" "}
                              alt kategori
                            </span>

                            <span>
                              {
                                categoryStats.total
                              }{" "}
                              cümle
                            </span>

                            {categoryStats.dueCount >
                              0 && (
                              <span className="text-[#f43f5e]">
                                {
                                  categoryStats.dueCount
                                }{" "}
                                tekrar
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setActionTarget({
                              type: "category",
                              categoryName:
                                category.name,
                            })
                          }
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-lg font-black text-[#cbd5e1] hover:bg-white/10"
                          aria-label="Kategori seçenekleri"
                        >
                          ⋮
                        </button>
                      </>
                    )}
                  </div>

                  <div className="p-3">
                    <div className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-[#94a3b8]">
                      Alt kategoriler
                    </div>

                    <div className="space-y-2">
                      {category.subcats.map(
                        (subcategory) => {
                          const isEditing =
                            editingSubcategory?.categoryName ===
                              category.name &&
                            editingSubcategory.oldName ===
                              subcategory;

                          const subcategorySentences =
                            getSubcategorySentences(
                              category.name,
                              subcategory,
                            );

                          return (
                            <div
                              key={
                                subcategory
                              }
                              className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2"
                            >
                              {isEditing ? (
                                <>
                                  <input
                                    type="text"
                                    value={
                                      editingSubcategory.name
                                    }
                                    onChange={(
                                      event,
                                    ) =>
                                      setEditingSubcategory(
                                        {
                                          ...editingSubcategory,
                                          name:
                                            event
                                              .target
                                              .value,
                                        },
                                      )
                                    }
                                    className="h-8 min-w-0 flex-1 rounded-lg border border-white/10 bg-[#1e293b] px-2 text-xs outline-none"
                                  />

                                  <button
                                    type="button"
                                    onClick={
                                      saveSubcategoryEdit
                                    }
                                    className="h-8 rounded-lg bg-[#10b981] px-2.5 text-[10px] font-extrabold text-white"
                                  >
                                    Kaydet
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditingSubcategory(
                                        null,
                                      )
                                    }
                                    className="h-8 rounded-lg bg-white/10 px-2.5 text-[10px]"
                                  >
                                    İptal
                                  </button>
                                </>
                              ) : (
                                <>
                                  <span className="min-w-0 flex-1 truncate text-xs font-bold">
                                    📄{" "}
                                    {
                                      subcategory
                                    }
                                  </span>

                                  <span className="shrink-0 text-[9px] text-[#64748b]">
                                    {
                                      subcategorySentences.length
                                    }{" "}
                                    cümle
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActionTarget(
                                        {
                                          type: "subcategory",
                                          categoryName:
                                            category.name,
                                          subcategoryName:
                                            subcategory,
                                        },
                                      )
                                    }
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-base font-black text-[#cbd5e1] hover:bg-white/10"
                                    aria-label="Alt kategori seçenekleri"
                                  >
                                    ⋮
                                  </button>
                                </>
                              )}
                            </div>
                          );
                        },
                      )}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        value={
                          newSubcategories[
                            category.name
                          ] || ""
                        }
                        onChange={(event) =>
                          setNewSubcategories(
                            (current) => ({
                              ...current,
                              [category.name]:
                                event.target
                                  .value,
                            }),
                          )
                        }
                        onKeyDown={(event) => {
                          if (
                            event.key ===
                            "Enter"
                          ) {
                            addSubcategory(
                              category.name,
                            );
                          }
                        }}
                        className="h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-[#1e293b] px-3 text-xs outline-none focus:border-[#38bdf8]"
                        placeholder="Yeni alt kategori"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          addSubcategory(
                            category.name,
                          )
                        }
                        className="h-9 shrink-0 rounded-lg border border-sky-400/30 bg-sky-400/10 px-3 text-[10px] font-extrabold text-[#38bdf8]"
                      >
                        + Ekle
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="shrink-0 border-t border-white/10 bg-[#1e293b] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-white/10 px-3 py-2 text-xs font-extrabold"
          >
            Kapat
          </button>
        </div>
      </div>

      {message && (
        <div className="fixed bottom-6 left-1/2 z-[150] w-[calc(100%-32px)] max-w-[420px] -translate-x-1/2 rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-center text-xs font-extrabold shadow-2xl">
          {message}
        </div>
      )}

      {actionTarget && (
        <div
          className="fixed inset-0 z-[130] flex items-end justify-center bg-black/70 px-3 pb-3 pt-10 backdrop-blur-sm sm:items-center"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setActionTarget(null);
            }
          }}
        >
          <div className="w-full max-w-[520px] overflow-hidden rounded-[22px] border border-white/10 bg-[#1e293b] shadow-2xl">
            <div className="flex items-start justify-between border-b border-white/10 px-4 py-3">
              <div className="min-w-0 pr-3">
                <div className="truncate text-sm font-extrabold">
                  {actionTarget.type ===
                  "category"
                    ? `${targetCategory?.icon || "📁"} ${actionTarget.categoryName}`
                    : `📄 ${actionTarget.subcategoryName}`}
                </div>

                <div className="mt-1 text-[10px] text-[#94a3b8]">
                  {actionTarget.type ===
                  "subcategory"
                    ? `${actionTarget.categoryName} › ${actionTarget.subcategoryName}`
                    : "Kategori işlemleri"}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setActionTarget(null)
                }
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1.5 border-b border-white/10 p-3">
              <div className="rounded-lg bg-white/5 px-2 py-2 text-center">
                <div className="text-xs font-extrabold">
                  {targetStats.total}
                </div>

                <div className="mt-0.5 text-[8px] text-[#94a3b8]">
                  Toplam
                </div>
              </div>

              <div className="rounded-lg bg-sky-400/10 px-2 py-2 text-center">
                <div className="text-xs font-extrabold text-[#38bdf8]">
                  {
                    targetStats.newCount
                  }
                </div>

                <div className="mt-0.5 text-[8px] text-[#94a3b8]">
                  Yeni
                </div>
              </div>

              <div className="rounded-lg bg-rose-500/10 px-2 py-2 text-center">
                <div className="text-xs font-extrabold text-[#f43f5e]">
                  {
                    targetStats.dueCount
                  }
                </div>

                <div className="mt-0.5 text-[8px] text-[#94a3b8]">
                  Tekrar
                </div>
              </div>

              <div className="rounded-lg bg-emerald-500/10 px-2 py-2 text-center">
                <div className="text-xs font-extrabold text-[#10b981]">
                  {
                    targetStats.learnedCount
                  }
                </div>

                <div className="mt-0.5 text-[8px] text-[#94a3b8]">
                  Öğrenildi
                </div>
              </div>
            </div>

            <div className="space-y-2 p-3">
              {actionTarget.type ===
              "category" ? (
                <button
                  type="button"
                  onClick={() =>
                    startCategoryEdit(
                      actionTarget.categoryName,
                    )
                  }
                  className="w-full rounded-xl border border-sky-400/25 bg-sky-400/10 px-3 py-3 text-xs font-extrabold text-[#38bdf8]"
                >
                  ✏️ Kategoriyi Düzenle
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    startSubcategoryEdit(
                      actionTarget.categoryName,
                      actionTarget.subcategoryName,
                    )
                  }
                  className="w-full rounded-xl border border-sky-400/25 bg-sky-400/10 px-3 py-3 text-xs font-extrabold text-[#38bdf8]"
                >
                  ✏️ Alt Kategoriyi Düzenle
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (
                    actionTarget.type ===
                    "category"
                  ) {
                    resetCategorySrs(
                      actionTarget.categoryName,
                    );
                  } else {
                    resetSubcategorySrs(
                      actionTarget.categoryName,
                      actionTarget.subcategoryName,
                    );
                  }
                }}
                className="w-full rounded-xl border border-yellow-400/25 bg-yellow-400/10 px-3 py-3 text-xs font-extrabold text-[#eab308]"
              >
                🔄 SRS İlerlemesini
                Sıfırla
              </button>

              <button
                type="button"
                onClick={() =>
                  downloadGroupPdf(
                    actionTarget.type ===
                    "category"
                      ? actionTarget.categoryName
                      : actionTarget.subcategoryName,
                    actionTarget.type ===
                    "category"
                      ? "Tüm kategori"
                      : actionTarget.categoryName,
                    targetSentences,
                  )
                }
                className="w-full rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-3 text-xs font-extrabold text-[#10b981]"
              >
                📄 Bölümü PDF Olarak
                İndir
              </button>

              {actionTarget.type ===
              "category" ? (
                <button
                  type="button"
                  onClick={() =>
                    deleteCategory(
                      actionTarget.categoryName,
                    )
                  }
                  disabled={
                    categories.length === 1
                  }
                  className="w-full rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-3 text-xs font-extrabold text-[#f43f5e] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  🗑️ Kategoriyi Sil
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    deleteSubcategory(
                      actionTarget.categoryName,
                      actionTarget.subcategoryName,
                    )
                  }
                  className="w-full rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-3 text-xs font-extrabold text-[#f43f5e]"
                >
                  🗑️ Alt Kategoriyi Sil
                </button>
              )}
            </div>

            <div className="border-t border-white/10 p-3">
              <button
                type="button"
                onClick={() =>
                  setActionTarget(null)
                }
                className="w-full rounded-xl bg-[#0f172a] px-3 py-3 text-xs font-extrabold"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
