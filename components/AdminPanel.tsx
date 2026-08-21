"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "firebase/auth";
import type { AppSettings } from "@/lib/appSettings";

type AdminUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  access:
    | "free"
    | "trial"
    | "manual"
    | "subscription";
  plan: string;
  status: string;
  trialEndsAt: number | null;
  manualProEndsAt: number | null;
  sentenceCount: number;
  categoryCount: number;
  lemonStatus: string | null;
  renewsAt: number | null;
};

type AdminPayload = {
  users: AdminUser[];
  settings: AppSettings;
  stats: {
    total: number;
    free: number;
    trial: number;
    manual: number;
    paid: number;
  };
};

type DiscountItem = {
  id: string;
  name: string;
  code: string;
  amount: number;
  amountType: "percent" | "fixed";
  duration:
    | "once"
    | "repeating"
    | "forever";
  durationInMonths: number;
  maxRedemptions: number | null;
  expiresAt: string | null;
  status: string;
  createdAt: string | null;
};

type DiscountsPayload = {
  discounts: DiscountItem[];
  storeName: string | null;
};

type Props = {
  isOpen: boolean;
  user: User;
  onClose: () => void;
  onSettingsChanged?: () => void;
};

function dateText(value: number | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      dateStyle: "medium",
    },
  ).format(new Date(value));
}

function accessLabel(
  access: AdminUser["access"],
) {
  switch (access) {
    case "subscription":
      return "💳 Ücretli Pro";
    case "manual":
      return "🎁 Manuel Pro";
    case "trial":
      return "✨ Deneme";
    default:
      return "🆓 Free";
  }
}

