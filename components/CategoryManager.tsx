"use client";

import { useEffect, useState } from "react";
import type { Category } from "@/types/app";

type CategoryManagerProps = {
  isOpen: boolean;
  categories: Category[];
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
  ) => boolean;
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

export default function CategoryManager({
  isOpen,
  categories,
  onClose,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onAddSubcategory,
  onRenameSubcategory,
  onDeleteSubcategory,
}: CategoryManagerProps) {
  const [newCategoryName, setNewCategoryName] =
    useState("");
  const [newCategoryIcon, setNewCategoryIcon] =
    useState("📁");

  const [newSubcategories, setNewSubcategories] =
    useState<Record<string, string>>({});

  const [editingCategory, setEditingCategory] =
    useState<EditingCategory | null>(null);

  const [editingSubcategory, setEditingSubcategory] =
    useState<EditingSubcategory | null>(null);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    if (isOpen) {
      window.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape,
      );
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  function addCategory() {
    const name = newCategoryName.trim();
    const icon = newCategoryIcon.trim() || "📁";

    if (!name) {
      window.alert("Kategori adını yazmalısın.");
      return;
    }

    const added = onAddCategory(name, icon);

    if (added) {
      setNewCategoryName("");
      setNewCategoryIcon("📁");
    }
  }

  function saveCategoryEdit() {
    if (!editingCategory) {
      return;
    }

    const name = editingCategory.name.trim();
    const icon = editingCategory.icon.trim() || "📁";

    if (!name) {
      window.alert("Kategori adı boş bırakılamaz.");
      return;
    }

    const updated = onUpdateCategory(
      editingCategory.oldName,
      name,
      icon,
    );

    if (updated) {
      setEditingCategory(null);
    }
  }

  function deleteCategory(categoryName: string) {
    const approved = window.confirm(
      `"${categoryName}" kategorisi silinsin mi?\n\nBu kategorideki cümleler başka kategoriye taşınacaktır.`,
    );

    if (approved) {
      onDeleteCategory(categoryName);
    }
  }

  function addSubcategory(categoryName: string) {
    const name =
      newSubcategories[categoryName]?.trim() || "";

    if (!name) {
      window.alert("Alt kategori adını yazmalısın.");
      return;
    }

    const added = onAddSubcategory(
      categoryName,
      name,
    );

    if (added) {
      setNewSubcategories((current) => ({
        ...current,
        [categoryName]: "",
      }));
    }
  }

  function saveSubcategoryEdit() {
    if (!editingSubcategory) {
      return;
    }

    const name = editingSubcategory.name.trim();

    if (!name) {
      window.alert(
        "Alt kategori adı boş bırakılamaz.",
      );
      return;
    }

    const updated = onRenameSubcategory(
      editingSubcategory.categoryName,
      editingSubcategory.oldName,
      name,
    );

    if (updated) {
      setEditingSubcategory(null);
    }
  }

  function deleteSubcategory(
    categoryName: string,
    subcategoryName: string,
  ) {
    const approved = window.confirm(
      `"${subcategoryName}" alt kategorisi silinsin mi?\n\nBu gruptaki cümleler Genel bölümüne taşınacaktır.`,
    );

    if (approved) {
      onDeleteSubcategory(
        categoryName,
        subcategoryName,
      );
    }
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 px-3 py-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
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
              Kategori ve alt kategorileri düzenle.
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
                  if (event.key === "Enter") {
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
            {categories.map((category) => (
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
                        value={editingCategory.icon}
                        onChange={(event) =>
                          setEditingCategory({
                            ...editingCategory,
                            icon: event.target.value,
                          })
                        }
                        className="h-9 w-12 rounded-lg border border-white/10 bg-[#1e293b] px-2 text-center"
                        maxLength={8}
                      />

                      <input
                        type="text"
                        value={editingCategory.name}
                        onChange={(event) =>
                          setEditingCategory({
                            ...editingCategory,
                            name: event.target.value,
                          })
                        }
                        className="h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-[#1e293b] px-3 text-sm outline-none"
                      />

                      <button
                        type="button"
                        onClick={saveCategoryEdit}
                        className="h-9 rounded-lg bg-[#10b981] px-3 text-[11px] font-extrabold text-white"
                      >
                        Kaydet
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setEditingCategory(null)
                        }
                        className="h-9 rounded-lg bg-white/10 px-3 text-[11px] font-bold"
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

                        <div className="text-[10px] text-[#94a3b8]">
                          {category.subcats.length} alt
                          kategori
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setEditingCategory({
                            oldName: category.name,
                            name: category.name,
                            icon: category.icon || "📁",
                          })
                        }
                        className="rounded-lg border border-sky-400/20 bg-sky-400/10 px-2.5 py-1.5 text-[10px] font-extrabold text-[#38bdf8]"
                      >
                        ✏️
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteCategory(category.name)
                        }
                        disabled={categories.length === 1}
                        className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-2.5 py-1.5 text-[10px] font-extrabold text-[#f43f5e] disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>

                <div className="p-3">
                  <div className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-[#94a3b8]">
                    Alt kategoriler
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
                      <span className="flex-1 text-xs font-bold">
                        📄 Genel
                      </span>

                      <span className="text-[9px] text-[#64748b]">
                        Sabit
                      </span>
                    </div>

                    {category.subcats.map(
                      (subcategory) => {
                        const isEditing =
                          editingSubcategory?.categoryName ===
                            category.name &&
                          editingSubcategory.oldName ===
                            subcategory;

                        return (
                          <div
                            key={subcategory}
                            className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2"
                          >
                            {isEditing ? (
                              <>
                                <input
                                  type="text"
                                  value={
                                    editingSubcategory.name
                                  }
                                  onChange={(event) =>
                                    setEditingSubcategory({
                                      ...editingSubcategory,
                                      name: event.target.value,
                                    })
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
                                  📄 {subcategory}
                                </span>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingSubcategory({
                                      categoryName:
                                        category.name,
                                      oldName: subcategory,
                                      name: subcategory,
                                    })
                                  }
                                  className="rounded-lg bg-sky-400/10 px-2 py-1 text-[10px] text-[#38bdf8]"
                                >
                                  ✏️
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    deleteSubcategory(
                                      category.name,
                                      subcategory,
                                    )
                                  }
                                  className="rounded-lg bg-rose-500/10 px-2 py-1 text-[10px] text-[#f43f5e]"
                                >
                                  🗑️
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
                              event.target.value,
                          }),
                        )
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
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
                        addSubcategory(category.name)
                      }
                      className="h-9 shrink-0 rounded-lg border border-sky-400/30 bg-sky-400/10 px-3 text-[10px] font-extrabold text-[#38bdf8]"
                    >
                      + Ekle
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
    </div>
  );
}