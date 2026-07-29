type AppHeaderProps = {
  title: string;
  dueCount?: number;
};

export default function AppHeader({
  title,
  dueCount = 0,
}: AppHeaderProps) {
  const showDueBadge =
    title.includes("Çalış") && dueCount > 0;

  return (
    <header className="flex min-h-[49px] shrink-0 items-center justify-center gap-2 border-b border-white/10 bg-[#1e293b] px-4 py-3 text-center text-lg font-extrabold">
      <span>{title}</span>

      {showDueBadge && (
        <span className="rounded-full bg-[#f43f5e] px-2 py-0.5 text-[11px] font-extrabold text-white">
          {dueCount} tekrar!
        </span>
      )}
    </header>
  );
}