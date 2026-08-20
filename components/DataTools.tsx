"use client";

import {
  useRef,
  useState,
} from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  saveCloudData,
} from "@/lib/cloudData";
import {
  canUseFeature,
  getFeatureLabel,
  type AccessLevel,
  type PlanFeature,
} from "@/lib/planLimits";
import {
  createNewSrs,
  plainText,
} from "@/lib/srs";
import type {
  AppData,
  Category,
  Sentence,
} from "@/types/app";

const STORAGE_KEY = "cumleSRSPro";

const PERSONAL_BACKUP_FORMAT =
  "almanca-srs-personal-backup";

const SENTENCE_PACKAGE_FORMAT =
  "almanca-srs-sentence-package";

const FILE_VERSION = 2;

type DataToolsProps = {
  appData: AppData;
  onResetProgress: () => void;
  accessLevel?: AccessLevel;
  onOpenPlans?: () => void;

  /*
   * page.tsx bağlantısı eklenince içe aktarılan
   * veriler sayfa yenilenmeden uygulamaya uygulanır.
   */
  onApplyData?: (data: AppData) => void;
};

type PersonalBackupFile = {
  format: typeof PERSONAL_BACKUP_FORMAT;
  version: number;
  ownerUid: string;
  exportedAt: string;
  appData: AppData;
};

type PackageSentence = {
  de: string;
  tr: string;
  cat: string;
  subcat: string;
  subsubcat?: string;
  icon: string;
  grammar: string;
};

type SentencePackageFile = {
  format: typeof SENTENCE_PACKAGE_FORMAT;
  version: number;
  exportedAt: string;
  categories: Category[];
  sentences: PackageSentence[];
};

type BackupReadResult = {
  appData: AppData;
  ownerUid: string | null;
  isLegacy: boolean;
};

type PackageReadResult = {
  categories: Category[];
  sentences: PackageSentence[];
};

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value),
  );
}

function isValidAppData(
  value: unknown,
): value is AppData {
  if (!isRecord(value)) {
    return false;
  }

  return (
    Array.isArray(value.categories) &&
    Array.isArray(value.sentences) &&
    isRecord(value.stats)
  );
}

function normalizeSubcategory(
  value: unknown,
): string {
  if (typeof value !== "string") {
    return "";
  }

  const cleanValue = value.trim();

  return cleanValue.toLocaleLowerCase(
    "tr-TR",
  ) === "genel"
    ? ""
    : cleanValue;
}

