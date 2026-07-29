"use client";

import { useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import BottomNavigation from "@/components/BottomNavigation";
import SentenceCards from "@/components/SentenceCards";
import SentenceForm from "@/components/SentenceForm";
import { useAppData } from "@/hooks/useAppData";
import {
  getSrsStatus,
  hasCloze,
  plainText,
} from "@/lib/srs";
import type { PageName } from "@/types/app";

const PAGE_TITLES: Record<PageName, string> = {
  cumle: "💬 Cümle Ekle",
  kart: "🗣️ Kart",
  study: "🎯 Çalış",
  stat: "📊 İstatistik",
  liste: "📚 Liste",
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
    text: "✓",
    className: "bg-emerald-500/20 text-[#10b981]",
  };
}

export default function Home() {
  const [activePage, setActivePage] =
    useState<PageName>("cumle");

  const {
    appData,
    isLoaded,
    addSentence,
    deleteSentence,
    totalDue,
  } = useAppData();

  const totalLearned = useMemo(
    () =>
      appData.sentences.filter(
        (sentence) =>
          sentence.srs.reps >= 3 &&
          sentence.srs.due > Date.now(),
      ).length,
    [appData.sentences],
  );

  return (
    <main className="app-shell">
      <AppHeader
        title={PAGE_TITLES[activePage]}
        dueCount={totalDue}
      />

      <section className="app-content">
        {!isLoaded && (
          <div className="empty-msg">
            <div className="big-emoji">⏳</div>
            Veriler yükleniyor...
          </div>
        )}

        {isLoaded && activePage === "cumle" && (
          <SentenceForm
            categories={appData.categories}
            onSave={addSentence}
          />
        )}

        {isLoaded && activePage === "kart" && (
          <SentenceCards
            categories={appData.categories}
            sentences={appData.sentences}
          />
        )}

        {isLoaded && activePage === "study" && (
          <div className="empty-msg">
            <div className="big-emoji">🎯</div>

            {totalDue > 0
              ? `Bugün ${totalDue} cümle tekrar bekliyor.`
              : "Bugün tekrar bekleyen cümle yok."}
          </div>
        )}

        {isLoaded && activePage === "stat" && (
          <>
            <div className="stat-grid">
              <div className="stat-box">
                <div className="stat-num text-[#eab308]">
                  {appData.sentences.length}
                </div>

                <div className="stat-lbl">
                  📦 TOPLAM CÜMLE
                </div>
              </div>

              <div className="stat-box">
                <div className="stat-num text-[#a855f7]">
                  {totalLearned}
                </div>

                <div className="stat-lbl">
                  🏅 ÖĞRENİLEN
                </div>
              </div>
            </div>

            <div className="empty-msg">
              Ayrıntılı istatistik sistemi sonraki aşamada
              taşınacak.
            </div>
          </>
        )}

        {isLoaded && activePage === "liste" && (
          <>
            {appData.sentences.length === 0 ? (
              <div className="empty-msg">
                <div className="big-emoji">📭</div>
                Henüz cümle yok.
              </div>
            ) : (
              <div className="space-y-2">
                {appData.sentences
                  .slice()
                  .reverse()
                  .map((sentence) => {
                    const status = getStatusLabel(
                      getSrsStatus(sentence.srs),
                    );

                    return (
                      <div
                        key={sentence.id}
                        className="flex items-center gap-2.5 rounded-xl border border-white/10 border-l-4 border-l-[#a855f7] bg-[#0f172a] px-3 py-2.5"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-base">
                          {sentence.icon || "💬"}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-bold">
                            {hasCloze(sentence.de)
                              ? "🧩 "
                              : ""}

                            {plainText(sentence.de)}
                          </div>

                          <div className="truncate text-[11px] text-[#94a3b8]">
                            {sentence.tr}
                          </div>

                          <div className="mt-1 truncate text-[10px] text-[#64748b]">
                            {sentence.cat}
                            {sentence.subcat
                              ? ` • ${sentence.subcat}`
                              : " • Genel"}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <span
                            className={[
                              "rounded-lg px-1.5 py-0.5 text-[9px] font-extrabold",
                              status.className,
                            ].join(" ")}
                          >
                            {status.text}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              deleteSentence(sentence.id)
                            }
                            className="rounded-lg bg-rose-500/10 px-2 py-1 text-[10px] font-bold text-[#f43f5e]"
                          >
                            Sil
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </>
        )}
      </section>

      <BottomNavigation
        activePage={activePage}
        dueCount={totalDue}
        onChange={setActivePage}
      />
    </main>
  );
}