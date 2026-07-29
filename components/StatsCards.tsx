export default function StatsCards() {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm text-slate-400">Toplam cümle</p>
          <p className="mt-2 text-2xl font-bold">0</p>
        </div>
  
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm text-slate-400">Öğrenilen</p>
          <p className="mt-2 text-2xl font-bold">0</p>
        </div>
      </div>
    );
  }