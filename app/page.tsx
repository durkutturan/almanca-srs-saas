import AppHeader from "@/components/AppHeader";
import BottomNavigation from "@/components/BottomNavigation";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
        <AppHeader />

        <section className="flex-1 space-y-4 px-5 py-6">
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
        </section>

        <BottomNavigation />
      </div>
    </main>
  );
}