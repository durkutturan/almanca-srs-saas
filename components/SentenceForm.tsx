"use client";

import { useMemo, useState } from "react";
import type {
  Category,
  NewSentenceInput,
} from "@/types/app";

type SentenceFormProps = {
  categories: Category[];
  onSave: (input: NewSentenceInput) => void;
};

type FormState = {
  icon: string;
  de: string;
  tr: string;
  categoryValue: string;
  grammar: string;
};

const INITIAL_FORM: FormState = {
  icon: "",
  de: "",
  tr: "",
  categoryValue: "",
  grammar: "",
};

export default function SentenceForm({
  categories,
  onSave,
}: SentenceFormProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [message, setMessage] = useState("");

  const firstCategoryValue = useMemo(() => {
    const firstCategory = categories[0];

    if (!firstCategory) {
      return "";
    }

    return `${firstCategory.name}|Genel`;
  }, [categories]);

  const selectedCategoryValue =
    form.categoryValue || firstCategoryValue;

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
      setMessage("Almanca ve Türkçe alanlarını doldurun.");
      return;
    }

    if (!selectedCategoryValue) {
      setMessage("Önce bir kategori oluşturmalısınız.");
      return;
    }

    const separatorIndex =
      selectedCategoryValue.indexOf("|");

    const category =
      separatorIndex >= 0
        ? selectedCategoryValue.slice(0, separatorIndex)
        : selectedCategoryValue;

    const subcategory =
      separatorIndex >= 0
        ? selectedCategoryValue.slice(separatorIndex + 1)
        : "Genel";

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

  return (
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
        💡 <strong>Cloze:</strong> Boşluk yapmak istediğin
        kelimeyi <strong>*yıldız*</strong> içine al. Örn:{" "}
        <em>Ich habe *gegessen*.</em>
      </div>

      <select
        value={selectedCategoryValue}
        onChange={(event) =>
          updateField("categoryValue", event.target.value)
        }
        className="input-field"
        disabled={categories.length === 0}
      >
        {categories.length === 0 && (
          <option value="">
            Henüz kategori bulunmuyor
          </option>
        )}

        {categories.map((category) => (
          <optgroup
            key={category.name}
            label={`${category.icon || "📁"} ${category.name}`}
          >
            <option value={`${category.name}|Genel`}>
              Genel
            </option>

            {category.subcats.map((subcategory) => (
              <option
                key={`${category.name}-${subcategory}`}
                value={`${category.name}|${subcategory}`}
              >
                {subcategory}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      <input
        type="text"
        value={form.grammar}
        onChange={(event) =>
          updateField("grammar", event.target.value)
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
  );
}