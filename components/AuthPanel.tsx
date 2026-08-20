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
      <div className="rounded-xl border border-violet-100 bg-white px-3 py-2.5 text-xs font-semibold text-[#7c7190] shadow-sm">
        ⏳ Kullanıcı bilgisi yükleniyor...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
        <div className="text-sm font-black text-[#34294a]">
          ☁️ Bulut hesabı
        </div>

        <div className="mt-1 text-[10px] leading-4 text-[#7c7190]">
          Verilerini daha sonra telefon ve
          bilgisayar arasında eşitlemek için giriş yap.
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-semibold text-rose-600">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={onLogin}
          className="mt-3 w-full rounded-xl border border-violet-200 bg-gradient-to-r from-violet-600 to-fuchsia-500 px-3 py-3 text-xs font-black text-white shadow-[0_10px_24px_rgba(124,58,237,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(124,58,237,0.28)]"
        >
          Google ile Giriş Yap
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-3">
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt=""
            className="h-10 w-10 rounded-full border border-violet-100 object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-[#5b21b6]">
            👤
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-black text-[#34294a]">
            {user.displayName || "Kullanıcı"}
          </div>

          <div className="truncate text-[10px] text-[#7c7190]">
            {user.email}
          </div>

          <div className="mt-1 text-[9px] font-bold text-emerald-600">
            ● Google hesabı bağlı
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[10px] font-black text-rose-600 transition hover:bg-rose-100"
        >
          Çıkış
        </button>
      </div>

      {error && (
        <div className="mt-2 text-[10px] font-semibold text-rose-600">
          {error}
        </div>
      )}
    </div>
  );
}