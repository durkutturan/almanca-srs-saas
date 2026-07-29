"use client";

import type { PageName } from "@/types/app";

type BottomNavigationProps = {
  activePage: PageName;
  dueCount: number;
  onChange: (page: PageName) => void;
};

const navigationItems: Array<{
  id: PageName;
  icon: string;
  label: string;
}> = [
  {
    id: "cumle",
    icon: "💬",
    label: "Ekle",
  },
  {
    id: "kart",
    icon: "🗣️",
    label: "Kart",
  },
  {
    id: "study",
    icon: "🎯",
    label: "Çalış",
  },
  {
    id: "stat",
    icon: "📊",
    label: "İstatistik",
  },
  {
    id: "liste",
    icon: "📚",
    label: "Liste",
  },
];

function getActiveClass(page: PageName): string {
  if (page === "study") {
    return "-translate-y-1 bg-[#a855f7] text-white shadow-[0_4px_12px_rgba(168,85,247,0.3)]";
  }

  if (page === "stat") {
    return "-translate-y-1 bg-[#f97316] text-white shadow-[0_4px_12px_rgba(249,115,22,0.3)]";
  }

  return "-translate-y-1 bg-[#10b981] text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)]";
}

export default function BottomNavigation({
  activePage,
  dueCount,
  onChange,
}: BottomNavigationProps) {
  return (
    <div className="fixed bottom-0 left-1/2 z-50 w-full max-w-[600px] -translate-x-1/2">
      <nav className="flex justify-around rounded-t-[24px] border-t border-white/10 bg-[rgba(30,41,59,0.95)] px-1 py-2.5 pb-[calc(10px+env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.3)] backdrop-blur-xl">
        {navigationItems.map((item) => {
          const isActive = activePage === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={[
                "relative mx-0.5 flex flex-1 flex-col items-center gap-1 rounded-[14px] px-0.5 py-2 text-[9px] font-extrabold transition duration-200",
                isActive
                  ? getActiveClass(item.id)
                  : "text-[#94a3b8]",
              ].join(" ")}
            >
              <span className="text-[19px]">
                {item.icon}
              </span>

              <span>{item.label}</span>

              {item.id === "study" && dueCount > 0 && (
                <span className="absolute right-2.5 top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[#f43f5e] px-1 text-[9px] font-extrabold text-white">
                  {dueCount > 99 ? "99+" : dueCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}