function normalizeSubsubcategory(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function cleanCategories(
  value: unknown,
): Category[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const categoryMap = new Map<string, Category>();

  value.forEach((item) => {
    if (!isRecord(item)) {
      return;
    }

    const name =
      typeof item.name === "string"
        ? item.name.trim()
        : "";

    if (!name) {
      return;
    }

    const icon =
      typeof item.icon === "string" &&
      item.icon.trim()
        ? item.icon.trim()
        : "📁";

    const subcats = Array.isArray(item.subcats)
      ? Array.from(
          new Set(
            item.subcats
              .filter(
                (subcategory): subcategory is string =>
                  typeof subcategory === "string",
              )
              .map(normalizeSubcategory)
              .filter(Boolean),
          ),
        )
      : [];

    const rawSubsubcats = isRecord(item.subsubcats)
      ? item.subsubcats
      : {};

    const subsubcats: Record<string, string[]> = {};
    subcats.forEach((subcategory) => {
      const rawChildren = rawSubsubcats[subcategory];
      subsubcats[subcategory] = Array.isArray(rawChildren)
        ? Array.from(
            new Set(
              rawChildren
                .filter(
                  (child): child is string =>
                    typeof child === "string",
                )
                .map((child) => child.trim())
                .filter(Boolean),
            ),
          )
        : [];
    });

    const current = categoryMap.get(name);

    if (!current) {
      categoryMap.set(name, {
        name,
        icon,
        subcats,
        subsubcats,
      });
      return;
    }

    subcats.forEach((subcategory) => {
      if (!current.subcats.includes(subcategory)) {
        current.subcats.push(subcategory);
      }

      current.subsubcats ??= {};
      current.subsubcats[subcategory] ??= [];
      (subsubcats[subcategory] ?? []).forEach((child) => {
        if (!current.subsubcats![subcategory].includes(child)) {
          current.subsubcats![subcategory].push(child);
        }
      });
    });
  });

  return Array.from(categoryMap.values());
}

function cleanAppData(
  value: AppData,
): AppData {
  const categories = cleanCategories(value.categories);
  const fallbackCategory =
    categories[0]?.name || "İçe Aktarılanlar";

  const normalizedCategories =
    categories.length > 0
      ? categories
      : [
          {
            name: fallbackCategory,
            icon: "📁",
            subcats: [],
            subsubcats: {},
          },
        ];

  const categoryMap = new Map(
    normalizedCategories.map((category) => [
      category.name,
      category,
    ]),
  );

  const sentences = value.sentences
    .filter(
      (sentence) =>
        sentence &&
        typeof sentence.de === "string" &&
        typeof sentence.tr === "string",
    )
    .map((sentence) => {
      const categoryName =
        typeof sentence.cat === "string" &&
        sentence.cat.trim()
          ? sentence.cat.trim()
          : fallbackCategory;

      const subcategory = normalizeSubcategory(
        sentence.subcat,
      );
      const subsubcategory = subcategory
        ? normalizeSubsubcategory(sentence.subsubcat)
        : "";

      if (!categoryMap.has(categoryName)) {
        const category: Category = {
          name: categoryName,
          icon: "📁",
          subcats: subcategory ? [subcategory] : [],
          subsubcats: subcategory
            ? {
                [subcategory]: subsubcategory
                  ? [subsubcategory]
                  : [],
              }
            : {},
        };
        categoryMap.set(categoryName, category);
        normalizedCategories.push(category);
      } else if (subcategory) {
        const category = categoryMap.get(categoryName)!;
        if (!category.subcats.includes(subcategory)) {
          category.subcats.push(subcategory);
        }
        category.subsubcats ??= {};
        category.subsubcats[subcategory] ??= [];
        if (
          subsubcategory &&
          !category.subsubcats[subcategory].includes(
            subsubcategory,
          )
        ) {
          category.subsubcats[subcategory].push(
            subsubcategory,
          );
        }
      }

      return {
        ...sentence,
        cat: categoryName,
        subcat: subcategory,
        subsubcat: subsubcategory,
        icon: sentence.icon?.trim() || "💬",
        grammar: sentence.grammar?.trim() || "",
        srs: sentence.srs || createNewSrs(),
      };
    });

  return {
    categories: normalizedCategories,
    sentences,
    stats: {
      streak: value.stats?.streak ?? 0,
      lastStudyDay: value.stats?.lastStudyDay ?? null,
      days: value.stats?.days ?? {},
      notifyEnabled: value.stats?.notifyEnabled ?? false,
    },
  };
}

function readPersonalBackup(
  value: unknown,
): BackupReadResult | null {
  /*
   * Yeni kişisel yedek biçimi.
   */
  if (
    isRecord(value) &&
    value.format ===
      PERSONAL_BACKUP_FORMAT &&
    typeof value.ownerUid ===
      "string" &&
    isValidAppData(value.appData)
  ) {
    return {
      appData: cleanAppData(
        value.appData,
      ),
      ownerUid: value.ownerUid,
      isLegacy: false,
    };
  }

  /*
   * Eski uygulamadan alınmış ham AppData JSON'u.
   * ownerUid bulunmadığı için eski format olarak
   * kabul edilir.
   */
  if (isValidAppData(value)) {
    return {
      appData: cleanAppData(value),
      ownerUid: null,
      isLegacy: true,
    };
  }

  return null;
}

function toPackageSentence(
  sentence: Sentence,
): PackageSentence {
  return {
    de: sentence.de,
    tr: sentence.tr,
    cat: sentence.cat,
    subcat: normalizeSubcategory(sentence.subcat),
    subsubcat: normalizeSubsubcategory(sentence.subsubcat),
    icon: sentence.icon?.trim() || "💬",
    grammar: sentence.grammar?.trim() || "",
  };
}

function readSentencePackage(
  value: unknown,
): PackageReadResult | null {
  /*
   * Paylaşılabilir cümle paketi.
   */
  if (
    isRecord(value) &&
    value.format ===
      SENTENCE_PACKAGE_FORMAT &&
    Array.isArray(value.categories) &&
    Array.isArray(value.sentences)
  ) {
    const categories =
      cleanCategories(
        value.categories,
      );

    const sentences =
      value.sentences
        .filter(isRecord)
        .map((sentence) => ({
          de:
            typeof sentence.de ===
            "string"
              ? sentence.de.trim()
              : "",
          tr:
            typeof sentence.tr ===
            "string"
              ? sentence.tr.trim()
              : "",
          cat:
            typeof sentence.cat ===
              "string" &&
            sentence.cat.trim()
              ? sentence.cat.trim()
              : "İçe Aktarılanlar",
          subcat:
            normalizeSubcategory(
              sentence.subcat,
            ),
          subsubcat:
            normalizeSubsubcategory(
              sentence.subsubcat,
            ),
          icon:
            typeof sentence.icon ===
              "string" &&
            sentence.icon.trim()
              ? sentence.icon.trim()
              : "💬",
          grammar:
            typeof sentence.grammar ===
            "string"
              ? sentence.grammar.trim()
              : "",
        }))
        .filter(
          (sentence) =>
            sentence.de &&
            sentence.tr,
        );

    return {
      categories,
      sentences,
    };
  }

  /*
   * Başkasının kişisel yedeği veya eski uygulama
   * yedeği cümle paketi olarak da içe aktarılabilir.
   * Bu durumda çalışma geçmişi alınmaz.
   */
  const backup =
    readPersonalBackup(value);

  if (!backup) {
    return null;
  }

  return {
    categories:
      backup.appData.categories,
    sentences:
      backup.appData.sentences.map(
        toPackageSentence,
      ),
  };
}

function mergeSentencePackage(
  currentData: AppData,
  packageData: PackageReadResult,
): {
  data: AppData;
  addedCount: number;
  skippedCount: number;
} {
  const categoryMap = new Map<string, Category>();

  cleanCategories(currentData.categories).forEach(
    (category) => {
      categoryMap.set(category.name, {
        ...category,
        subcats: [...category.subcats],
        subsubcats: Object.fromEntries(
          Object.entries(category.subsubcats ?? {}).map(
            ([key, value]) => [key, [...value]],
          ),
        ),
      });
    },
  );

  cleanCategories(packageData.categories).forEach(
    (category) => {
      const current = categoryMap.get(category.name);

      if (!current) {
        categoryMap.set(category.name, {
          ...category,
          subcats: [...category.subcats],
          subsubcats: Object.fromEntries(
            Object.entries(category.subsubcats ?? {}).map(
              ([key, value]) => [key, [...value]],
            ),
          ),
        });
        return;
      }

      category.subcats.forEach((subcategory) => {
        if (!current.subcats.includes(subcategory)) {
          current.subcats.push(subcategory);
        }
        current.subsubcats ??= {};
        current.subsubcats[subcategory] ??= [];
        (category.subsubcats?.[subcategory] ?? []).forEach(
          (child) => {
            if (!current.subsubcats![subcategory].includes(child)) {
              current.subsubcats![subcategory].push(child);
            }
          },
        );
      });
    },
  );

  const existingKeys = new Set(
    currentData.sentences.map((sentence) =>
      [
        sentence.de.trim().toLocaleLowerCase("de-DE"),
        sentence.tr.trim().toLocaleLowerCase("tr-TR"),
        sentence.cat.trim(),
        normalizeSubcategory(sentence.subcat),
        normalizeSubsubcategory(sentence.subsubcat),
      ].join("|||"),
    ),
  );

  const existingIds = currentData.sentences.map(
    (sentence) => sentence.id,
  );
  let nextId = Math.max(
    Date.now(),
    existingIds.length > 0
      ? Math.max(...existingIds) + 1
      : 1,
  );

  const importedSentences: Sentence[] = [];
  let skippedCount = 0;

  packageData.sentences.forEach((sentence) => {
    const de = sentence.de.trim();
    const tr = sentence.tr.trim();

    if (!de || !tr) {
      skippedCount += 1;
      return;
    }

    const categoryName =
      sentence.cat.trim() || "İçe Aktarılanlar";
    const subcategory = normalizeSubcategory(
      sentence.subcat,
    );
    const subsubcategory = subcategory
      ? normalizeSubsubcategory(sentence.subsubcat)
      : "";

    const key = [
      de.toLocaleLowerCase("de-DE"),
      tr.toLocaleLowerCase("tr-TR"),
      categoryName,
      subcategory,
      subsubcategory,
    ].join("|||");

    if (existingKeys.has(key)) {
      skippedCount += 1;
      return;
    }

    existingKeys.add(key);

    let category = categoryMap.get(categoryName);
    if (!category) {
      category = {
        name: categoryName,
        icon: "📁",
        subcats: [],
        subsubcats: {},
      };
      categoryMap.set(categoryName, category);
    }

    if (subcategory) {
      if (!category.subcats.includes(subcategory)) {
        category.subcats.push(subcategory);
      }
      category.subsubcats ??= {};
      category.subsubcats[subcategory] ??= [];
      if (
        subsubcategory &&
        !category.subsubcats[subcategory].includes(
          subsubcategory,
        )
      ) {
        category.subsubcats[subcategory].push(
          subsubcategory,
        );
      }
    }

    importedSentences.push({
      id: nextId,
      de,
      tr,
      cat: categoryName,
      subcat: subcategory,
      subsubcat: subsubcategory,
      icon: sentence.icon.trim() || "💬",
      grammar: sentence.grammar.trim(),
      srs: createNewSrs(),
    });
    nextId += 1;
  });

  return {
    data: {
      categories: Array.from(categoryMap.values()),
      sentences: [
        ...currentData.sentences,
        ...importedSentences,
      ],
      stats: currentData.stats,
    },
    addedCount: importedSentences.length,
    skippedCount,
  };
}

function getDateCode() {
  const date = new Date();

  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  const hour = String(
    date.getHours(),
  ).padStart(2, "0");

  const minute = String(
    date.getMinutes(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}-${hour}-${minute}`;
}

function downloadFile(
  content: BlobPart,
  fileName: string,
  contentType: string,
) {
  const blob = new Blob(
    [content],
    {
      type: contentType,
    },
  );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;
  link.download = fileName;

  document.body.appendChild(
    link,
  );

  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function escapeCsv(value: unknown) {
  const text = String(
    value ?? "",
  ).replace(/"/g, '""');

  return `"${text}"`;
}

function formatDate(
  timestamp: number | null,
) {
  if (!timestamp) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      dateStyle: "short",
      timeStyle: "short",
    },
  ).format(new Date(timestamp));
}

function getStatus(
  reps: number,
  due: number,
) {
  if (reps === 0) {
    return "Yeni";
  }

  if (due <= Date.now()) {
    return "Tekrar bekliyor";
  }

  if (reps >= 3) {
    return "Öğrenildi";
  }

  return "Öğreniliyor";
}

function escapeHtml(
  value: unknown,
) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function DataTools({
  appData,
  onResetProgress,
  accessLevel = "pro",
  onOpenPlans,
  onApplyData,
}: DataToolsProps) {
  const {
    user,
  } = useAuth();

  const personalImportRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const packageImportRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const [isImporting, setIsImporting] =
    useState(false);

  const [isOpen, setIsOpen] =
    useState(false);

  const [lockedFeature, setLockedFeature] =
    useState<PlanFeature | null>(null);

  function requireFeature(
    feature: PlanFeature,
    action: () => void,
  ) {
    if (
      canUseFeature(
        accessLevel,
        feature,
      )
    ) {
      action();
      return;
    }

    setLockedFeature(feature);
  }

  function closeLockedFeature() {
    setLockedFeature(null);
  }

  function openPlans() {
    setLockedFeature(null);
    onOpenPlans?.();
  }

  async function applyImportedData(
    nextData: AppData,
  ) {
    if (!user) {
      throw new Error(
        "Verileri yüklemek için giriş yapmalısın.",
      );
    }

    /*
     * Önce Firestore güncellenir. Böylece sayfa
     * yenilense bile eski bulut verisi geri gelmez.
     */
    await saveCloudData(
      user.uid,
      nextData,
    );

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(nextData),
    );

    if (onApplyData) {
      onApplyData(nextData);
      return;
    }

    /*
     * page.tsx bağlantısı henüz eklenmemişse
     * güvenli geri dönüş olarak yenilenir.
     */
    window.location.reload();
  }

  function downloadPersonalBackup() {
    if (!user) {
      window.alert(
        "Kişisel yedek almak için giriş yapmalısın.",
      );

      return;
    }

    const backup:
      PersonalBackupFile = {
        format:
          PERSONAL_BACKUP_FORMAT,
        version: FILE_VERSION,
        ownerUid: user.uid,
        exportedAt:
          new Date().toISOString(),
        appData,
      };

    downloadFile(
      JSON.stringify(
        backup,
        null,
        2,
      ),
      `almanca-srs-kisisel-yedek-${getDateCode()}.json`,
      "application/json;charset=utf-8",
    );
  }

  function downloadSentencePackage() {
    const packageFile:
      SentencePackageFile = {
        format:
          SENTENCE_PACKAGE_FORMAT,
        version: FILE_VERSION,
        exportedAt:
          new Date().toISOString(),
        categories:
          appData.categories,
        sentences:
          appData.sentences.map(
            toPackageSentence,
          ),
      };

    downloadFile(
      JSON.stringify(
        packageFile,
        null,
        2,
      ),
      `almanca-srs-cumle-paketi-${getDateCode()}.json`,
      "application/json;charset=utf-8",
    );
  }

  function downloadCsv() {
    const headers = [
      "ID",
      "İkon",
      "Almanca",
      "Türkçe",
      "Kategori",
      "Alt Kategori",
      "Alt-alt Kategori",
      "Gramer Notu",
      "Durum",
      "Tekrar Sayısı",
      "Unutma Sayısı",
      "Aralık",
      "Kolaylık",
      "Son Çalışma",
      "Sonraki Tekrar",
    ];

    const rows =
      appData.sentences.map(
        (sentence) => [
          sentence.id,
          sentence.icon || "💬",
          plainText(sentence.de),
          sentence.tr,
          sentence.cat,
          sentence.subcat || "",
          sentence.subsubcat || "",
          sentence.grammar || "",
          getStatus(
            sentence.srs.reps,
            sentence.srs.due,
          ),
          sentence.srs.reps,
          sentence.srs.lapses,
          sentence.srs.interval,
          sentence.srs.ease,
          formatDate(
            sentence.srs.last,
          ),
          formatDate(
            sentence.srs.due,
          ),
        ],
      );

    const csv = [
      headers
        .map(escapeCsv)
        .join(";"),
      ...rows.map((row) =>
        row
          .map(escapeCsv)
          .join(";"),
      ),
    ].join("\n");

    downloadFile(
      `\uFEFF${csv}`,
      `almanca-srs-rapor-${getDateCode()}.csv`,
      "text/csv;charset=utf-8",
    );
  }

  function createPdfReport() {
    const learnedCount =
      appData.sentences.filter(
        (sentence) =>
          sentence.srs.reps >= 3 &&
          sentence.srs.due >
            Date.now(),
      ).length;

    const dueCount =
      appData.sentences.filter(
        (sentence) =>
          sentence.srs.reps > 0 &&
          sentence.srs.due <=
            Date.now(),
      ).length;

    const newCount =
      appData.sentences.filter(
        (sentence) =>
          sentence.srs.reps === 0,
      ).length;

    const categorySections =
      appData.categories
        .map((category) => {
          const categorySentences =
            appData.sentences.filter(
              (sentence) =>
                sentence.cat ===
                category.name,
            );

          if (
            categorySentences.length ===
            0
          ) {
            return "";
          }

          const rows =
            categorySentences
              .map(
                (
                  sentence,
                  index,
                ) => `
                  <tr>
                    <td>${index + 1}</td>

                    <td>
                      <strong>
                        ${escapeHtml(
                          plainText(
                            sentence.de,
                          ),
                        )}
                      </strong>

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
                    </td>

                    <td>
                      ${escapeHtml(
                        sentence.tr,
                      )}
                    </td>

                    <td>
                      ${escapeHtml(
                        sentence.subcat ||
                          "-",
                      )}
                    </td>

                    <td>
                      ${escapeHtml(
                        getStatus(
                          sentence.srs
                            .reps,
                          sentence.srs
                            .due,
                        ),
                      )}
                    </td>
                  </tr>
                `,
              )
              .join("");

          return `
            <section>
              <h2>
                ${escapeHtml(
                  category.icon ||
                    "📁",
                )}

                ${escapeHtml(
                  category.name,
                )}

                <small>
                  ${categorySentences.length}
                  cümle
                </small>
              </h2>

              <table>
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Almanca</th>
                    <th>Türkçe</th>
                    <th>Alt kategori</th>
                    <th>Durum</th>
                  </tr>
                </thead>

                <tbody>
                  ${rows}
                </tbody>
              </table>
            </section>
          `;
        })
        .join("");

    const reportWindow =
      window.open(
        "",
        "_blank",
        "width=1000,height=800",
      );

    if (!reportWindow) {
      window.alert(
        "PDF penceresi açılamadı. Tarayıcıdaki açılır pencere engelini kaldır.",
      );

      return;
    }

    reportWindow.document.write(`
      <!DOCTYPE html>
      <html lang="tr">
        <head>
          <meta charset="UTF-8" />
          <title>Almanca SRS Raporu</title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 28px;
              color: #172033;
              background: #ffffff;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 12px;
            }

            h1 {
              margin: 0 0 5px;
              font-size: 25px;
            }

            .date {
              margin-bottom: 22px;
              color: #64748b;
            }

            .summary {
              display: grid;
              grid-template-columns:
                repeat(4, 1fr);
              gap: 10px;
              margin-bottom: 25px;
            }

            .summary-card {
              padding: 12px;
              border:
                1px solid #dbe3ee;
              border-radius: 10px;
              background: #f8fafc;
            }

            .summary-number {
              font-size: 23px;
              font-weight: 800;
            }

            .summary-label {
              margin-top: 4px;
              color: #64748b;
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
            }

            section {
              margin-top: 24px;
              page-break-inside: avoid;
            }

            h2 {
              display: flex;
              align-items: center;
              justify-content:
                space-between;
              margin: 0 0 8px;
              padding-bottom: 6px;
              border-bottom:
                2px solid #0ea5e9;
              font-size: 16px;
            }

            h2 small {
              color: #64748b;
              font-size: 10px;
              font-weight: 600;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              page-break-inside: auto;
            }

            tr {
              page-break-inside: avoid;
            }

            th,
            td {
              padding: 7px;
              border:
                1px solid #dbe3ee;
              text-align: left;
              vertical-align: top;
            }

            th {
              background: #eaf5fb;
              font-size: 10px;
              text-transform: uppercase;
            }

            td:first-child {
              width: 35px;
              text-align: center;
            }

            .grammar {
              margin-top: 4px;
              color: #9a6700;
              font-size: 10px;
            }

            .footer {
              margin-top: 28px;
              padding-top: 8px;
              border-top:
                1px solid #dbe3ee;
              color: #64748b;
              text-align: center;
              font-size: 9px;
            }

            @media print {
              body {
                padding: 12mm;
              }
            }
          </style>
        </head>

        <body>
          <h1>
            🇩🇪 Almanca Cümle
            SRS Raporu
          </h1>

          <div class="date">
            Oluşturulma tarihi:
            ${escapeHtml(
              new Date().toLocaleString(
                "tr-TR",
              ),
            )}
          </div>

          <div class="summary">
            <div class="summary-card">
              <div class="summary-number">
                ${
                  appData.sentences
                    .length
                }
              </div>

              <div class="summary-label">
                Toplam cümle
              </div>
            </div>

            <div class="summary-card">
              <div class="summary-number">
                ${learnedCount}
              </div>

              <div class="summary-label">
                Öğrenilen
              </div>
            </div>

            <div class="summary-card">
              <div class="summary-number">
                ${newCount}
              </div>

              <div class="summary-label">
                Yeni
              </div>
            </div>

            <div class="summary-card">
              <div class="summary-number">
                ${dueCount}
              </div>

              <div class="summary-label">
                Tekrar bekliyor
              </div>
            </div>
          </div>

          ${categorySections}

          <div class="footer">
            Almanca Cümle SRS Pro
          </div>

          <script>
            window.onload = function () {
              setTimeout(function () {
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `);

    reportWindow.document.close();
  }

  async function importPersonalBackup(
    event:
      React.ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsImporting(true);

    try {
      const content =
        await file.text();

      const parsedData:
        unknown =
        JSON.parse(content);

      const backup =
        readPersonalBackup(
          parsedData,
        );

      if (!backup) {
        window.alert(
          "Bu dosya geçerli bir kişisel Almanca SRS yedeği değil.",
        );

        return;
      }

      if (!user) {
        window.alert(
          "Yedeği yüklemek için giriş yapmalısın.",
        );

        return;
      }

      if (
        backup.ownerUid &&
        backup.ownerUid !== user.uid
      ) {
        window.alert(
          "Bu kişisel yedek başka bir hesaba ait. Başkasının cümlelerini almak için “Cümle Paketi Yükle” seçeneğini kullan.",
        );

        return;
      }

      const warning =
        backup.isLegacy
          ? "Bu eski uygulamadan alınmış bir yedek. Sahibi doğrulanamıyor; fakat kendi eski verilerini aktarmak için kullanılabilir.\n\nMevcut bütün verilerin üzerine yazılacak. Devam edilsin mi?"
          : "Kişisel yedek mevcut bütün verilerin üzerine yazacak. Devam edilsin mi?";

      const approved =
        window.confirm(warning);

      if (!approved) {
        return;
      }

      await applyImportedData(
        backup.appData,
      );

      window.alert(
        "Kişisel yedek buluta kaydedildi ve başarıyla geri yüklendi. ✅",
      );
    } catch (error) {
      console.error(error);

      window.alert(
        "Dosya okunamadı. Geçerli bir JSON dosyası seç.",
      );
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  }

  async function importSentencePackage(
    event:
      React.ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsImporting(true);

    try {
      const content =
        await file.text();

      const parsedData:
        unknown =
        JSON.parse(content);

      const packageData =
        readSentencePackage(
          parsedData,
        );

      if (!packageData) {
        window.alert(
          "Bu dosyada içe aktarılabilecek geçerli cümleler bulunamadı.",
        );

        return;
      }

      const result =
        mergeSentencePackage(
          appData,
          packageData,
        );

      if (result.addedCount === 0) {
        window.alert(
          result.skippedCount > 0
            ? "Yeni cümle eklenmedi. Dosyadaki cümlelerin tamamı zaten mevcut veya geçersiz."
            : "Dosyada eklenecek cümle bulunamadı.",
        );

        return;
      }

      const approved =
        window.confirm(
          `${result.addedCount} yeni cümle eklenecek.${
            result.skippedCount > 0
              ? `\n${result.skippedCount} tekrar eden veya geçersiz cümle atlanacak.`
              : ""
          }\n\nCümleler yeni kart olarak eklenecek; başkasının SRS geçmişi ve istatistikleri alınmayacak. Devam edilsin mi?`,
        );

      if (!approved) {
        return;
      }

      await applyImportedData(
        result.data,
      );

      window.alert(
        `${result.addedCount} cümle başarıyla içe aktarıldı. ✅`,
      );
    } catch (error) {
      console.error(error);

      window.alert(
        "Dosya okunamadı. Geçerli bir JSON dosyası seç.",
      );
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  }

  return (
    <>
      <section className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-[#1e293b]">
      <button
        type="button"
        onClick={() =>
          setIsOpen(
            (current) => !current,
          )
        }
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span>
          <span className="block text-sm font-extrabold">
            💾 Rapor ve Veri Araçları
          </span>

          <span className="mt-1 block text-[10px] text-[#94a3b8]">
            Kişisel yedek, cümle
            paketi, Excel ve PDF
          </span>
        </span>

        <span className="text-xs font-extrabold text-[#38bdf8]">
          {isOpen
            ? "Kapat ▲"
            : "Aç ▼"}
        </span>
      </button>

      {isOpen && (
        <div className="space-y-2 border-t border-white/10 p-3">
          <div className="rounded-xl border border-emerald-400/15 bg-emerald-500/5 p-2">
            <div className="mb-2 px-1 text-[10px] font-extrabold uppercase tracking-wider text-[#10b981]">
              Kişisel yedek
            </div>

            <button
              type="button"
              onClick={
                downloadPersonalBackup
              }
              className="mb-2 flex w-full items-center justify-between rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2.5 text-left"
            >
              <span>
                <span className="block text-xs font-extrabold text-[#10b981]">
                  📥 Kişisel Yedeği
                  İndir
                </span>

                <span className="mt-0.5 block text-[9px] text-[#94a3b8]">
                  Cümle, kategori, SRS ve
                  istatistiklerin
                </span>
              </span>

              <span className="text-xs text-[#10b981]">
                İndir ›
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                personalImportRef.current?.click()
              }
              disabled={isImporting}
              className="flex w-full items-center justify-between rounded-xl border border-sky-400/20 bg-sky-400/10 px-3 py-2.5 text-left disabled:opacity-50"
            >
              <span>
                <span className="block text-xs font-extrabold text-[#38bdf8]">
                  📤 Kişisel Yedeği
                  Geri Yükle
                </span>

                <span className="mt-0.5 block text-[9px] text-[#94a3b8]">
                  Kendi yedeğin mevcut
                  verilerin üzerine yazılır
                </span>
              </span>

              <span className="text-xs text-[#38bdf8]">
                {isImporting
                  ? "Yükleniyor..."
                  : "Seç ›"}
              </span>
            </button>

            <input
              ref={personalImportRef}
              type="file"
              accept=".json,application/json"
              onChange={
                importPersonalBackup
              }
              className="hidden"
            />
          </div>

          <div className="rounded-xl border border-purple-400/15 bg-purple-500/5 p-2">
            <div className="mb-2 px-1 text-[10px] font-extrabold uppercase tracking-wider text-[#c084fc]">
              Paylaşılabilir cümle paketi
            </div>

            <button
              type="button"
              onClick={() =>
                requireFeature(
                  "sentencePackage",
                  downloadSentencePackage,
                )
              }
              className="mb-2 flex w-full items-center justify-between rounded-xl border border-purple-400/20 bg-purple-500/10 px-3 py-2.5 text-left"
            >
              <span>
                <span className="block text-xs font-extrabold text-[#c084fc]">
                  📦 Cümle Paketi İndir
                </span>

                <span className="mt-0.5 block text-[9px] text-[#94a3b8]">
                  Cümleler paylaşılır; kişisel
                  ilerleme paylaşılmaz
                </span>
              </span>

              <span className="flex items-center gap-1.5 text-xs text-[#c084fc]">
                {accessLevel === "free" && (
                  <span className="rounded-md border border-amber-400/25 bg-amber-400/10 px-1.5 py-0.5 text-[8px] font-black text-amber-300">
                    PRO
                  </span>
                )}

                İndir ›
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                requireFeature(
                  "sentencePackage",
                  () =>
                    packageImportRef.current?.click(),
                )
              }
              disabled={isImporting}
              className="flex w-full items-center justify-between rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2.5 text-left disabled:opacity-50"
            >
              <span>
                <span className="block text-xs font-extrabold text-[#22d3ee]">
                  📚 Cümle Paketi Yükle
                </span>

                <span className="mt-0.5 block text-[9px] text-[#94a3b8]">
                  Başkasının yedeğindeki
                  cümleleri yeni kart olarak ekle
                </span>
              </span>

              <span className="flex items-center gap-1.5 text-xs text-[#22d3ee]">
                {accessLevel === "free" && (
                  <span className="rounded-md border border-amber-400/25 bg-amber-400/10 px-1.5 py-0.5 text-[8px] font-black text-amber-300">
                    PRO
                  </span>
                )}

                {isImporting
                  ? "Yükleniyor..."
                  : "Seç ›"}
              </span>
            </button>

            <input
              ref={packageImportRef}
              type="file"
              accept=".json,application/json"
              onChange={
                importSentencePackage
              }
              className="hidden"
            />
          </div>

          <button
            type="button"
            onClick={() =>
              requireFeature(
                "csvExport",
                downloadCsv,
              )
            }
            className="flex w-full items-center justify-between rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-3 py-2.5 text-left"
          >
            <span>
              <span className="block text-xs font-extrabold text-[#eab308]">
                📊 Excel / CSV
              </span>

              <span className="mt-0.5 block text-[9px] text-[#94a3b8]">
                Cümleleri tablo olarak indir
              </span>
            </span>

            <span className="flex items-center gap-1.5 text-xs text-[#eab308]">
              {accessLevel === "free" && (
                <span className="rounded-md border border-amber-400/25 bg-amber-400/10 px-1.5 py-0.5 text-[8px] font-black text-amber-300">
                  PRO
                </span>
              )}

              İndir ›
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              requireFeature(
                "pdfExport",
                createPdfReport,
              )
            }
            className="flex w-full items-center justify-between rounded-xl border border-purple-400/20 bg-purple-500/10 px-3 py-2.5 text-left"
          >
            <span>
              <span className="block text-xs font-extrabold text-[#a855f7]">
                📄 PDF Raporu
              </span>

              <span className="mt-0.5 block text-[9px] text-[#94a3b8]">
                Yazdırma ekranından PDF kaydet
              </span>
            </span>

            <span className="flex items-center gap-1.5 text-xs text-[#a855f7]">
              {accessLevel === "free" && (
                <span className="rounded-md border border-amber-400/25 bg-amber-400/10 px-1.5 py-0.5 text-[8px] font-black text-amber-300">
                  PRO
                </span>
              )}

              Oluştur ›
            </span>
          </button>

          <button
            type="button"
            onClick={
              onResetProgress
            }
            className="flex w-full items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-left"
          >
            <span>
              <span className="block text-xs font-extrabold text-[#f43f5e]">
                🔄 Çalışma İlerlemesini
                Sıfırla
              </span>

              <span className="mt-0.5 block text-[9px] text-[#94a3b8]">
                Cümleler ve kategoriler
                silinmez
              </span>
            </span>

            <span className="text-xs text-[#f43f5e]">
              Sıfırla ›
            </span>
          </button>

          <div className="rounded-xl bg-black/20 px-3 py-2 text-[9px] text-[#94a3b8]">
            📦 {appData.sentences.length}
            {" "}cümle •{" "}
            {appData.categories.length}
            {" "}kategori
          </div>
        </div>
      )}
    </section>

      {lockedFeature && (
        <div
          className="fixed inset-0 z-[210] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeLockedFeature();
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
                  {getFeatureLabel(
                    lockedFeature,
                  )}
                </strong>{" "}
                Free planda kullanılamaz. Pro plan veya
                aktif Pro deneme ile bu özelliği
                kullanabilirsin.
              </p>
            </div>

            <div className="space-y-2 p-4">
              {onOpenPlans && (
                <button
                  type="button"
                  onClick={openPlans}
                  className="w-full rounded-xl border border-amber-400/25 bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-4 py-3 text-xs font-black text-amber-200"
                >
                  👑 Pro Planı İncele
                </button>
              )}

              <button
                type="button"
                onClick={closeLockedFeature}
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
