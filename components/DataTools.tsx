"use client";

import { useRef, useState } from "react";
import { plainText } from "@/lib/srs";
import type { AppData } from "@/types/app";

const STORAGE_KEY = "cumleSRSPro";

type DataToolsProps = {
  appData: AppData;
};

function isValidBackup(value: unknown): value is AppData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const data = value as Partial<AppData>;

  return (
    Array.isArray(data.categories) &&
    Array.isArray(data.sentences) &&
    typeof data.stats === "object" &&
    data.stats !== null
  );
}

function getDateCode() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(
    2,
    "0",
  );
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(
    2,
    "0",
  );

  return `${year}-${month}-${day}-${hour}-${minute}`;
}

function downloadFile(
  content: BlobPart,
  fileName: string,
  contentType: string,
) {
  const blob = new Blob([content], {
    type: contentType,
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "").replace(
    /"/g,
    '""',
  );

  return `"${text}"`;
}

function formatDate(timestamp: number) {
  if (!timestamp) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(timestamp));
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

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function DataTools({
  appData,
}: DataToolsProps) {
  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [isImporting, setIsImporting] =
    useState(false);

  function downloadBackup() {
    const json = JSON.stringify(appData, null, 2);

    downloadFile(
      json,
      `almanca-srs-yedek-${getDateCode()}.json`,
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
      "Gramer Notu",
      "Durum",
      "Tekrar Sayısı",
      "Unutma Sayısı",
      "Aralık",
      "Kolaylık",
      "Son Çalışma",
      "Sonraki Tekrar",
    ];

    const rows = appData.sentences.map(
      (sentence) => [
        sentence.id,
        sentence.icon || "💬",
        plainText(sentence.de),
        sentence.tr,
        sentence.cat,
        sentence.subcat || "Genel",
        sentence.grammar || "",
        getStatus(
          sentence.srs.reps,
          sentence.srs.due,
        ),
        sentence.srs.reps,
        sentence.srs.lapses,
        sentence.srs.interval,
        sentence.srs.ease,
        formatDate(sentence.srs.last),
        formatDate(sentence.srs.due),
      ],
    );

    const csv = [
      headers.map(escapeCsv).join(";"),
      ...rows.map((row) =>
        row.map(escapeCsv).join(";"),
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
          sentence.srs.due > Date.now(),
      ).length;

    const dueCount =
      appData.sentences.filter(
        (sentence) =>
          sentence.srs.reps > 0 &&
          sentence.srs.due <= Date.now(),
      ).length;

    const newCount =
      appData.sentences.filter(
        (sentence) =>
          sentence.srs.reps === 0,
      ).length;

    const categorySections =
      appData.categories
        .map((category) => {
          const sentences =
            appData.sentences.filter(
              (sentence) =>
                sentence.cat === category.name,
            );

          if (sentences.length === 0) {
            return "";
          }

          const rows = sentences
            .map(
              (sentence, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>
                    <strong>${escapeHtml(
                      plainText(sentence.de),
                    )}</strong>
                    ${
                      sentence.grammar
                        ? `<div class="grammar">💡 ${escapeHtml(
                            sentence.grammar,
                          )}</div>`
                        : ""
                    }
                  </td>
                  <td>${escapeHtml(
                    sentence.tr,
                  )}</td>
                  <td>${escapeHtml(
                    sentence.subcat ||
                      "Genel",
                  )}</td>
                  <td>${escapeHtml(
                    getStatus(
                      sentence.srs.reps,
                      sentence.srs.due,
                    ),
                  )}</td>
                </tr>
              `,
            )
            .join("");

          return `
            <section>
              <h2>
                ${escapeHtml(
                  category.icon || "📁",
                )}
                ${escapeHtml(category.name)}
                <small>${sentences.length} cümle</small>
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

                <tbody>${rows}</tbody>
              </table>
            </section>
          `;
        })
        .join("");

    const reportWindow = window.open(
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
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin-bottom: 25px;
            }

            .summary-card {
              padding: 12px;
              border: 1px solid #dbe3ee;
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
              justify-content: space-between;
              margin: 0 0 8px;
              padding-bottom: 6px;
              border-bottom: 2px solid #0ea5e9;
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
              border: 1px solid #dbe3ee;
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
              border-top: 1px solid #dbe3ee;
              color: #64748b;
              text-align: center;
              font-size: 9px;
            }

            @media print {
              body {
                padding: 12mm;
              }

              .no-print {
                display: none;
              }
            }
          </style>
        </head>

        <body>
          <h1>🇩🇪 Almanca Cümle SRS Raporu</h1>

          <div class="date">
            Oluşturulma tarihi:
            ${escapeHtml(
              new Date().toLocaleString("tr-TR"),
            )}
          </div>

          <div class="summary">
            <div class="summary-card">
              <div class="summary-number">
                ${appData.sentences.length}
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

  async function importBackup(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const approved = window.confirm(
      "Yedek yüklendiğinde mevcut verilerin üzerine yazılacak. Devam edilsin mi?",
    );

    if (!approved) {
      event.target.value = "";
      return;
    }

    setIsImporting(true);

    try {
      const content = await file.text();
      const parsedData: unknown =
        JSON.parse(content);

      if (!isValidBackup(parsedData)) {
        window.alert(
          "Bu dosya geçerli bir Almanca SRS yedeği değil.",
        );
        return;
      }

      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(parsedData),
      );

      window.alert(
        "Yedek başarıyla yüklendi. Uygulama yenilenecek.",
      );

      window.location.reload();
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

  function resetAllData() {
    const firstApproval = window.confirm(
      "Tüm cümleler, kategoriler ve çalışma bilgileri silinecek. Devam edilsin mi?",
    );

    if (!firstApproval) {
      return;
    }

    const secondApproval = window.confirm(
      "Bu işlem geri alınamaz. Verileri gerçekten sıfırlamak istiyor musun?",
    );

    if (!secondApproval) {
      return;
    }

    window.localStorage.removeItem(STORAGE_KEY);

    window.alert(
      "Tüm veriler sıfırlandı. Uygulama yenilenecek.",
    );

    window.location.reload();
  }

  return (
    <section className="mt-4 rounded-2xl border border-white/10 bg-[#1e293b] p-4">
      <div className="mb-3">
        <div className="text-sm font-extrabold">
          💾 Rapor ve Veri Yönetimi
        </div>

        <div className="mt-1 text-[10px] leading-4 text-[#94a3b8]">
          Verilerini yedekle, raporla veya geri
          yükle.
        </div>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={downloadBackup}
          className="flex w-full items-center justify-between rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-3 text-left"
        >
          <span>
            <span className="block text-xs font-extrabold text-[#10b981]">
              📥 JSON Yedeğini İndir
            </span>

            <span className="mt-1 block text-[10px] text-[#94a3b8]">
              Tüm uygulama verilerinin yedeği
            </span>
          </span>

          <span className="text-sm text-[#10b981]">
            İndir ›
          </span>
        </button>

        <button
          type="button"
          onClick={downloadCsv}
          className="flex w-full items-center justify-between rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-3 py-3 text-left"
        >
          <span>
            <span className="block text-xs font-extrabold text-[#eab308]">
              📊 Excel / CSV Raporu
            </span>

            <span className="mt-1 block text-[10px] text-[#94a3b8]">
              Cümleleri tablo olarak indir
            </span>
          </span>

          <span className="text-sm text-[#eab308]">
            İndir ›
          </span>
        </button>

        <button
          type="button"
          onClick={createPdfReport}
          className="flex w-full items-center justify-between rounded-xl border border-purple-400/20 bg-purple-500/10 px-3 py-3 text-left"
        >
          <span>
            <span className="block text-xs font-extrabold text-[#a855f7]">
              📄 PDF Raporu
            </span>

            <span className="mt-1 block text-[10px] text-[#94a3b8]">
              Yazdır ekranından PDF olarak kaydet
            </span>
          </span>

          <span className="text-sm text-[#a855f7]">
            Oluştur ›
          </span>
        </button>

        <button
          type="button"
          onClick={() =>
            fileInputRef.current?.click()
          }
          disabled={isImporting}
          className="flex w-full items-center justify-between rounded-xl border border-sky-400/20 bg-sky-400/10 px-3 py-3 text-left disabled:opacity-50"
        >
          <span>
            <span className="block text-xs font-extrabold text-[#38bdf8]">
              📤 JSON Yedeğini Yükle
            </span>

            <span className="mt-1 block text-[10px] text-[#94a3b8]">
              Daha önceki verileri geri getir
            </span>
          </span>

          <span className="text-sm text-[#38bdf8]">
            {isImporting
              ? "Yükleniyor..."
              : "Seç ›"}
          </span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={importBackup}
          className="hidden"
        />

        <button
          type="button"
          onClick={resetAllData}
          className="flex w-full items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-3 text-left"
        >
          <span>
            <span className="block text-xs font-extrabold text-[#f43f5e]">
              🗑️ Tüm Verileri Sıfırla
            </span>

            <span className="mt-1 block text-[10px] text-[#94a3b8]">
              Uygulamayı başlangıç durumuna döndür
            </span>
          </span>

          <span className="text-sm text-[#f43f5e]">
            Sıfırla ›
          </span>
        </button>
      </div>

      <div className="mt-3 rounded-xl bg-black/20 px-3 py-2.5 text-[10px] leading-4 text-[#94a3b8]">
        📦 Mevcut içerik:{" "}
        <strong className="text-[#f8fafc]">
          {appData.sentences.length} cümle
        </strong>{" "}
        ve{" "}
        <strong className="text-[#f8fafc]">
          {appData.categories.length} kategori
        </strong>
      </div>
    </section>
  );
}