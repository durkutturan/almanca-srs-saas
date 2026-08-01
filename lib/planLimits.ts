export type AccessLevel = "free" | "pro";

export type PlanFeature =
  | "cloudSync"
  | "basicStudy"
  | "basicStatistics"
  | "personalBackup"
  | "bulkAdd"
  | "sentencePackage"
  | "csvExport"
  | "pdfExport"
  | "advancedStatistics";

export type PlanLimits = {
  maxSentences: number | null;
  maxCategories: number | null;
  maxSubcategoriesPerCategory:
    number | null;
};

export const FREE_PLAN_LIMITS: PlanLimits = {
  maxSentences: 100,
  maxCategories: 5,
  maxSubcategoriesPerCategory: 10,
};

export const PRO_PLAN_LIMITS: PlanLimits = {
  maxSentences: null,
  maxCategories: null,
  maxSubcategoriesPerCategory: null,
};

const FREE_FEATURES: Record<
  PlanFeature,
  boolean
> = {
  cloudSync: true,
  basicStudy: true,
  basicStatistics: true,
  personalBackup: true,
  bulkAdd: false,
  sentencePackage: false,
  csvExport: false,
  pdfExport: false,
  advancedStatistics: false,
};

const PRO_FEATURES: Record<
  PlanFeature,
  boolean
> = {
  cloudSync: true,
  basicStudy: true,
  basicStatistics: true,
  personalBackup: true,
  bulkAdd: true,
  sentencePackage: true,
  csvExport: true,
  pdfExport: true,
  advancedStatistics: true,
};

export function getPlanLimits(
  level: AccessLevel,
): PlanLimits {
  return level === "pro"
    ? PRO_PLAN_LIMITS
    : FREE_PLAN_LIMITS;
}

export function canUseFeature(
  level: AccessLevel,
  feature: PlanFeature,
): boolean {
  return level === "pro"
    ? PRO_FEATURES[feature]
    : FREE_FEATURES[feature];
}

export function hasReachedLimit(
  currentCount: number,
  limit: number | null,
): boolean {
  return (
    limit !== null &&
    currentCount >= limit
  );
}

export function getRemainingLimit(
  currentCount: number,
  limit: number | null,
): number | null {
  if (limit === null) {
    return null;
  }

  return Math.max(
    0,
    limit - currentCount,
  );
}

export function getLimitLabel(
  currentCount: number,
  limit: number | null,
): string {
  if (limit === null) {
    return `${currentCount} / Sınırsız`;
  }

  return `${currentCount} / ${limit}`;
}

export function getFeatureLabel(
  feature: PlanFeature,
): string {
  const labels: Record<
    PlanFeature,
    string
  > = {
    cloudSync: "Bulut senkronizasyonu",
    basicStudy: "Temel çalışma modları",
    basicStatistics: "Temel istatistikler",
    personalBackup: "Kişisel JSON yedeği",
    bulkAdd: "Toplu cümle ekleme",
    sentencePackage:
      "Cümle paketi paylaşma",
    csvExport: "Excel / CSV dışa aktarma",
    pdfExport: "PDF raporu",
    advancedStatistics:
      "Gelişmiş istatistikler",
  };

  return labels[feature];
}