export default function AdminPanel({
  isOpen,
  user,
  onClose,
  onSettingsChanged,
}: Props) {
  const [payload, setPayload] =
    useState<AdminPayload | null>(
      null,
    );
  const [loading, setLoading] =
    useState(false);
  const [saving, setSaving] =
    useState(false);
  const [message, setMessage] =
    useState("");
  const [search, setSearch] =
    useState("");
  const [tab, setTab] = useState<
    "users" | "settings" | "discounts"
  >("users");

  const [discountsPayload, setDiscountsPayload] =
    useState<DiscountsPayload | null>(null);
  const [discountsLoading, setDiscountsLoading] =
    useState(false);

  async function adminFetch(
    url: string,
    init?: RequestInit,
  ) {
    const token =
      await user.getIdToken();

    return fetch(url, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${token}`,
        "Content-Type":
          "application/json",
      },
      cache: "no-store",
    });
  }

  async function load() {
    setLoading(true);
    setMessage("");

    try {
      const response =
        await adminFetch("/api/admin");

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Admin verileri alınamadı.",
        );
      }

      setPayload(
        data as AdminPayload,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Admin paneli açılamadı.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen) {
      void load();
    }
  }, [isOpen]);

  async function loadDiscounts() {
    setDiscountsLoading(true);
    setMessage("");

    try {
      const response =
        await adminFetch(
          "/api/admin/discounts",
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Kuponlar alınamadı.",
        );
      }

      setDiscountsPayload(
        data as DiscountsPayload,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Kuponlar alınamadı.",
      );
    } finally {
      setDiscountsLoading(false);
    }
  }

  useEffect(() => {
    if (
      isOpen &&
      tab === "discounts"
    ) {
      void loadDiscounts();
    }
  }, [isOpen, tab]);


  const filteredUsers = useMemo(
    () => {
      const q = search
        .trim()
        .toLocaleLowerCase("tr-TR");

      if (!q) {
        return payload?.users ?? [];
      }

      return (
        payload?.users.filter(
          (item) =>
            [
              item.displayName,
              item.email,
              item.uid,
              item.access,
            ]
              .filter(Boolean)
              .join(" ")
              .toLocaleLowerCase(
                "tr-TR",
              )
              .includes(q),
        ) ?? []
      );
    },
    [payload?.users, search],
  );

  async function userAction(
    uid: string,
    action: string,
    days?: number,
  ) {
    setSaving(true);
    setMessage("");

    try {
      const response =
        await adminFetch(
          "/api/admin",
          {
            method: "POST",
            body: JSON.stringify({
              action,
              uid,
              days,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "İşlem başarısız.",
        );
      }

      setMessage("İşlem tamamlandı. ✅");
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "İşlem başarısız.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveSettings(
    settings: AppSettings,
  ) {
    setSaving(true);
    setMessage("");

    try {
      const response =
        await adminFetch(
          "/api/admin",
          {
            method: "POST",
            body: JSON.stringify({
              action:
                "update_settings",
              settings,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Ayarlar kaydedilemedi.",
        );
      }

      setPayload((current) =>
        current
          ? {
              ...current,
              settings: {
                ...settings,
              },
            }
          : current,
      );

      setMessage(
        "Ayarlar kaydedildi. Deploy gerekmez. ✅",
      );

      onSettingsChanged?.();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Ayarlar kaydedilemedi.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  const stats = payload?.stats;
  const settings = payload?.settings;

  return (
    <div className="fixed inset-0 z-[300] flex justify-end bg-black/75 backdrop-blur-sm">
      <aside className="flex h-dvh w-full max-w-[760px] flex-col border-l border-white/10 bg-[#0f172a] shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/10 bg-[#1e293b] px-4 py-3">
          <div>
            <div className="text-base font-black">
              🛡️ Admin Paneli
            </div>
            <div className="mt-0.5 text-[10px] text-[#94a3b8]">
              Kullanıcı, üyelik, kupon ve uygulama ayarları
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5"
          >
            ✕
          </button>
        </header>

        <div className="flex gap-2 border-b border-white/10 p-3">
          <button
            type="button"
            onClick={() =>
              setTab("users")
            }
            className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-black ${
              tab === "users"
                ? "bg-sky-500 text-white"
                : "bg-white/5 text-[#cbd5e1]"
            }`}
          >
            👥 Kullanıcılar
          </button>

          <button
            type="button"
            onClick={() =>
              setTab("settings")
            }
            className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-black ${
              tab === "settings"
                ? "bg-violet-500 text-white"
                : "bg-white/5 text-[#cbd5e1]"
            }`}
          >
            ⚙️ Uygulama Ayarları
          </button>

          <button
            type="button"
            onClick={() =>
              setTab("discounts")
            }
            className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-black ${
              tab === "discounts"
                ? "bg-amber-500 text-white"
                : "bg-white/5 text-[#cbd5e1]"
            }`}
          >
            🎟️ Kuponlar
          </button>
        </div>

        {message && (
          <div className="mx-3 mt-3 rounded-xl border border-sky-400/20 bg-sky-400/10 px-3 py-2 text-[11px] text-sky-100">
            {message}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {loading && (
            <div className="py-12 text-center text-sm text-[#94a3b8]">
              Yükleniyor...
            </div>
          )}

          {!loading &&
            tab === "users" &&
            payload && (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {[
                    ["Toplam", stats?.total ?? 0],
                    ["Free", stats?.free ?? 0],
                    ["Deneme", stats?.trial ?? 0],
                    ["Manuel", stats?.manual ?? 0],
                    ["Ücretli", stats?.paid ?? 0],
                  ].map(
                    ([label, value]) => (
                      <div
                        key={String(label)}
                        className="rounded-xl border border-white/10 bg-[#1e293b] p-3 text-center"
                      >
                        <div className="text-lg font-black">
                          {value}
                        </div>
                        <div className="text-[9px] text-[#94a3b8]">
                          {label}
                        </div>
                      </div>
                    ),
                  )}
                </div>

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Ad, e-posta veya UID ara..."
                  className="mt-3 w-full rounded-xl border border-white/10 bg-[#1e293b] px-3 py-3 text-xs outline-none"
                />

                <div className="mt-3 space-y-2">
                  {filteredUsers.map(
                    (item) => (
                      <article
                        key={item.uid}
                        className="rounded-2xl border border-white/10 bg-[#1e293b] p-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/5 text-lg">
                            {item.photoURL ? (
                              <img
                                src={
                                  item.photoURL
                                }
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              "👤"
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-black">
                              {item.displayName ||
                                "İsimsiz kullanıcı"}
                            </div>
                            <div className="truncate text-[10px] text-[#94a3b8]">
                              {item.email ||
                                item.uid}
                            </div>

                            <div className="mt-2 flex flex-wrap gap-1.5 text-[9px]">
                              <span className="rounded-lg bg-white/5 px-2 py-1">
                                {accessLabel(
                                  item.access,
                                )}
                              </span>
                              <span className="rounded-lg bg-white/5 px-2 py-1">
                                💬{" "}
                                {
                                  item.sentenceCount
                                }
                              </span>
                              <span className="rounded-lg bg-white/5 px-2 py-1">
                                📁{" "}
                                {
                                  item.categoryCount
                                }
                              </span>
                              {item.lemonStatus && (
                                <span className="rounded-lg bg-amber-400/10 px-2 py-1 text-amber-200">
                                  Lemon:{" "}
                                  {
                                    item.lemonStatus
                                  }
                                </span>
                              )}
                            </div>

                            {(item.trialEndsAt ||
                              item.manualProEndsAt ||
                              item.renewsAt) && (
                              <div className="mt-2 text-[9px] leading-4 text-[#94a3b8]">
                                {item.access ===
                                  "trial" &&
                                  `Deneme bitiş: ${dateText(
                                    item.trialEndsAt,
                                  )}`}
                                {item.access ===
                                  "manual" &&
                                  `Manuel Pro bitiş: ${dateText(
                                    item.manualProEndsAt,
                                  )}`}
                                {item.access ===
                                  "subscription" &&
                                  item.renewsAt &&
                                  `Yenileme: ${dateText(
                                    item.renewsAt,
                                  )}`}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                              void userAction(
                                item.uid,
                                "set_manual_pro",
                                30,
                              )
                            }
                            className="rounded-xl bg-amber-500/15 px-2 py-2 text-[10px] font-black text-amber-200"
                          >
                            +30 Gün Pro
                          </button>

                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => {
                              const raw =
                                window.prompt(
                                  "Kaç gün Pro verilsin?",
                                  "90",
                                );

                              if (!raw) {
                                return;
                              }

                              void userAction(
                                item.uid,
                                "set_manual_pro",
                                Number(raw),
                              );
                            }}
                            className="rounded-xl bg-violet-500/15 px-2 py-2 text-[10px] font-black text-violet-200"
                          >
                            Özel Süre
                          </button>

                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => {
                              const raw =
                                window.prompt(
                                  "Deneme kaç gün olsun? 0 = bitir",
                                  "14",
                                );

                              if (raw === null) {
                                return;
                              }

                              void userAction(
                                item.uid,
                                "set_trial_days",
                                Number(raw),
                              );
                            }}
                            className="rounded-xl bg-sky-500/15 px-2 py-2 text-[10px] font-black text-sky-200"
                          >
                            Denemeyi Ayarla
                          </button>

                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Bu kullanıcı uygulamada Free yapılsın mı?\n\nNot: Lemon aboneliği varsa bu işlem Lemon tarafındaki tahsilatı iptal etmez.",
                                )
                              ) {
                                void userAction(
                                  item.uid,
                                  "set_free",
                                );
                              }
                            }}
                            className="rounded-xl bg-rose-500/15 px-2 py-2 text-[10px] font-black text-rose-200"
                          >
                            Free Yap
                          </button>
                        </div>
                      </article>
                    ),
                  )}
                </div>
              </>
            )}

          {!loading &&
            tab === "discounts" && (
              <DiscountsPanel
                payload={discountsPayload}
                loading={discountsLoading}
                saving={saving}
                adminFetch={adminFetch}
                onReload={loadDiscounts}
                onMessage={setMessage}
                onSaving={setSaving}
              />
            )}

          {!loading &&
            tab === "settings" &&
            settings && (
              <SettingsForm
                initial={settings}
                saving={saving}
                onSave={saveSettings}
              />
            )}
        </div>
      </aside>
    </div>
  );
}


