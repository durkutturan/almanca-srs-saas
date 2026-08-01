"use client";

import { useMemo, useState } from "react";
import {
  canUseFeature,
  getFeatureLabel,
  type AccessLevel,
} from "@/lib/planLimits";
import type {
  Category,
  NewSentenceInput,
} from "@/types/app";

type SentenceFormProps = {
  categories: Category[];
  onSave: (input: NewSentenceInput) => void;
  accessLevel?: AccessLevel;
  onOpenPlans?: () => void;
};

type FormState = {
  icon: string;
  de: string;
  tr: string;
  categoryValue: string;
  grammar: string;
};

type CategoryPickerProps = {
  categories: Category[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

type ParsedCategory = {
  category: string;
  subcategory: string;
};

const INITIAL_FORM: FormState = {
  icon: "",
  de: "",
  tr: "",
  categoryValue: "",
  grammar: "",
};

function parseCategoryValue(
  categoryValue: string,
): ParsedCategory {
  const separatorIndex = categoryValue.indexOf("|");

  if (separatorIndex < 0) {
    return {
      category: categoryValue,
      subcategory: "",
    };
  }

  return {
    category: categoryValue.slice(0, separatorIndex),
    subcategory:
      categoryValue.slice(separatorIndex + 1),
  };
}

function getCategoryLabel(
  categories: Category[],
  categoryValue: string,
): string {
  if (!categoryValue) {
    return "Kategori seç";
  }

  const { category, subcategory } =
    parseCategoryValue(categoryValue);

  const categoryItem = categories.find(
    (item) => item.name === category,
  );

  const icon = categoryItem?.icon || "📁";

  return subcategory
    ? `${icon} ${category} › ${subcategory}`
    : `${icon} ${category}`;
}

function CategoryPicker({
  categories,
  value,
  onChange,
  disabled = false,
}: CategoryPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedCategoryName =
    parseCategoryValue(value).category;

  const [expandedCategory, setExpandedCategory] =
    useState<string | null>(
      selectedCategoryName ||
        categories[0]?.name ||
        null,
    );

  function chooseCategory(nextValue: string) {
    onChange(nextValue);
    setIsOpen(false);
  }

  return (
    <div className="relative mb-2.5">
      <button
        type="button"
        onClick={() =>
          setIsOpen((current) => !current)
        }
        disabled={disabled}
        className="input-field flex w-full items-center justify-between text-left disabled:cursor-not-allowed disabled:opacity-60"
        aria-expanded={isOpen}
      >
        <span className="truncate">
          {disabled
            ? "Henüz kategori bulunmuyor"
            : getCategoryLabel(categories, value)}
        </span>

        <span
          className={[
            "ml-3 shrink-0 text-xs transition-transform",
            isOpen ? "rotate-180" : "",
          ].join(" ")}
        >
          ▼
        </span>
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-white/10 bg-[#0f172a] p-2 shadow-2xl">
          {categories.map((category) => {
            const isExpanded =
              expandedCategory === category.name;

            const directValue =
              `${category.name}|`;

            return (
              <div
                key={category.name}
                className="mb-1 last:mb-0"
              >
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      chooseCategory(directValue)
                    }
                    className={[
                      "min-w-0 flex-1 rounded-lg px-3 py-2 text-left text-sm font-extrabold",
                      value === directValue
                        ? "bg-sky-500/20 text-sky-300"
                        : "bg-white/5 hover:bg-white/10",
                    ].join(" ")}
                  >
                    <span className="truncate">
                      {category.icon || "📁"}{" "}
                      {category.name}
                    </span>
                  </button>

                  {category.subcats.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedCategory(
                          isExpanded
                            ? null
                            : category.name,
                        )
                      }
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[10px] hover:bg-white/10"
                      aria-label={`${category.name} alt kategorilerini aç`}
                      aria-expanded={isExpanded}
                    >
                      <span
                        className={[
                          "transition-transform",
                          isExpanded
                            ? "rotate-180"
                            : "",
                        ].join(" ")}
                      >
                        ▼
                      </span>
                    </button>
                  )}
                </div>

                {isExpanded &&
                  category.subcats.length > 0 && (
                    <div className="mt-1 space-y-1 pl-3">
                      {category.subcats.map(
                        (subcategory) => {
                          const optionValue =
                            `${category.name}|${subcategory}`;

                          return (
                            <button
                              type="button"
                              key={optionValue}
                              onClick={() =>
                                chooseCategory(
                                  optionValue,
                                )
                              }
                              className={[
                                "w-full rounded-lg px-3 py-2 text-left text-xs font-bold",
                                value === optionValue
                                  ? "bg-sky-500/20 text-sky-300"
                                  : "bg-white/[0.03] text-slate-200 hover:bg-white/10",
                              ].join(" ")}
                            >
                              ↳ {subcategory}
                            </button>
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
}

export default function SentenceForm({
  categories,
  onSave,
  accessLevel = "pro",
  onOpenPlans,
}: SentenceFormProps) {
  const [form, setForm] =
    useState<FormState>(INITIAL_FORM);

  const [message, setMessage] = useState("");

  const [bulkOpen, setBulkOpen] = useState(false);
  const [showProLock, setShowProLock] =
    useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkCategoryValue, setBulkCategoryValue] =
    useState("");
  const [bulkIcon, setBulkIcon] = useState("");
  const [bulkGrammar, setBulkGrammar] =
    useState("");
  const [bulkMessage, setBulkMessage] =
    useState("");

  const firstCategoryValue = useMemo(() => {
    const firstCategory = categories[0];

    if (!firstCategory) {
      return "";
    }

    return `${firstCategory.name}|`;
  }, [categories]);

  const selectedCategoryValue =
    form.categoryValue || firstCategoryValue;

  const selectedBulkCategoryValue =
    bulkCategoryValue ||
    selectedCategoryValue ||
    firstCategoryValue;

  function updateField<Key extends keyof FormState>(
    field: Key,
    value: FormState[Key],
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));

    if (message) {
      setMessage("");
    }
  }

  function handleSave() {
    const de = form.de.trim();
    const tr = form.tr.trim();

    if (!de || !tr) {
      setMessage(
        "Almanca ve Türkçe alanlarını doldurun.",
      );
      return;
    }

    if (!selectedCategoryValue) {
      setMessage(
        "Önce bir kategori oluşturmalısınız.",
      );
      return;
    }

    const { category, subcategory } =
      parseCategoryValue(selectedCategoryValue);

    onSave({
      de,
      tr,
      category,
      subcategory,
      icon: form.icon,
      grammar: form.grammar,
    });

    setForm({
      ...INITIAL_FORM,
      categoryValue: selectedCategoryValue,
    });

    setMessage("Cümle kaydedildi. ✅");
  }

  function handleBulkToggle() {
    if (
      !canUseFeature(
        accessLevel,
        "bulkAdd",
      )
    ) {
      setShowProLock(true);
      return;
    }

    setBulkOpen(
      (current) => !current,
    );
  }

  function handleBulkSave() {
    if (
      !canUseFeature(
        accessLevel,
        "bulkAdd",
      )
    ) {
      setShowProLock(true);
      return;
    }

    setBulkMessage("");

    if (!selectedBulkCategoryValue) {
      setBulkMessage(
        "Önce bir kategori oluşturmalısınız.",
      );
      return;
    }

    const lines = bulkText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setBulkMessage(
        "En az bir Almanca | Türkçe satırı yazın.",
      );
      return;
    }

    const parsedLines: Array<{
      de: string;
      tr: string;
    }> = [];

    const invalidLineNumbers: number[] = [];

    lines.forEach((line, index) => {
      const pipeIndex = line.indexOf("|");
      const tabIndex = line.indexOf("\t");

      let separatorIndex = -1;

      if (pipeIndex >= 0 && tabIndex >= 0) {
        separatorIndex = Math.min(
          pipeIndex,
          tabIndex,
        );
      } else {
        separatorIndex = Math.max(
          pipeIndex,
          tabIndex,
        );
      }

      if (separatorIndex < 0) {
        invalidLineNumbers.push(index + 1);
        return;
      }

      const de = line
        .slice(0, separatorIndex)
        .trim();

      const tr = line
        .slice(separatorIndex + 1)
        .trim();

      if (!de || !tr) {
        invalidLineNumbers.push(index + 1);
        return;
      }

      parsedLines.push({ de, tr });
    });

    if (invalidLineNumbers.length > 0) {
      setBulkMessage(
        `Şu satırlar hatalı: ${invalidLineNumbers.join(
          ", ",
        )}. Her satır "Almanca | Türkçe" şeklinde olmalı.`,
      );
      return;
    }

    const { category, subcategory } =
      parseCategoryValue(
        selectedBulkCategoryValue,
      );

    parsedLines.forEach(({ de, tr }) => {
      onSave({
        de,
        tr,
        category,
        subcategory,
        icon: bulkIcon,
        grammar: bulkGrammar,
      });
    });

    setBulkText("");
    setBulkMessage(
      `${parsedLines.length} cümle kaydedildi. ✅`,
    );
  }

  return (
    <>
      <div className="space-y-3">
      <div className="app-card">
        <input
          type="text"
          value={form.icon}
          onChange={(event) =>
            updateField("icon", event.target.value)
          }
          className="input-field"
          placeholder="🖼️ İkon (örn: 💬)"
        />

        <textarea
          value={form.de}
          onChange={(event) =>
            updateField("de", event.target.value)
          }
          className="input-field flag-de"
          placeholder="Örn: Ich möchte die Suppe *probieren*."
        />

        <textarea
          value={form.tr}
          onChange={(event) =>
            updateField("tr", event.target.value)
          }
          className="input-field flag-tr"
          placeholder="Örn: Çorbayı tatmak istiyorum."
        />

        <div className="cloze-info">
          💡 <strong>Cloze:</strong> Boşluk yapmak
          istediğin kelimeyi <strong>*yıldız*</strong>{" "}
          içine al. Örn:{" "}
          <em>Ich habe *gegessen*.</em>
        </div>

        <CategoryPicker
          categories={categories}
          value={selectedCategoryValue}
          onChange={(value) =>
            updateField("categoryValue", value)
          }
          disabled={categories.length === 0}
        />

        <input
          type="text"
          value={form.grammar}
          onChange={(event) =>
            updateField(
              "grammar",
              event.target.value,
            )
          }
          className="input-field grammar-input"
          placeholder="💡 Opsiyonel: Kısa Gramer Bilgisi"
        />

        {message && (
          <div
            className={[
              "mb-2.5 rounded-lg px-3 py-2 text-xs font-bold",
              message.includes("✅")
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-rose-500/10 text-rose-400",
            ].join(" ")}
          >
            {message}
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          className="app-button app-button-primary"
        >
          ✚ Kaydet
        </button>
      </div>

      <div className="app-card">
        <button
          type="button"
          onClick={handleBulkToggle}
          className="flex w-full items-center justify-between text-left"
          aria-expanded={bulkOpen}
        >
          <span>
            <span className="flex items-center gap-2 text-sm font-extrabold">
              <span>📚 Toplu Cümle Ekle</span>

              {accessLevel === "free" && (
                <span className="rounded-md border border-amber-400/25 bg-amber-400/10 px-1.5 py-0.5 text-[8px] font-black text-amber-300">
                  PRO
                </span>
              )}
            </span>

            <span className="mt-1 block text-[11px] text-slate-400">
              Birden fazla cümleyi aynı kategoriye
              ekle
            </span>
          </span>

          <span
            className={[
              "ml-3 text-xs transition-transform",
              bulkOpen ? "rotate-180" : "",
            ].join(" ")}
          >
            ▼
          </span>
        </button>

        {bulkOpen && (
          <div className="mt-4 border-t border-white/10 pt-4">
            <div className="cloze-info">
              Her satırı şu şekilde yaz:
              <br />
              <strong>
                Almanca cümle | Türkçe cümle
              </strong>
              <br />
              Örnek:
              <br />
              <em>
                Ich bin müde | Ben yorgunum
              </em>
            </div>

            <CategoryPicker
              categories={categories}
              value={selectedBulkCategoryValue}
              onChange={(value) => {
                setBulkCategoryValue(value);
                setBulkMessage("");
              }}
              disabled={categories.length === 0}
            />

            <input
              type="text"
              value={bulkIcon}
              onChange={(event) => {
                setBulkIcon(event.target.value);
                setBulkMessage("");
              }}
              className="input-field"
              placeholder="🖼️ Tüm cümleler için ikon (opsiyonel)"
            />

            <input
              type="text"
              value={bulkGrammar}
              onChange={(event) => {
                setBulkGrammar(
                  event.target.value,
                );
                setBulkMessage("");
              }}
              className="input-field grammar-input"
              placeholder="💡 Tüm cümleler için gramer notu (opsiyonel)"
            />

            <textarea
              value={bulkText}
              onChange={(event) => {
                setBulkText(event.target.value);
                setBulkMessage("");
              }}
              className="input-field min-h-48 font-mono text-xs"
              placeholder={
                "Ich bin müde | Ben yorgunum\nIch habe Hunger | Acıktım\nWo ist der Bahnhof? | Tren istasyonu nerede?"
              }
            />

            {bulkMessage && (
              <div
                className={[
                  "mb-2.5 rounded-lg px-3 py-2 text-xs font-bold",
                  bulkMessage.includes("✅")
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-rose-500/10 text-rose-400",
                ].join(" ")}
              >
                {bulkMessage}
              </div>
            )}

            <button
              type="button"
              onClick={handleBulkSave}
              className="app-button app-button-primary"
            >
              📥 Toplu Kaydet
            </button>
          </div>
        )}
      </div>
    </div>

      {showProLock && (
        <div
          className="fixed inset-0 z-[210] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowProLock(false);
            }
          }}
        >
          <div className="w-full max-w-[420px] overflow-hidden rounded-[24px] border border-amber-400/20 bg-[#1e293b] shadow-2xl">
            <div className="border-b border-white/10 px-5 py-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-3xl">
                👑
              </div>

              <h3 className="mt-3 text-lg font-black">
                Pro özelliği
              </h3>

              <p className="mt-2 text-xs leading-5 text-[#94a3b8]">
                <strong className="text-amber-300">
                  {getFeatureLabel("bulkAdd")}
                </strong>{" "}
                Free planda kullanılamaz. Pro plan
                veya aktif Pro deneme ile birden fazla
                cümleyi aynı anda ekleyebilirsin.
              </p>
            </div>

            <div className="space-y-2 p-4">
              {onOpenPlans && (
                <button
                  type="button"
                  onClick={() => {
                    setShowProLock(false);
                    onOpenPlans();
                  }}
                  className="w-full rounded-xl border border-amber-400/25 bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-4 py-3 text-xs font-black text-amber-200"
                >
                  👑 Pro Planı İncele
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  setShowProLock(false)
                }
                className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-xs font-extrabold text-[#cbd5e1]"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
