type AppHeaderProps = {
  title: string;
  dueCount?: number;
  onAccountClick?: () => void;
  userPhotoUrl?: string | null;
  userName?: string | null;
  planLabel?: "FREE" | "PRO";
};

function getInitials(
  userName?: string | null,
) {
  if (!userName?.trim()) {
    return "👤";
  }

  const words = userName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 1) {
    return words[0]
      .slice(0, 1)
      .toLocaleUpperCase("tr-TR");
  }

  return `${words[0][0]}${
    words[words.length - 1][0]
  }`.toLocaleUpperCase("tr-TR");
}

export default function AppHeader({
  title,
  dueCount = 0,
  onAccountClick,
  userPhotoUrl,
  userName,
  planLabel = "FREE",
}: AppHeaderProps) {
  const showDueBadge =
    title.includes("Çalış") &&
    dueCount > 0;

  return (
    <header className="relative flex min-h-[56px] shrink-0 items-center justify-center border-b border-white/10 bg-[#1e293b] px-16 py-3 text-center">
      <div className="flex min-w-0 items-center justify-center gap-2">
        <span className="truncate text-lg font-extrabold">
          {title}
        </span>

        {showDueBadge && (
          <span className="shrink-0 rounded-full bg-[#f43f5e] px-2 py-0.5 text-[10px] font-extrabold text-white">
            {dueCount} tekrar!
          </span>
        )}
      </div>

      {onAccountClick && (
        <button
          type="button"
          onClick={onAccountClick}
          className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-full border border-white/10 bg-[#0f172a] p-1 pr-2 shadow-lg transition hover:border-sky-400/30 hover:bg-[#172033] active:scale-95"
          aria-label="Hesap ve Ayarlar"
          title="Hesap ve Ayarlar"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5 text-[11px] font-black text-white">
            {userPhotoUrl ? (
              <img
                src={userPhotoUrl}
                alt={userName || "Kullanıcı"}
                className="h-full w-full object-cover"
              />
            ) : (
              getInitials(userName)
            )}
          </span>

          <span
            className={[
              "rounded-md border px-1.5 py-0.5 text-[8px] font-black",
              planLabel === "PRO"
                ? "border-amber-400/25 bg-amber-400/10 text-amber-300"
                : "border-white/10 bg-white/5 text-[#94a3b8]",
            ].join(" ")}
          >
            {planLabel}
          </span>
        </button>
      )}
    </header>
  );
}
