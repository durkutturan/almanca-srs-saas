import AppHeader from "@/components/AppHeader";
import BottomNavigation from "@/components/BottomNavigation";
import SentenceForm from "@/components/SentenceForm";

export default function Home() {
  return (
    <main className="app-shell">
      <AppHeader />

      <section className="app-content">
        <SentenceForm />
      </section>

      <BottomNavigation />
    </main>
  );
}