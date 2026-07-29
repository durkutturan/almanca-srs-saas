export default function BottomNavigation() {
  return (
    <div className="fixed bottom-0 left-1/2 z-50 w-full max-w-[600px] -translate-x-1/2">
      <nav className="flex justify-around rounded-t-[24px] border-t border-white/10 bg-[rgba(30,41,59,0.95)] px-1 py-2.5 pb-[calc(10px+env(safe-area-inset-bottom))] backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        <button
          type="button"
          className="mx-0.5 flex flex-1 -translate-y-1 flex-col items-center gap-1 rounded-[14px] bg-[#10b981] px-0.5 py-2 text-[9px] font-extrabold text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)]"
        >
          <span className="text-[19px]">💬</span>
          <span>Ekle</span>
        </button>

        <button
          type="button"
          className="mx-0.5 flex flex-1 flex-col items-center gap-1 rounded-[14px] px-0.5 py-2 text-[9px] font-extrabold text-[#94a3b8]"
        >
          <span className="text-[19px]">🗣️</span>
          <span>Kart</span>
        </button>

        <button
          type="button"
          className="relative mx-0.5 flex flex-1 flex-col items-center gap-1 rounded-[14px] px-0.5 py-2 text-[9px] font-extrabold text-[#94a3b8]"
        >
          <span className="text-[19px]">🎯</span>
          <span>Çalış</span>

          <span className="absolute right-2.5 top-0.5 hidden min-w-4 items-center justify-center rounded-full bg-[#f43f5e] px-1 text-[9px] font-extrabold text-white">
            0
          </span>
        </button>

        <button
          type="button"
          className="mx-0.5 flex flex-1 flex-col items-center gap-1 rounded-[14px] px-0.5 py-2 text-[9px] font-extrabold text-[#94a3b8]"
        >
          <span className="text-[19px]">📊</span>
          <span>İstatistik</span>
        </button>

        <button
          type="button"
          className="mx-0.5 flex flex-1 flex-col items-center gap-1 rounded-[14px] px-0.5 py-2 text-[9px] font-extrabold text-[#94a3b8]"
        >
          <span className="text-[19px]">📚</span>
          <span>Liste</span>
        </button>
      </nav>
    </div>
  );
}