"use client";

export type FreePlanLimits = {
  maxSentences: number;
  maxCategories: number;
  maxSubcategoriesPerCategory: number;
};

export type AppSettings = {
  priceLabel: string;
  checkoutUrl: string;
  billingPortalUrl: string;
  trialEnabled: boolean;
  trialDays: number;
  freeLimits: FreePlanLimits;
  proTitle: string;
  proDescription: string;
  purchaseButtonLabel: string;
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  priceLabel: "100 TL / ay",
  checkoutUrl: "",
  billingPortalUrl:
    "https://almanca-cumle-srs-pro.lemonsqueezy.com/billing",
  trialEnabled: true,
  trialDays: 14,
  freeLimits: {
    maxSentences: 100,
    maxCategories: 5,
    maxSubcategoriesPerCategory: 10,
  },
  proTitle: "Pro",
  proDescription: "Tüm özelliklerin kilidini aç",
  purchaseButtonLabel: "💳 Aylık Pro’ya Geç",
};

export function normalizeAppSettings(
  value: Partial<AppSettings> | null | undefined,
): AppSettings {
  const limits = value?.freeLimits;

  return {
    ...DEFAULT_APP_SETTINGS,
    ...value,
    priceLabel:
      value?.priceLabel?.trim() ||
      DEFAULT_APP_SETTINGS.priceLabel,
    checkoutUrl: value?.checkoutUrl?.trim() || "",
    billingPortalUrl:
      value?.billingPortalUrl?.trim() ||
      DEFAULT_APP_SETTINGS.billingPortalUrl,
    trialEnabled:
      typeof value?.trialEnabled === "boolean"
        ? value.trialEnabled
        : DEFAULT_APP_SETTINGS.trialEnabled,
    trialDays: Math.max(
      0,
      Math.min(
        365,
        Number.isFinite(value?.trialDays)
          ? Number(value?.trialDays)
          : DEFAULT_APP_SETTINGS.trialDays,
      ),
    ),
    freeLimits: {
      maxSentences: Math.max(
        1,
        Math.min(
          100000,
          Number.isFinite(limits?.maxSentences)
            ? Number(limits?.maxSentences)
            : DEFAULT_APP_SETTINGS.freeLimits.maxSentences,
        ),
      ),
      maxCategories: Math.max(
        1,
        Math.min(
          1000,
          Number.isFinite(limits?.maxCategories)
            ? Number(limits?.maxCategories)
            : DEFAULT_APP_SETTINGS.freeLimits.maxCategories,
        ),
      ),
      maxSubcategoriesPerCategory: Math.max(
        1,
        Math.min(
          1000,
          Number.isFinite(
            limits?.maxSubcategoriesPerCategory,
          )
            ? Number(limits?.maxSubcategoriesPerCategory)
            : DEFAULT_APP_SETTINGS.freeLimits
                .maxSubcategoriesPerCategory,
        ),
      ),
    },
    proTitle:
      value?.proTitle?.trim() ||
      DEFAULT_APP_SETTINGS.proTitle,
    proDescription:
      value?.proDescription?.trim() ||
      DEFAULT_APP_SETTINGS.proDescription,
    purchaseButtonLabel:
      value?.purchaseButtonLabel?.trim() ||
      DEFAULT_APP_SETTINGS.purchaseButtonLabel,
  };
}
