"use client";

import type { User } from "firebase/auth";

type AuthPanelProps = {
  user: User | null;
  isLoading: boolean;
  error: string;
  onLogin: () => void;
  onLogout: () => void;
};

export default function AuthPanel({
  user,
  isLoading,
  error,
  onLogin,
  onLogout,
}: AuthPanelProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#1e293b] px-3 py-2.5 text-xs text-[#94a3b8]">
        ⏳ Kullanıcı bilgisi yükleniyor...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#1e293b] p-4">
        <div className="text-sm font-extrabold">
          ☁️ Bulut hesabı
        </div>

        <div className="mt-1 text-[10px] leading-4 text-[#94a3b8]">
          Verilerini daha sonra telefon ve
          bilgisayar arasında eşitlemek için giriş yap.
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[10px] text-[#f43f5e]">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={onLogin}
          className="mt-3 w-full rounded-xl border border-sky-400/30 bg-sky-400/10 px-3 py-2.5 text-xs font-extrabold text-[#38bdf8]"
        >
          Google ile Giriş Yap
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-3">
      <div className="flex items-center gap-3">
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt=""
            className="h-10 w-10 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
            👤
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-extrabold">
            {user.displayName || "Kullanıcı"}
          </div>

          <div className="truncate text-[10px] text-[#94a3b8]">
            {user.email}
          </div>

          <div className="mt-1 text-[9px] font-bold text-[#10b981]">
            ● Google hesabı bağlı
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-2.5 py-1.5 text-[10px] font-extrabold text-[#f43f5e]"
        >
          Çıkış
        </button>
      </div>

      {error && (
        <div className="mt-2 text-[10px] text-[#f43f5e]">
          {error}
        </div>
      )}
    </div>
  );
}