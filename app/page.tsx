import AppHeader from "@/components/AppHeader";
import BottomNavigation from "@/components/BottomNavigation";
import DailyReviewCard from "@/components/DailyReviewCard";
import StatsCards from "@/components/StatsCards";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
        <AppHeader />

        <section className="flex-1 space-y-4 px-5 py-6">
          <DailyReviewCard />
          <StatsCards />
        </section>

        <BottomNavigation />
      </div>
    </main>
  );
}