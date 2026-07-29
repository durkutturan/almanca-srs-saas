export default function BottomNavigation() {
    return (
      <nav className="sticky bottom-0 grid grid-cols-5 border-t border-slate-800 bg-slate-950 px-2 py-3">
        <button type="button" className="text-center text-xs text-emerald-400">
          <span className="mb-1 block text-xl">✍️</span>
          Ekle
        </button>
  
        <button type="button" className="text-center text-xs text-slate-400">
          <span className="mb-1 block text-xl">🗂️</span>
          Kartlar
        </button>
  
        <button type="button" className="text-center text-xs text-slate-400">
          <span className="mb-1 block text-xl">🧠</span>
          Çalış
        </button>
  
        <button type="button" className="text-center text-xs text-slate-400">
          <span className="mb-1 block text-xl">📊</span>
          İstatistik
        </button>
  
        <button type="button" className="text-center text-xs text-slate-400">
          <span className="mb-1 block text-xl">⚙️</span>
          Ayarlar
        </button>
      </nav>
    );
  }