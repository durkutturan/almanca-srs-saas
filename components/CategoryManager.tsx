"use client";

import { useEffect, useMemo, useState } from "react";
import { getSrsStatus, plainText } from "@/lib/srs";
import type { Category, Sentence } from "@/types/app";

type SentenceDestination = {
  category: string;
  subcategory?: string;
  subsubcategory?: string;
};

type DeleteGroupOptions = {
  sentenceAction: "delete" | "move";
  target?: SentenceDestination;
};

type CategoryManagerProps = {
  isOpen: boolean;
  categories: Category[];
  sentences?: Sentence[];
  onClose: () => void;
  onAddCategory: (name: string, icon: string) => boolean;
  onUpdateCategory: (
    oldName: string,
    newName: string,
    icon: string,
  ) => boolean;
  onDeleteCategory: (categoryName: string) => boolean;
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
    options?: DeleteGroupOptions,
  ) => boolean;
  onAddSubsubcategory?: (
    categoryName: string,
    subcategoryName: string,
    subsubcategoryName: string,
  ) => boolean;
  onRenameSubsubcategory?: (
    categoryName: string,
    subcategoryName: string,
    oldName: string,
    newName: string,
  ) => boolean;
  onDeleteSubsubcategory?: (
    categoryName: string,
    subcategoryName: string,
    subsubcategoryName: string,
    options?: DeleteGroupOptions,
  ) => boolean;
  onMoveSubcategories?: (
    sourceCategoryName: string,
    subcategoryNames: string[],
    targetCategoryName: string,
  ) => boolean;
  onResetCategorySrs?: (categoryName: string) => void;
  onResetSubcategorySrs?: (
    categoryName: string,
    subcategoryName: string,
  ) => void;
  onResetSubsubcategorySrs?: (
    categoryName: string,
    subcategoryName: string,
    subsubcategoryName: string,
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

type EditingSubsubcategory = {
  categoryName: string;
  subcategoryName: string;
  oldName: string;
  name: string;
};

type ActionTarget =
  | {
      type: "category";
      categoryName: string;
    }
  | {
      type: "subcategory";
      categoryName: string;
      subcategoryName: string;
    }
  | {
      type: "subsubcategory";
      categoryName: string;
      subcategoryName: string;
      subsubcategoryName: string;
    };

type DeleteTarget =
  | {
      type: "category";
      categoryName: string;
    }
  | {
      type: "subcategory";
      categoryName: string;
      subcategoryName: string;
    }
  | {
      type: "subsubcategory";
      categoryName: string;
      subcategoryName: string;
      subsubcategoryName: string;
    };

type GroupStats = {
  total: number;
  newCount: number;
  dueCount: number;
  learningCount: number;
  learnedCount: number;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getGroupStats(groupSentences: Sentence[]): GroupStats {
  const stats: GroupStats = {
    total: groupSentences.length,
    newCount: 0,
    dueCount: 0,
    learningCount: 0,
    learnedCount: 0,
  };

  groupSentences.forEach((sentence) => {
    const status = getSrsStatus(sentence.srs);
    if (status === "new") stats.newCount += 1;
    else if (status === "due") stats.dueCount += 1;
    else if (status === "learning") stats.learningCount += 1;
    else stats.learnedCount += 1;
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
  onAddSubsubcategory,
  onRenameSubsubcategory,
  onDeleteSubsubcategory,
  onMoveSubcategories,
  onResetCategorySrs,
  onResetSubcategorySrs,
  onResetSubsubcategorySrs,
}: CategoryManagerProps) {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("📁");
  const [newSubcategories, setNewSubcategories] = useState<
    Record<string, string>
  >({});
  const [newSubsubcategories, setNewSubsubcategories] = useState<
    Record<string, string>
  >({});
  const [expandedCategories, setExpandedCategories] = useState<
    Set<string>
  >(new Set());
  const [expandedSubcategories, setExpandedSubcategories] = useState<
    Set<string>
  >(new Set());
  const [bulkSubcategories, setBulkSubcategories] = useState<
    Record<string, string>
  >({});
  const [bulkEditorOpen, setBulkEditorOpen] = useState<
    Record<string, boolean>
  >({});
  const [editingCategory, setEditingCategory] =
    useState<EditingCategory | null>(null);
  const [editingSubcategory, setEditingSubcategory] =
    useState<EditingSubcategory | null>(null);
  const [editingSubsubcategory, setEditingSubsubcategory] =
    useState<EditingSubsubcategory | null>(null);
  const [actionTarget, setActionTarget] =
    useState<ActionTarget | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<DeleteTarget | null>(null);
  const [deleteMode, setDeleteMode] = useState<"choice" | "move">(
    "choice",
  );
  const [deleteDestination, setDeleteDestination] = useState({
    category: "",
    subcategory: "",
    subsubcategory: "",
  });
  const [selectedSourceCategory, setSelectedSourceCategory] =
    useState<string | null>(null);
  const [selectedSubcategories, setSelectedSubcategories] =
    useState<Set<string>>(new Set());
  const [moveSubcategoryOpen, setMoveSubcategoryOpen] =
    useState(false);
  const [moveSubcategoryTarget, setMoveSubcategoryTarget] =
    useState("");
  const [message, setMessage] = useState("");

  const categoryByName = useMemo(
    () =>
      new Map(
        categories.map((category) => [category.name, category]),
      ),
    [categories],
  );

  useEffect(() => {
    if (isOpen) {
      setExpandedCategories(new Set());
      setExpandedSubcategories(new Set());
      setBulkEditorOpen({});
      setSelectedSourceCategory(null);
      setSelectedSubcategories(new Set());
    }
  }, [isOpen]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      if (deleteTarget) {
        setDeleteTarget(null);
        return;
      }
      if (moveSubcategoryOpen) {
        setMoveSubcategoryOpen(false);
        return;
      }
      if (actionTarget) {
        setActionTarget(null);
        return;
      }
      if (
        editingCategory ||
        editingSubcategory ||
        editingSubsubcategory
      ) {
        setEditingCategory(null);
        setEditingSubcategory(null);
        setEditingSubsubcategory(null);
        return;
      }
      onClose();
    }

    if (isOpen) {
      window.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [
    actionTarget,
    deleteTarget,
    editingCategory,
    editingSubcategory,
    editingSubsubcategory,
    isOpen,
    moveSubcategoryOpen,
    onClose,
  ]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 2400);
    return () => window.clearTimeout(timer);
  }, [message]);

  if (!isOpen) return null;

  function getCategorySentences(categoryName: string) {
    return sentences.filter(
      (sentence) => sentence.cat === categoryName,
    );
  }

  function getSubcategorySentences(
    categoryName: string,
    subcategoryName: string,
  ) {
    return sentences.filter(
      (sentence) =>
        sentence.cat === categoryName &&
        sentence.subcat === subcategoryName,
    );
  }

  function getSubsubcategorySentences(
    categoryName: string,
    subcategoryName: string,
    subsubcategoryName: string,
  ) {
    return sentences.filter(
      (sentence) =>
        sentence.cat === categoryName &&
        sentence.subcat === subcategoryName &&
        sentence.subsubcat === subsubcategoryName,
    );
  }

  function addCategory() {
    const name = newCategoryName.trim();
    const icon = newCategoryIcon.trim() || "📁";
    if (!name) {
      window.alert("Kategori adını yazmalısın.");
      return;
    }

    if (onAddCategory(name, icon)) {
      setNewCategoryName("");
      setNewCategoryIcon("📁");
      setMessage("Kategori oluşturuldu. ✅");
    }
  }

  function startCategoryEdit(categoryName: string) {
    const category = categoryByName.get(categoryName);
    if (!category) return;

    setEditingCategory({
      oldName: category.name,
      name: category.name,
      icon: category.icon || "📁",
    });
    setActionTarget(null);
  }

  function saveCategoryEdit() {
    if (!editingCategory) return;
    const name = editingCategory.name.trim();
    const icon = editingCategory.icon.trim() || "📁";

    if (!name) {
      window.alert("Kategori adı boş bırakılamaz.");
      return;
    }

    if (
      onUpdateCategory(editingCategory.oldName, name, icon)
    ) {
      setEditingCategory(null);
      setMessage("Kategori güncellendi. ✅");
    }
  }

  function addSubcategory(categoryName: string) {
    const name = newSubcategories[categoryName]?.trim() || "";
    if (!name) {
      window.alert("Alt kategori adını yazmalısın.");
      return;
    }

    if (onAddSubcategory(categoryName, name)) {
      setNewSubcategories((current) => ({
        ...current,
        [categoryName]: "",
      }));
      setMessage("Alt kategori oluşturuldu. ✅");
    }
  }

  function addBulkSubcategories(categoryName: string) {
    const raw = bulkSubcategories[categoryName] || "";
    const names = Array.from(
      new Map(
        raw
          .split(/[\r\n,;]+/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((name) => [
            name.toLocaleLowerCase("tr-TR"),
            name,
          ]),
      ).values(),
    );

    if (names.length === 0) {
      window.alert("En az bir alt kategori yazmalısın.");
      return;
    }

    let addedCount = 0;
    for (const name of names) {
      if (onAddSubcategory(categoryName, name)) {
        addedCount += 1;
      }
    }

    if (addedCount > 0) {
      setBulkSubcategories((current) => ({
        ...current,
        [categoryName]: "",
      }));
      setMessage(`${addedCount} alt kategori eklendi. ✅`);
    }
  }

  function addSubsubcategory(
    categoryName: string,
    subcategoryName: string,
  ) {
    if (!onAddSubsubcategory) return;

    const key = `${categoryName}|${subcategoryName}`;
    const raw = newSubsubcategories[key] || "";

    const names = Array.from(
      new Map(
        raw
          .split(/[\r\n,;]+/)
          .map((item) => item.trim())
          .filter(Boolean)
          .map((name) => [
            name.toLocaleLowerCase("tr-TR"),
            name,
          ]),
      ).values(),
    );

    if (names.length === 0) {
      window.alert("En az bir alt-alt kategori yazmalısın.");
      return;
    }

    let addedCount = 0;

    for (const name of names) {
      if (
        onAddSubsubcategory(
          categoryName,
          subcategoryName,
          name,
        )
      ) {
        addedCount += 1;
      }
    }

    if (addedCount > 0) {
      setNewSubsubcategories((current) => ({
        ...current,
        [key]: "",
      }));
      setExpandedSubcategories((current) =>
        new Set(current).add(key),
      );
      setMessage(
        addedCount === 1
          ? "Alt-alt kategori oluşturuldu. ✅"
          : `${addedCount} alt-alt kategori eklendi. ✅`,
      );
    }
  }

  function saveSubcategoryEdit() {
    if (!editingSubcategory) return;
    const name = editingSubcategory.name.trim();
    if (!name) return;

    if (
      onRenameSubcategory(
        editingSubcategory.categoryName,
        editingSubcategory.oldName,
        name,
      )
    ) {
      setEditingSubcategory(null);
      setMessage("Alt kategori güncellendi. ✅");
    }
  }

  function saveSubsubcategoryEdit() {
    if (!editingSubsubcategory || !onRenameSubsubcategory) return;
    const name = editingSubsubcategory.name.trim();
    if (!name) return;

    if (
      onRenameSubsubcategory(
        editingSubsubcategory.categoryName,
        editingSubsubcategory.subcategoryName,
        editingSubsubcategory.oldName,
        name,
      )
    ) {
      setEditingSubsubcategory(null);
      setMessage("Alt-alt kategori güncellendi. ✅");
    }
  }

  function toggleCategory(categoryName: string) {
    setExpandedCategories((current) => {
      const next = new Set(current);
      if (next.has(categoryName)) next.delete(categoryName);
      else next.add(categoryName);
      return next;
    });
  }

  function toggleSubcategory(key: string) {
    setExpandedSubcategories((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleSubcategorySelection(
    categoryName: string,
    subcategoryName: string,
  ) {
    if (
      selectedSourceCategory &&
      selectedSourceCategory !== categoryName
    ) {
      return;
    }

    setSelectedSourceCategory(categoryName);
    setSelectedSubcategories((current) => {
      const next = new Set(current);
      if (next.has(subcategoryName)) next.delete(subcategoryName);
      else next.add(subcategoryName);

      if (next.size === 0) {
        setSelectedSourceCategory(null);
      }
      return next;
    });
  }

  function clearSubcategorySelection() {
    setSelectedSourceCategory(null);
    setSelectedSubcategories(new Set());
    setMoveSubcategoryOpen(false);
  }

  function performSubcategoryMove() {
    if (
      !onMoveSubcategories ||
      !selectedSourceCategory ||
      !moveSubcategoryTarget
    ) {
      return;
    }

    const names = Array.from(selectedSubcategories);
    if (
      onMoveSubcategories(
        selectedSourceCategory,
        names,
        moveSubcategoryTarget,
      )
    ) {
      setMessage(`${names.length} alt kategori taşındı. ✅`);
      clearSubcategorySelection();
    }
  }

  function openDelete(target: DeleteTarget) {
    setDeleteTarget(target);
    setDeleteMode("choice");
    const fallback = categories.find(
      (category) => category.name !== target.categoryName,
    );
    setDeleteDestination({
      category: fallback?.name || target.categoryName,
      subcategory: "",
      subsubcategory: "",
    });
    setActionTarget(null);
  }

  function getDeleteSentences(target: DeleteTarget) {
    if (target.type === "category") {
      return getCategorySentences(target.categoryName);
    }
    if (target.type === "subcategory") {
      return getSubcategorySentences(
        target.categoryName,
        target.subcategoryName,
      );
    }
    return getSubsubcategorySentences(
      target.categoryName,
      target.subcategoryName,
      target.subsubcategoryName,
    );
  }

  function performDeleteWithSentences() {
    if (!deleteTarget) return;

    let deleted = false;
    if (deleteTarget.type === "category") {
      deleted = onDeleteCategory(deleteTarget.categoryName);
    } else if (deleteTarget.type === "subcategory") {
      deleted = onDeleteSubcategory(
        deleteTarget.categoryName,
        deleteTarget.subcategoryName,
        { sentenceAction: "delete" },
      );
    } else if (onDeleteSubsubcategory) {
      deleted = onDeleteSubsubcategory(
        deleteTarget.categoryName,
        deleteTarget.subcategoryName,
        deleteTarget.subsubcategoryName,
        { sentenceAction: "delete" },
      );
    }

    if (deleted) {
      setDeleteTarget(null);
      setMessage("Bölüm ve bağlı cümleler silindi.");
    }
  }

  function performDeleteAndMove() {
    if (!deleteTarget || deleteTarget.type === "category") return;

    const options: DeleteGroupOptions = {
      sentenceAction: "move",
      target: deleteDestination,
    };

    let deleted = false;
    if (deleteTarget.type === "subcategory") {
      deleted = onDeleteSubcategory(
        deleteTarget.categoryName,
        deleteTarget.subcategoryName,
        options,
      );
    } else if (onDeleteSubsubcategory) {
      deleted = onDeleteSubsubcategory(
        deleteTarget.categoryName,
        deleteTarget.subcategoryName,
        deleteTarget.subsubcategoryName,
        options,
      );
    }

    if (deleted) {
      setDeleteTarget(null);
      setMessage("Cümleler taşındı ve bölüm silindi. ✅");
    }
  }

  function resetTargetSrs(target: ActionTarget) {
    if (target.type === "category") {
      onResetCategorySrs?.(target.categoryName);
    } else if (target.type === "subcategory") {
      onResetSubcategorySrs?.(
        target.categoryName,
        target.subcategoryName,
      );
    } else {
      onResetSubsubcategorySrs?.(
        target.categoryName,
        target.subcategoryName,
        target.subsubcategoryName,
      );
    }
    setActionTarget(null);
    setMessage("SRS ilerlemesi sıfırlandı. ✅");
  }

  function downloadGroupPdf(
    title: string,
    subtitle: string,
    groupSentences: Sentence[],
  ) {
    if (groupSentences.length === 0) {
      window.alert("Bu bölümde PDF'e aktarılacak cümle bulunmuyor.");
      return;
    }

    const printWindow = window.open(
      "",
      "_blank",
      "width=900,height=760",
    );
    if (!printWindow) return;

    const rows = groupSentences
      .map(
        (sentence, index) => `
          <article class="sentence">
            <div class="number">${index + 1}</div>
            <div class="content">
              <div class="german">${escapeHtml(
                plainText(sentence.de),
              )}</div>
              <div class="turkish">${escapeHtml(
                sentence.tr,
              )}</div>
              ${
                sentence.grammar
                  ? `<div class="grammar">💡 ${escapeHtml(
                      sentence.grammar,
                    )}</div>`
                  : ""
              }
            </div>
          </article>`,
      )
      .join("");

    printWindow.document.write(`<!doctype html><html lang="tr"><head><meta charset="utf-8"/><title>${escapeHtml(
      title,
    )}</title><style>*{box-sizing:border-box}body{margin:0;padding:38px;color:#0f172a;background:#fff;font-family:Arial,sans-serif}.sheet{max-width:820px;margin:0 auto}.header{margin-bottom:26px;padding-bottom:18px;border-bottom:2px solid #0f172a}h1{margin:0;font-size:26px}.subtitle{margin-top:7px;color:#64748b;font-size:13px}.sentence{display:flex;gap:13px;margin-bottom:12px;padding:14px;border:1px solid #cbd5e1;border-radius:12px;break-inside:avoid}.number{display:flex;width:28px;height:28px;flex:0 0 28px;align-items:center;justify-content:center;border-radius:8px;color:#fff;background:#0f172a;font-size:12px;font-weight:700}.content{min-width:0;flex:1}.german{font-size:16px;font-weight:700;line-height:1.45}.turkish{margin-top:5px;color:#475569;font-size:14px;line-height:1.45}.grammar{margin-top:9px;padding:8px 10px;border-radius:8px;color:#854d0e;background:#fef9c3;font-size:12px;line-height:1.4}@media print{body{padding:0}}</style></head><body><main class="sheet"><header class="header"><h1>${escapeHtml(
      title,
    )}</h1><div class="subtitle">${escapeHtml(
      subtitle,
    )} • ${groupSentences.length} cümle</div></header>${rows}</main><script>window.onload=()=>window.print();</script></body></html>`);
    printWindow.document.close();
    setActionTarget(null);
  }

  const targetSentences = actionTarget
    ? actionTarget.type === "category"
      ? getCategorySentences(actionTarget.categoryName)
      : actionTarget.type === "subcategory"
        ? getSubcategorySentences(
            actionTarget.categoryName,
            actionTarget.subcategoryName,
          )
        : getSubsubcategorySentences(
            actionTarget.categoryName,
            actionTarget.subcategoryName,
            actionTarget.subsubcategoryName,
          )
    : [];

  const targetStats = getGroupStats(targetSentences);
  const deleteSentences = deleteTarget
    ? getDeleteSentences(deleteTarget)
    : [];
  const deleteDestinationCategory = categoryByName.get(
    deleteDestination.category,
  );

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 px-3 py-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[calc(100dvh-32px)] w-full max-w-[640px] flex-col overflow-hidden rounded-[20px] border border-white/10 bg-[#1e293b] shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <div className="text-base font-extrabold">
              ⚙️ Kategori Yönetimi
            </div>
            <div className="mt-0.5 text-[10px] text-[#94a3b8]">
              Üst kategori → alt kategori → gerektiğinde alt-alt kategori.
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
                  setNewCategoryIcon(event.target.value)
                }
                className="h-10 w-14 rounded-lg border border-white/10 bg-[#0f172a] px-2 text-center text-lg outline-none"
                maxLength={8}
                placeholder="📁"
              />
              <input
                type="text"
                value={newCategoryName}
                onChange={(event) =>
                  setNewCategoryName(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") addCategory();
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

          {selectedSubcategories.size > 0 && (
            <div className="sticky top-0 z-20 mb-3 rounded-xl border border-violet-400/25 bg-[#172033]/95 p-3 shadow-xl backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-violet-200">
                  ✓ {selectedSubcategories.size} alt kategori seçildi
                </span>
                <button
                  type="button"
                  onClick={clearSubcategorySelection}
                  className="text-[9px] font-bold text-[#94a3b8]"
                >
                  Temizle
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  const target = categories.find(
                    (category) =>
                      category.name !== selectedSourceCategory,
                  );
                  setMoveSubcategoryTarget(target?.name || "");
                  setMoveSubcategoryOpen(true);
                }}
                disabled={categories.length <= 1}
                className="mt-2 w-full rounded-lg border border-violet-400/25 bg-violet-500/10 px-3 py-2 text-[10px] font-extrabold text-violet-200 disabled:opacity-40"
              >
                📂 Seçili alt kategorileri taşı
              </button>
            </div>
          )}

          <div className="space-y-3">
            {categories.map((category) => {
              const categorySentences = getCategorySentences(
                category.name,
              );
              const categoryStats = getGroupStats(categorySentences);
              const categoryOpen = expandedCategories.has(
                category.name,
              );

              return (
                <div
                  key={category.name}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f172a]"
                >
                  <div
                    className={[
                      "flex items-center gap-2 p-3",
                      categoryOpen
                        ? "border-b border-white/10"
                        : "",
                    ].join(" ")}
                  >
                    {editingCategory?.oldName === category.name ? (
                      <>
                        <input
                          value={editingCategory.icon}
                          onChange={(event) =>
                            setEditingCategory({
                              ...editingCategory,
                              icon: event.target.value,
                            })
                          }
                          className="h-9 w-12 rounded-lg border border-white/10 bg-[#1e293b] px-2 text-center"
                        />
                        <input
                          value={editingCategory.name}
                          onChange={(event) =>
                            setEditingCategory({
                              ...editingCategory,
                              name: event.target.value,
                            })
                          }
                          className="h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-[#1e293b] px-3 text-sm"
                        />
                        <button
                          type="button"
                          onClick={saveCategoryEdit}
                          className="h-9 rounded-lg bg-[#10b981] px-3 text-[11px] font-extrabold"
                        >
                          Kaydet
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCategory(null)}
                          className="h-9 rounded-lg bg-white/10 px-3 text-[11px]"
                        >
                          İptal
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-lg">
                          {category.icon || "📁"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-extrabold">
                            {category.name}
                          </div>
                          <div className="mt-0.5 flex gap-2 text-[9px] text-[#94a3b8]">
                            <span>
                              {category.subcats.length} alt kategori
                            </span>
                            <span>{categoryStats.total} cümle</span>
                            {categoryStats.dueCount > 0 && (
                              <span className="text-[#f43f5e]">
                                {categoryStats.dueCount} tekrar
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleCategory(category.name)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5"
                        >
                          {categoryOpen ? "⌃" : "⌄"}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setActionTarget({
                              type: "category",
                              categoryName: category.name,
                            })
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-lg"
                        >
                          ⋮
                        </button>
                      </>
                    )}
                  </div>

                  {categoryOpen && (
                    <div className="p-3">
                      <div className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-[#94a3b8]">
                        Alt kategoriler
                      </div>

                      <div className="space-y-2">
                        {category.subcats.map((subcategory) => {
                          const subKey = `${category.name}|${subcategory}`;
                          const children =
                            category.subsubcats?.[subcategory] ?? [];
                          const subSentences =
                            getSubcategorySentences(
                              category.name,
                              subcategory,
                            );
                          const subOpen =
                            expandedSubcategories.has(subKey);
                          const selected =
                            selectedSourceCategory === category.name &&
                            selectedSubcategories.has(subcategory);
                          const selectionDisabled = Boolean(
                            selectedSourceCategory &&
                              selectedSourceCategory !== category.name,
                          );
                          const isEditing =
                            editingSubcategory?.categoryName ===
                              category.name &&
                            editingSubcategory.oldName === subcategory;

                          return (
                            <div
                              key={subKey}
                              className={[
                                "overflow-hidden rounded-xl border",
                                selected
                                  ? "border-violet-400/35 bg-violet-500/10"
                                  : "border-white/5 bg-white/[0.03]",
                              ].join(" ")}
                            >
                              <div className="flex items-center gap-2 px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  disabled={selectionDisabled}
                                  onChange={() =>
                                    toggleSubcategorySelection(
                                      category.name,
                                      subcategory,
                                    )
                                  }
                                  className="h-4 w-4 accent-violet-500 disabled:opacity-30"
                                  aria-label="Alt kategoriyi seç"
                                />

                                {isEditing ? (
                                  <>
                                    <input
                                      value={editingSubcategory.name}
                                      onChange={(event) =>
                                        setEditingSubcategory({
                                          ...editingSubcategory,
                                          name: event.target.value,
                                        })
                                      }
                                      className="h-8 min-w-0 flex-1 rounded-lg border border-white/10 bg-[#1e293b] px-2 text-xs"
                                    />
                                    <button
                                      type="button"
                                      onClick={saveSubcategoryEdit}
                                      className="h-8 rounded-lg bg-[#10b981] px-2 text-[10px] font-bold"
                                    >
                                      Kaydet
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        toggleSubcategory(subKey)
                                      }
                                      className="min-w-0 flex-1 text-left"
                                    >
                                      <span className="block truncate text-xs font-bold">
                                        {subcategory}
                                      </span>
                                      <span className="mt-0.5 block text-[9px] text-[#64748b]">
                                        {subSentences.length} cümle •{" "}
                                        {children.length} alt-alt kategori
                                      </span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        toggleSubcategory(subKey)
                                      }
                                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-[10px]"
                                    >
                                      {subOpen ? "▲" : "▼"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setActionTarget({
                                          type: "subcategory",
                                          categoryName: category.name,
                                          subcategoryName: subcategory,
                                        })
                                      }
                                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-base"
                                    >
                                      ⋮
                                    </button>
                                  </>
                                )}
                              </div>

                              {subOpen && (
                                <div className="border-t border-white/5 bg-black/10 p-2.5">
                                  {children.length > 0 && (
                                    <div className="mb-2 space-y-1.5">
                                      {children.map((child) => {
                                        const childSentences =
                                          getSubsubcategorySentences(
                                            category.name,
                                            subcategory,
                                            child,
                                          );
                                        const childEditing =
                                          editingSubsubcategory?.categoryName ===
                                            category.name &&
                                          editingSubsubcategory.subcategoryName ===
                                            subcategory &&
                                          editingSubsubcategory.oldName ===
                                            child;

                                        return (
                                          <div
                                            key={`${subKey}|${child}`}
                                            className="flex items-center gap-2 rounded-lg border border-violet-400/15 bg-violet-400/[0.05] px-3 py-2"
                                          >
                                            {childEditing ? (
                                              <>
                                                <input
                                                  value={
                                                    editingSubsubcategory.name
                                                  }
                                                  onChange={(event) =>
                                                    setEditingSubsubcategory({
                                                      ...editingSubsubcategory,
                                                      name: event.target.value,
                                                    })
                                                  }
                                                  className="h-8 min-w-0 flex-1 rounded-lg bg-[#1e293b] px-2 text-xs"
                                                />
                                                <button
                                                  type="button"
                                                  onClick={
                                                    saveSubsubcategoryEdit
                                                  }
                                                  className="rounded-lg bg-[#10b981] px-2 py-1.5 text-[9px] font-bold"
                                                >
                                                  Kaydet
                                                </button>
                                              </>
                                            ) : (
                                              <>
                                                <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-violet-200">
                                                  ↳ {child}
                                                </span>
                                                <span className="text-[9px] text-[#64748b]">
                                                  {childSentences.length} cümle
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setActionTarget({
                                                      type: "subsubcategory",
                                                      categoryName:
                                                        category.name,
                                                      subcategoryName:
                                                        subcategory,
                                                      subsubcategoryName:
                                                        child,
                                                    })
                                                  }
                                                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5"
                                                >
                                                  ⋮
                                                </button>
                                              </>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {onAddSubsubcategory && (
                                    <div className="rounded-xl border border-violet-400/15 bg-violet-400/[0.04] p-2.5">
                                      <div className="mb-2 text-[9px] leading-4 text-[#94a3b8]">
                                        Birden fazla eklemek için virgül, noktalı virgül
                                        veya satır sonu kullanabilirsin.
                                      </div>
                                      <div className="flex gap-2">
                                        <input
                                          type="text"
                                          value={
                                            newSubsubcategories[subKey] || ""
                                          }
                                          onChange={(event) =>
                                            setNewSubsubcategories(
                                              (current) => ({
                                                ...current,
                                                [subKey]: event.target.value,
                                              }),
                                            )
                                          }
                                          onKeyDown={(event) => {
                                            if (event.key === "Enter") {
                                              event.preventDefault();
                                              addSubsubcategory(
                                                category.name,
                                                subcategory,
                                              );
                                            }
                                          }}
                                          className="h-8 min-w-0 flex-1 rounded-lg border border-violet-400/15 bg-[#1e293b] px-3 text-[11px] outline-none"
                                          placeholder="können, dürfen, müssen, sollen"
                                        />
                                        <button
                                          type="button"
                                          onClick={() =>
                                            addSubsubcategory(
                                              category.name,
                                              subcategory,
                                            )
                                          }
                                          className="shrink-0 rounded-lg border border-violet-400/25 bg-violet-400/10 px-3 text-[9px] font-extrabold text-violet-200"
                                        >
                                          + Ekle
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-3 flex gap-2">
                        <input
                          type="text"
                          value={newSubcategories[category.name] || ""}
                          onChange={(event) =>
                            setNewSubcategories((current) => ({
                              ...current,
                              [category.name]: event.target.value,
                            }))
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              addSubcategory(category.name);
                            }
                          }}
                          className="h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-[#1e293b] px-3 text-xs outline-none focus:border-[#38bdf8]"
                          placeholder="Yeni alt kategori"
                        />
                        <button
                          type="button"
                          onClick={() => addSubcategory(category.name)}
                          className="h-9 rounded-lg border border-sky-400/30 bg-sky-400/10 px-3 text-[10px] font-extrabold text-[#38bdf8]"
                        >
                          + Ekle
                        </button>
                      </div>

                      <div className="mt-3 border-t border-white/10 pt-3">
                        <button
                          type="button"
                          onClick={() =>
                            setBulkEditorOpen((current) => ({
                              ...current,
                              [category.name]: !current[category.name],
                            }))
                          }
                          className="w-full rounded-lg border border-violet-400/25 bg-violet-400/10 px-3 py-2.5 text-[10px] font-extrabold text-violet-300"
                        >
                          {bulkEditorOpen[category.name]
                            ? "▲ Toplu Ekleme Alanını Kapat"
                            : "＋ Toplu Alt Kategori Ekle"}
                        </button>

                        {bulkEditorOpen[category.name] && (
                          <div className="mt-2 rounded-xl border border-violet-400/15 bg-violet-400/[0.05] p-3">
                            <div className="mb-2 text-[10px] text-[#94a3b8]">
                              Alt kategorileri satır satır veya virgülle ayırarak
                              yazabilirsin. İstersen emoji ekleyebilirsin.
                            </div>
                            <textarea
                              value={
                                bulkSubcategories[category.name] || ""
                              }
                              onChange={(event) =>
                                setBulkSubcategories((current) => ({
                                  ...current,
                                  [category.name]: event.target.value,
                                }))
                              }
                              rows={6}
                              className="w-full resize-y rounded-lg border border-white/10 bg-[#1e293b] px-3 py-2 text-xs leading-5 outline-none"
                              placeholder={
                                "🥩 Et\n🥗 Salata\n🍲 Çorba\n🍝 Makarna\n🍰 Tatlı"
                              }
                            />
                            <button
                              type="button"
                              onClick={() =>
                                addBulkSubcategories(category.name)
                              }
                              className="mt-2 w-full rounded-lg bg-violet-600 px-3 py-2 text-[10px] font-extrabold text-white"
                            >
                              Hepsini Ekle
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
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
            if (event.target === event.currentTarget) {
              setActionTarget(null);
            }
          }}
        >
          <div className="w-full max-w-[520px] overflow-hidden rounded-[22px] border border-white/10 bg-[#1e293b] shadow-2xl">
            <div className="border-b border-white/10 px-4 py-3">
              <div className="text-sm font-extrabold">
                {actionTarget.type === "category"
                  ? `${categoryByName.get(actionTarget.categoryName)?.icon || "📁"} ${actionTarget.categoryName}`
                  : actionTarget.type === "subcategory"
                    ? actionTarget.subcategoryName
                    : actionTarget.subsubcategoryName}
              </div>
              <div className="mt-1 text-[10px] text-[#94a3b8]">
                {targetStats.total} cümle • {targetStats.dueCount}{" "}
                tekrar bekliyor
              </div>
            </div>

            <div className="space-y-2 p-3">
              {actionTarget.type === "category" && (
                <button
                  type="button"
                  onClick={() =>
                    startCategoryEdit(actionTarget.categoryName)
                  }
                  className="w-full rounded-xl border border-sky-400/25 bg-sky-400/10 px-3 py-3 text-xs font-extrabold text-[#38bdf8]"
                >
                  ✏️ Kategoriyi Düzenle
                </button>
              )}

              {actionTarget.type === "subcategory" && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingSubcategory({
                      categoryName: actionTarget.categoryName,
                      oldName: actionTarget.subcategoryName,
                      name: actionTarget.subcategoryName,
                    });
                    setActionTarget(null);
                  }}
                  className="w-full rounded-xl border border-sky-400/25 bg-sky-400/10 px-3 py-3 text-xs font-extrabold text-[#38bdf8]"
                >
                  ✏️ Alt Kategoriyi Düzenle
                </button>
              )}

              {actionTarget.type === "subsubcategory" && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingSubsubcategory({
                      categoryName: actionTarget.categoryName,
                      subcategoryName: actionTarget.subcategoryName,
                      oldName: actionTarget.subsubcategoryName,
                      name: actionTarget.subsubcategoryName,
                    });
                    setActionTarget(null);
                  }}
                  className="w-full rounded-xl border border-violet-400/25 bg-violet-400/10 px-3 py-3 text-xs font-extrabold text-violet-200"
                >
                  ✏️ Alt-alt Kategoriyi Düzenle
                </button>
              )}

              <button
                type="button"
                onClick={() => resetTargetSrs(actionTarget)}
                className="w-full rounded-xl border border-yellow-400/25 bg-yellow-400/10 px-3 py-3 text-xs font-extrabold text-[#eab308]"
              >
                🔄 SRS İlerlemesini Sıfırla
              </button>

              <button
                type="button"
                onClick={() =>
                  downloadGroupPdf(
                    actionTarget.type === "category"
                      ? actionTarget.categoryName
                      : actionTarget.type === "subcategory"
                        ? actionTarget.subcategoryName
                        : actionTarget.subsubcategoryName,
                    "Seçili bölüm",
                    targetSentences,
                  )
                }
                className="w-full rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-3 text-xs font-extrabold text-[#10b981]"
              >
                📄 Bölümü PDF Olarak İndir
              </button>

              <button
                type="button"
                onClick={() => openDelete(actionTarget)}
                disabled={
                  actionTarget.type === "category" &&
                  categories.length === 1
                }
                className="w-full rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-3 text-xs font-extrabold text-[#f43f5e] disabled:opacity-30"
              >
                🗑️ Bölümü Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {moveSubcategoryOpen && selectedSourceCategory && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setMoveSubcategoryOpen(false);
            }
          }}
        >
          <div className="w-full max-w-[460px] overflow-hidden rounded-[24px] border border-violet-400/25 bg-[#1e293b] shadow-2xl">
            <div className="p-5">
              <h3 className="text-lg font-black">
                📂 Alt kategorileri taşı
              </h3>
              <p className="mt-2 text-xs leading-5 text-[#94a3b8]">
                {selectedSubcategories.size} alt kategori, içlerindeki
                alt-alt kategoriler ve bütün cümleleriyle birlikte
                taşınacak.
              </p>
              <select
                value={moveSubcategoryTarget}
                onChange={(event) =>
                  setMoveSubcategoryTarget(event.target.value)
                }
                className="input-field mt-4 mb-0"
              >
                {categories
                  .filter(
                    (category) =>
                      category.name !== selectedSourceCategory,
                  )
                  .map((category) => (
                    <option
                      key={category.name}
                      value={category.name}
                    >
                      {category.icon || "📁"} {category.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-white/10 p-4">
              <button
                type="button"
                onClick={() => setMoveSubcategoryOpen(false)}
                className="rounded-xl bg-[#0f172a] px-3 py-3 text-xs font-extrabold"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={performSubcategoryMove}
                className="rounded-xl bg-violet-600 px-3 py-3 text-xs font-extrabold text-white"
              >
                Taşı
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[145] flex items-center justify-center bg-black/85 px-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setDeleteTarget(null);
            }
          }}
        >
          <div className="w-full max-w-[500px] overflow-hidden rounded-[26px] border border-rose-500/25 bg-[#1e293b] shadow-2xl">
            <div className="px-5 pb-4 pt-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-3xl">
                ⚠️
              </div>
              <h3 className="mt-3 text-lg font-black">
                {deleteTarget.type === "category"
                  ? "Kategori kalıcı olarak silinsin mi?"
                  : "Bu bölüm silinsin mi?"}
              </h3>
              <p className="mt-2 text-xs leading-5 text-[#94a3b8]">
                Bu bölümde {deleteSentences.length} cümle bulunuyor.
                {deleteTarget.type === "category"
                  ? " Kategori silinirse bütün alt kategoriler, alt-alt kategoriler ve cümleler de silinir."
                  : " Cümleleri başka bir yere taşıyabilir veya cümlelerle birlikte silebilirsin."}
              </p>
            </div>

            {deleteTarget.type === "category" ? (
              <div className="grid grid-cols-2 gap-2 border-t border-white/10 p-4">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="rounded-xl bg-[#0f172a] px-3 py-3 text-xs font-extrabold"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={performDeleteWithSentences}
                  className="rounded-xl bg-rose-600 px-3 py-3 text-xs font-extrabold text-white"
                >
                  Kategori ve cümleleri sil
                </button>
              </div>
            ) : deleteMode === "choice" ? (
              <div className="space-y-2 border-t border-white/10 p-4">
                <button
                  type="button"
                  onClick={() => setDeleteMode("move")}
                  className="w-full rounded-xl border border-violet-400/25 bg-violet-400/10 px-3 py-3 text-xs font-extrabold text-violet-200"
                >
                  📂 Cümleleri başka yere taşı
                </button>
                <button
                  type="button"
                  onClick={performDeleteWithSentences}
                  className="w-full rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-3 text-xs font-extrabold text-rose-300"
                >
                  🗑️ Cümlelerle birlikte sil
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="w-full rounded-xl bg-[#0f172a] px-3 py-3 text-xs font-extrabold"
                >
                  Vazgeç
                </button>
              </div>
            ) : (
              <div className="border-t border-white/10 p-4">
                <div className="mb-3 text-xs font-extrabold">
                  Cümlelerin taşınacağı yer
                </div>
                <select
                  value={deleteDestination.category}
                  onChange={(event) =>
                    setDeleteDestination({
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

                <select
                  value={deleteDestination.subcategory}
                  onChange={(event) =>
                    setDeleteDestination({
                      ...deleteDestination,
                      subcategory: event.target.value,
                      subsubcategory: "",
                    })
                  }
                  className="input-field"
                >
                  <option value="">Doğrudan üst kategori</option>
                  {deleteDestinationCategory?.subcats
                    .filter(
                      (subcategory) =>
                        !(
                          deleteTarget.type === "subcategory" &&
                          deleteTarget.categoryName ===
                            deleteDestination.category &&
                          deleteTarget.subcategoryName === subcategory
                        ),
                    )
                    .map((subcategory) => (
                      <option key={subcategory} value={subcategory}>
                        {subcategory}
                      </option>
                    ))}
                </select>

                {deleteDestination.subcategory && (
                  <select
                    value={deleteDestination.subsubcategory}
                    onChange={(event) =>
                      setDeleteDestination({
                        ...deleteDestination,
                        subsubcategory: event.target.value,
                      })
                    }
                    className="input-field mb-0"
                  >
                    <option value="">
                      Doğrudan alt kategori
                    </option>
                    {(
                      deleteDestinationCategory?.subsubcats?.[
                        deleteDestination.subcategory
                      ] ?? []
                    )
                      .filter(
                        (child) =>
                          !(
                            deleteTarget.type ===
                              "subsubcategory" &&
                            deleteTarget.categoryName ===
                              deleteDestination.category &&
                            deleteTarget.subcategoryName ===
                              deleteDestination.subcategory &&
                            deleteTarget.subsubcategoryName === child
                          ),
                      )
                      .map((child) => (
                        <option key={child} value={child}>
                          {child}
                        </option>
                      ))}
                  </select>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteMode("choice")}
                    className="rounded-xl bg-[#0f172a] px-3 py-3 text-xs font-extrabold"
                  >
                    Geri
                  </button>
                  <button
                    type="button"
                    onClick={performDeleteAndMove}
                    className="rounded-xl bg-violet-600 px-3 py-3 text-xs font-extrabold text-white"
                  >
                    Taşı ve bölümü sil
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}