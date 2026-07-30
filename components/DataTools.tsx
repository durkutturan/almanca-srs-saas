"use client";

import { useRef, useState } from "react";
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

function createFileName() {
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

  return `almanca-srs-yedek-${year}-${month}-${day}-${hour}-${minute}.json`;
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
    const blob = new Blob([json], {
      type: "application/json;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = createFileName();

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  async function importBackup(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const approved = window.confirm(
      "Yedek dosyası içe aktarıldığında mevcut verilerin üzerine yazılacak. Devam edilsin mi?",
    );

    if (!approved) {
      event.target.value = "";
      return;
    }

    setIsImporting(true);

    try {
      const content = await file.text();
      const parsedData: unknown = JSON.parse(content);

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
        "Yedek başarıyla içe aktarıldı. Uygulama yenilenecek.",
      );

      window.location.reload();
    } catch (error) {
      console.error(error);

      window.alert(
        "Dosya okunamadı. Geçerli bir JSON yedek dosyası seç.",
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
          💾 Yedekleme ve Veri Yönetimi
        </div>

        <div className="mt-1 text-[10px] leading-4 text-[#94a3b8]">
          Verilerini bilgisayarına indir, daha önceki
          yedeği yükle veya uygulamayı sıfırla.
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
              Tüm cümleler ve kategoriler
            </span>
          </span>

          <span className="text-sm text-[#10b981]">
            İndir ›
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
              Daha önce indirdiğin yedeği geri getir
            </span>
          </span>

          <span className="text-sm text-[#38bdf8]">
            {isImporting ? "Yükleniyor..." : "Seç ›"}
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
        📦 Mevcut yedek içeriği:{" "}
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