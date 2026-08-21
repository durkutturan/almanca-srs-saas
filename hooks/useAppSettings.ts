"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  DEFAULT_APP_SETTINGS,
  normalizeAppSettings,
  type AppSettings,
} from "@/lib/appSettings";

type SettingsResponse = {
  settings?: Partial<AppSettings>;
};

export function useAppSettings() {
  const [settings, setSettings] =
    useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [isSettingsLoading, setIsSettingsLoading] =
    useState(true);

  const reloadSettings = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/app-settings",
        { cache: "no-store" },
      );

      if (!response.ok) {
        return;
      }

      const payload =
        (await response.json()) as SettingsResponse;

      setSettings(
        normalizeAppSettings(payload.settings),
      );
    } catch (error) {
      console.error(
        "Uygulama ayarları alınamadı:",
        error,
      );
    } finally {
      setIsSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadSettings();
  }, [reloadSettings]);

  return {
    settings,
    isSettingsLoading,
    reloadSettings,
  };
}
