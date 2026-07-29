export default function DailyReviewCard() {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <p className="text-sm text-slate-400">Bugünkü tekrarlar</p>
  
        <p className="mt-2 text-3xl font-bold">0</p>
  
        <button
          type="button"
          className="mt-5 w-full rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400"
        >
          Çalışmaya Başla
        </button>
      </div>
    );
  }