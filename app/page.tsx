"use client";

import { useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import BottomNavigation from "@/components/BottomNavigation";
import CategoryManager from "@/components/CategoryManager";
import SentenceCards from "@/components/SentenceCards";
import SentenceForm from "@/components/SentenceForm";
import SentenceList from "@/components/SentenceList";
import StudyPanel from "@/components/StudyPanel";
import { useAppData } from "@/hooks/useAppData";
import type { PageName } from "@/types/app";

const PAGE_TITLES: Record<PageName, string> = {
  cumle: "💬 Cümle Ekle",
  kart: "🗣️ Kart",
  study: "🎯 Çalış",
  stat: "📊 İstatistik",
  liste: "📚 Liste",
};

export default function Home() {
  const [activePage, setActivePage] =
    useState<PageName>("cumle");

  const [
    categoryManagerOpen,
    setCategoryManagerOpen,
  ] = useState(false);

  const {
    appData,
    isLoaded,
    addSentence,
    updateSentence,
    deleteSentence,
    rateSentence,
    addCategory,
    updateCategory,
    deleteCategory,
    addSubcategory,
    renameSubcategory,
    deleteSubcategory,
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
          <StudyPanel
            categories={appData.categories}
            sentences={appData.sentences}
            onRate={rateSentence}
          />
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
              Ayrıntılı istatistik sistemi sonraki
              aşamada taşınacak.
            </div>
          </>
        )}

        {isLoaded && activePage === "liste" && (
          <>
            <button
              type="button"
              onClick={() =>
                setCategoryManagerOpen(true)
              }
              className="mb-3 flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#1e293b] px-3 py-2.5 text-left"
            >
              <span className="text-xs font-extrabold">
                ⚙️ Kategori ve Alt Kategori Yönetimi
              </span>

              <span className="text-xs text-[#38bdf8]">
                Aç ›
              </span>
            </button>

            <SentenceList
              categories={appData.categories}
              sentences={appData.sentences}
              onDelete={deleteSentence}
              onUpdate={updateSentence}
            />
          </>
        )}
      </section>

      <BottomNavigation
        activePage={activePage}
        dueCount={totalDue}
        onChange={setActivePage}
      />

      <CategoryManager
        isOpen={categoryManagerOpen}
        categories={appData.categories}
        onClose={() =>
          setCategoryManagerOpen(false)
        }
        onAddCategory={addCategory}
        onUpdateCategory={updateCategory}
        onDeleteCategory={deleteCategory}
        onAddSubcategory={addSubcategory}
        onRenameSubcategory={
          renameSubcategory
        }
        onDeleteSubcategory={
          deleteSubcategory
        }
      />
    </main>
  );
}