function DiscountsPanel({
  payload,
  loading,
  saving,
  adminFetch,
  onReload,
  onMessage,
  onSaving,
}: {
  payload: DiscountsPayload | null;
  loading: boolean;
  saving: boolean;
  adminFetch: (
    url: string,
    init?: RequestInit,
  ) => Promise<Response>;
  onReload: () => Promise<void>;
  onMessage: (value: string) => void;
  onSaving: (value: boolean) => void;
}) {
  const [name, setName] =
    useState("Hoş Geldin İndirimi");
  const [code, setCode] =
    useState("HOSGELDIN20");
  const [amountType, setAmountType] =
    useState<"percent" | "fixed">(
      "percent",
    );
  const [amount, setAmount] =
    useState("20");
  const [duration, setDuration] =
    useState<
      "once" | "repeating" | "forever"
    >("once");
  const [durationInMonths, setDurationInMonths] =
    useState("3");
  const [limited, setLimited] =
    useState(false);
  const [maxRedemptions, setMaxRedemptions] =
    useState("100");
  const [expiresAt, setExpiresAt] =
    useState("");

  function normalizeCode(value: string) {
    return value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 256);
  }

  async function createDiscount() {
    const numericAmount =
      Number(amount);

    if (
      !name.trim() ||
      code.length < 3 ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      onMessage(
        "Kupon adı, en az 3 karakterli kod ve geçerli indirim miktarı gerekli.",
      );
      return;
    }

    if (
      amountType === "percent" &&
      numericAmount > 100
    ) {
      onMessage(
        "Yüzde indirim 100'den büyük olamaz.",
      );
      return;
    }

    if (
      limited &&
      (
        !Number.isFinite(
          Number(maxRedemptions),
        ) ||
        Number(maxRedemptions) < 1
      )
    ) {
      onMessage(
        "Kullanım limiti en az 1 olmalı.",
      );
      return;
    }

    onSaving(true);
    onMessage("");

    try {
      const response =
        await adminFetch(
          "/api/admin/discounts",
          {
            method: "POST",
            body: JSON.stringify({
              name: name.trim(),
              code,
              amount: numericAmount,
              amountType,
              duration,
              durationInMonths:
                duration === "repeating"
                  ? Number(
                      durationInMonths,
                    )
                  : 1,
              maxRedemptions:
                limited
                  ? Number(
                      maxRedemptions,
                    )
                  : null,
              expiresAt:
                expiresAt || null,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Kupon oluşturulamadı.",
        );
      }

      onMessage(
        `Kupon oluşturuldu: ${code} ✅`,
      );

      await onReload();
    } catch (error) {
      onMessage(
        error instanceof Error
          ? error.message
          : "Kupon oluşturulamadı.",
      );
    } finally {
      onSaving(false);
    }
  }

  async function deleteDiscount(
    item: DiscountItem,
  ) {
    if (
      !window.confirm(
        `${item.code} kuponu silinsin mi?`,
      )
    ) {
      return;
    }

    onSaving(true);
    onMessage("");

    try {
      const response =
        await adminFetch(
          `/api/admin/discounts?id=${encodeURIComponent(
            item.id,
          )}`,
          {
            method: "DELETE",
          },
        );

      const data =
        response.status === 204
          ? {}
          : await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Kupon silinemedi.",
        );
      }

      onMessage(
        `${item.code} kuponu silindi. ✅`,
      );

      await onReload();
    } catch (error) {
      onMessage(
        error instanceof Error
          ? error.message
          : "Kupon silinemedi.",
      );
    } finally {
      onSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <section className="rounded-2xl border border-amber-400/15 bg-[#1e293b] p-4">
        <div className="text-sm font-black">
          🎟️ Yeni İndirim Kuponu
        </div>

        <div className="mt-1 text-[10px] leading-4 text-[#94a3b8]">
          Kupon Lemon Squeezy'de gerçek olarak oluşturulur ve yalnızca Pro varyantına uygulanır.
        </div>

        {payload?.storeName && (
          <div className="mt-2 text-[9px] text-amber-200">
            Mağaza: {payload.storeName}
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-[10px] text-[#94a3b8]">
            Kupon adı
            <input
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              className="mt-1 w-full rounded-xl border border-white/10 bg-[#0f172a] px-3 py-3 text-xs text-white outline-none"
            />
          </label>

          <label className="text-[10px] text-[#94a3b8]">
            Kupon kodu
            <input
              value={code}
              onChange={(event) =>
                setCode(
                  normalizeCode(
                    event.target.value,
                  ),
                )
              }
              placeholder="HOSGELDIN20"
              className="mt-1 w-full rounded-xl border border-white/10 bg-[#0f172a] px-3 py-3 text-xs font-black uppercase text-white outline-none"
            />
          </label>

          <label className="text-[10px] text-[#94a3b8]">
            İndirim tipi
            <select
              value={amountType}
              onChange={(event) =>
                setAmountType(
                  event.target.value as
                    | "percent"
                    | "fixed",
                )
              }
              className="mt-1 w-full rounded-xl border border-white/10 bg-[#0f172a] px-3 py-3 text-xs text-white outline-none"
            >
              <option value="percent">
                Yüzde (%)
              </option>
              <option value="fixed">
                Sabit tutar (TL)
              </option>
            </select>
          </label>

          <label className="text-[10px] text-[#94a3b8]">
            {amountType === "percent"
              ? "İndirim yüzdesi"
              : "İndirim tutarı (TL)"}
            <input
              type="number"
              min="1"
              max={
                amountType === "percent"
                  ? "100"
                  : undefined
              }
              step={
                amountType === "fixed"
                  ? "0.01"
                  : "1"
              }
              value={amount}
              onChange={(event) =>
                setAmount(
                  event.target.value,
                )
              }
              className="mt-1 w-full rounded-xl border border-white/10 bg-[#0f172a] px-3 py-3 text-xs text-white outline-none"
            />
          </label>

          <label className="text-[10px] text-[#94a3b8]">
            Abonelikte uygulanma süresi
            <select
              value={duration}
              onChange={(event) =>
                setDuration(
                  event.target.value as
                    | "once"
                    | "repeating"
                    | "forever",
                )
              }
              className="mt-1 w-full rounded-xl border border-white/10 bg-[#0f172a] px-3 py-3 text-xs text-white outline-none"
            >
              <option value="once">
                Sadece ilk ödeme
              </option>
              <option value="repeating">
                Belirli ay sayısı
              </option>
              <option value="forever">
                Tüm yenilemeler
              </option>
            </select>
          </label>

          {duration ===
            "repeating" && (
            <label className="text-[10px] text-[#94a3b8]">
              Kaç ay?
              <input
                type="number"
                min="1"
                value={durationInMonths}
                onChange={(event) =>
                  setDurationInMonths(
                    event.target.value,
                  )
                }
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#0f172a] px-3 py-3 text-xs text-white outline-none"
              />
            </label>
          )}

          <label className="text-[10px] text-[#94a3b8]">
            Son kullanım tarihi
            <input
              type="date"
              value={expiresAt}
              onChange={(event) =>
                setExpiresAt(
                  event.target.value,
                )
              }
              className="mt-1 w-full rounded-xl border border-white/10 bg-[#0f172a] px-3 py-3 text-xs text-white outline-none"
            />
          </label>

          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0f172a] px-3 py-3 text-[10px] text-[#cbd5e1]">
            <input
              type="checkbox"
              checked={limited}
              onChange={(event) =>
                setLimited(
                  event.target.checked,
                )
              }
            />
            Kullanım adedi sınırla
          </label>

          {limited && (
            <label className="text-[10px] text-[#94a3b8]">
              En fazla kullanım
              <input
                type="number"
                min="1"
                value={maxRedemptions}
                onChange={(event) =>
                  setMaxRedemptions(
                    event.target.value,
                  )
                }
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#0f172a] px-3 py-3 text-xs text-white outline-none"
              />
            </label>
          )}
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={() =>
            void createDiscount()
          }
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-3 text-xs font-black text-white disabled:opacity-50"
        >
          {saving
            ? "İşleniyor..."
            : "🎟️ Kupon Oluştur"}
        </button>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#1e293b] p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-black">
            📋 Mevcut Kuponlar
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() =>
              void onReload()
            }
            className="rounded-lg bg-white/5 px-2 py-1.5 text-[9px] font-black text-[#cbd5e1]"
          >
            🔄 Yenile
          </button>
        </div>

        {loading && (
          <div className="py-8 text-center text-xs text-[#94a3b8]">
            Kuponlar yükleniyor...
          </div>
        )}

        {!loading &&
          (payload?.discounts.length ??
            0) === 0 && (
            <div className="py-8 text-center text-xs text-[#64748b]">
              Henüz kupon yok.
            </div>
          )}

        {!loading && (
          <div className="mt-3 space-y-2">
            {payload?.discounts.map(
              (item) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-white/10 bg-[#0f172a] p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-black text-white">
                        {item.code}
                      </div>
                      <div className="mt-0.5 truncate text-[9px] text-[#94a3b8]">
                        {item.name}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-black text-amber-300">
                        {item.amountType ===
                        "percent"
                          ? `%${item.amount}`
                          : `${(
                              item.amount /
                              100
                            ).toFixed(
                              2,
                            )} TL`}
                      </div>
                      <div className="text-[8px] text-[#64748b]">
                        {item.status}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5 text-[8px] text-[#94a3b8]">
                    <span className="rounded-md bg-white/5 px-2 py-1">
                      {item.duration ===
                      "once"
                        ? "İlk ödeme"
                        : item.duration ===
                            "forever"
                          ? "Sürekli"
                          : `${item.durationInMonths} ay`}
                    </span>

                    {item.maxRedemptions && (
                      <span className="rounded-md bg-white/5 px-2 py-1">
                        Max{" "}
                        {
                          item.maxRedemptions
                        } kullanım
                      </span>
                    )}

                    {item.expiresAt && (
                      <span className="rounded-md bg-white/5 px-2 py-1">
                        Bitiş{" "}
                        {new Intl.DateTimeFormat(
                          "tr-TR",
                        ).format(
                          new Date(
                            item.expiresAt,
                          ),
                        )}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      void deleteDiscount(
                        item,
                      )
                    }
                    className="mt-2 rounded-lg bg-rose-500/10 px-2 py-1.5 text-[9px] font-black text-rose-200"
                  >
                    🗑️ Kuponu Sil
                  </button>
                </article>
              ),
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function SettingsForm({
  initial,
  saving,
  onSave,
}: {
  initial: AppSettings;
  saving: boolean;
  onSave: (
    settings: AppSettings,
  ) => void;
}) {
  const [form, setForm] =
    useState<AppSettings>(initial);

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  return (
    <div className="space-y-3">
      <section className="rounded-2xl border border-white/10 bg-[#1e293b] p-4">
        <div className="mb-3 text-sm font-black">
          💰 Fiyat ve Ödeme
        </div>

        <label className="block text-[10px] text-[#94a3b8]">
          Uygulamada görünen fiyat
        </label>
        <input
          value={form.priceLabel}
          onChange={(e) =>
            setForm({
              ...form,
              priceLabel:
                e.target.value,
            })
          }
          className="mt-1 w-full rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5 text-xs"
        />

        <label className="mt-3 block text-[10px] text-[#94a3b8]">
          Lemon checkout bağlantısı
        </label>
        <input
          value={form.checkoutUrl}
          onChange={(e) =>
            setForm({
              ...form,
              checkoutUrl:
                e.target.value,
            })
          }
          className="mt-1 w-full rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5 text-xs"
        />

        <label className="mt-3 block text-[10px] text-[#94a3b8]">
          Abonelik yönetim bağlantısı
        </label>
        <input
          value={
            form.billingPortalUrl
          }
          onChange={(e) =>
            setForm({
              ...form,
              billingPortalUrl:
                e.target.value,
            })
          }
          className="mt-1 w-full rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5 text-xs"
        />
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#1e293b] p-4">
        <div className="mb-3 text-sm font-black">
          🎁 Deneme Süresi
        </div>

        <label className="flex items-center justify-between gap-3 rounded-xl bg-[#0f172a] p-3 text-xs">
          Yeni kullanıcıya otomatik deneme
          <input
            type="checkbox"
            checked={
              form.trialEnabled
            }
            onChange={(e) =>
              setForm({
                ...form,
                trialEnabled:
                  e.target.checked,
              })
            }
          />
        </label>

        <label className="mt-3 block text-[10px] text-[#94a3b8]">
          Yeni kullanıcı deneme günü
        </label>
        <input
          type="number"
          min={0}
          max={365}
          value={form.trialDays}
          onChange={(e) =>
            setForm({
              ...form,
              trialDays: Number(
                e.target.value,
              ),
            })
          }
          className="mt-1 w-full rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5 text-xs"
        />
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#1e293b] p-4">
        <div className="mb-3 text-sm font-black">
          🆓 Free Plan Limitleri
        </div>

        {[
          [
            "Cümle limiti",
            "maxSentences",
          ],
          [
            "Kategori limiti",
            "maxCategories",
          ],
          [
            "Kategori başına alt / alt-alt kategori",
            "maxSubcategoriesPerCategory",
          ],
        ].map(([label, key]) => (
          <label
            key={key}
            className="mt-3 block text-[10px] text-[#94a3b8]"
          >
            {label}
            <input
              type="number"
              min={1}
              value={
                form.freeLimits[
                  key as keyof typeof form.freeLimits
                ]
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  freeLimits: {
                    ...form.freeLimits,
                    [key]:
                      Number(
                        e.target
                          .value,
                      ),
                  },
                })
              }
              className="mt-1 w-full rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5 text-xs"
            />
          </label>
        ))}
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#1e293b] p-4">
        <div className="mb-3 text-sm font-black">
          ✍️ Plan Ekranı Yazıları
        </div>

        <input
          value={form.proTitle}
          onChange={(e) =>
            setForm({
              ...form,
              proTitle:
                e.target.value,
            })
          }
          placeholder="Pro başlığı"
          className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5 text-xs"
        />

        <input
          value={
            form.proDescription
          }
          onChange={(e) =>
            setForm({
              ...form,
              proDescription:
                e.target.value,
            })
          }
          placeholder="Pro açıklaması"
          className="mt-2 w-full rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5 text-xs"
        />

        <input
          value={
            form.purchaseButtonLabel
          }
          onChange={(e) =>
            setForm({
              ...form,
              purchaseButtonLabel:
                e.target.value,
            })
          }
          placeholder="Satın alma butonu"
          className="mt-2 w-full rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5 text-xs"
        />
      </section>

      <button
        type="button"
        disabled={saving}
        onClick={() =>
          onSave(form)
        }
        className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-xs font-black text-white disabled:opacity-50"
      >
        {saving
          ? "Kaydediliyor..."
          : "💾 Tüm Ayarları Kaydet"}
      </button>

      <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-2 text-[10px] leading-4 text-emerald-100/80">
        Buradaki fiyat, limit ve deneme ayarları
        kaydedildikten sonra deploy gerektirmez.
        Lemon’ın gerçek tahsilat fiyatı yine Lemon
        panelinden değiştirilir.
      </div>
    </div>
  );
}
