import type { User } from "firebase/auth";
import {
  Timestamp,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppData } from "@/types/app";

export type UserPlan = "free" | "pro";

export type AccountStatus =
  | "trial"
  | "active"
  | "expired"
  | "canceled";

export type PlanSource =
  | "free"
  | "trial"
  | "subscription"
  | "manual"
  | null;

export type UserAccount = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  plan: UserPlan;
  status: AccountStatus;
  planSource: PlanSource;
  manualProEndsAt: number | null;
  trialStartedAt: number | null;
  trialEndsAt: number | null;
  createdAt: number | null;
  updatedAt: number | null;
};

export type UserAccess = {
  level: UserPlan;
  reason:
    | "free"
    | "trial"
    | "subscription"
    | "manual";
  trialActive: boolean;
  trialDaysLeft: number;
  manualDaysLeft: number;
};

type CloudDocument = {
  appData?: AppData;
  updatedAt?: Timestamp;
};

type AccountDocument = {
  uid?: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  plan?: UserPlan;
  status?: AccountStatus;
  planSource?: PlanSource;
  manualProEndsAt?: Timestamp | null;
  trialStartedAt?: Timestamp | null;
  trialEndsAt?: Timestamp | null;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
};

type EnsureAccountResponse = {
  account?: UserAccount;
  error?: string;
};

function getAppDocument(userId: string) {
  return doc(
    db,
    "users",
    userId,
    "app",
    "main",
  );
}

function getAccountDocument(userId: string) {
  return doc(
    db,
    "users",
    userId,
    "account",
    "profile",
  );
}

function timestampToMillis(
  value: Timestamp | number | null | undefined,
): number | null {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }

  return typeof value === "number"
    ? value
    : null;
}

function normalizePlan(
  value: unknown,
): UserPlan {
  return value === "pro" ? "pro" : "free";
}

function normalizeStatus(
  value: unknown,
): AccountStatus {
  if (
    value === "trial" ||
    value === "active" ||
    value === "expired" ||
    value === "canceled"
  ) {
    return value;
  }

  return "trial";
}

function normalizePlanSource(
  value: unknown,
): PlanSource {
  if (
    value === "free" ||
    value === "trial" ||
    value === "subscription" ||
    value === "manual"
  ) {
    return value;
  }

  return null;
}

function mapAccountDocument(
  userId: string,
  data: AccountDocument,
): UserAccount {
  return {
    uid: data.uid || userId,
    email: data.email ?? null,
    displayName: data.displayName ?? null,
    photoURL: data.photoURL ?? null,
    plan: normalizePlan(data.plan),
    status: normalizeStatus(data.status),
    planSource: normalizePlanSource(
      data.planSource,
    ),
    manualProEndsAt: timestampToMillis(
      data.manualProEndsAt,
    ),
    trialStartedAt: timestampToMillis(
      data.trialStartedAt,
    ),
    trialEndsAt: timestampToMillis(
      data.trialEndsAt,
    ),
    createdAt: timestampToMillis(
      data.createdAt,
    ),
    updatedAt: timestampToMillis(
      data.updatedAt,
    ),
  };
}

function isNullableString(
  value: unknown,
): value is string | null {
  return (
    typeof value === "string" ||
    value === null
  );
}

function isNullableNumber(
  value: unknown,
): value is number | null {
  return (
    typeof value === "number" ||
    value === null
  );
}

function isUserAccount(
  value: unknown,
): value is UserAccount {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const account =
    value as Record<string, unknown>;

  return (
    typeof account.uid === "string" &&
    isNullableString(account.email) &&
    isNullableString(account.displayName) &&
    isNullableString(account.photoURL) &&
    (
      account.plan === "free" ||
      account.plan === "pro"
    ) &&
    (
      account.status === "trial" ||
      account.status === "active" ||
      account.status === "expired" ||
      account.status === "canceled"
    ) &&
    (
      account.planSource === "free" ||
      account.planSource === "trial" ||
      account.planSource === "subscription" ||
      account.planSource === "manual" ||
      account.planSource === null
    ) &&
    isNullableNumber(
      account.manualProEndsAt,
    ) &&
    isNullableNumber(account.trialStartedAt) &&
    isNullableNumber(account.trialEndsAt) &&
    isNullableNumber(account.createdAt) &&
    isNullableNumber(account.updatedAt)
  );
}

export function getUserAccess(
  account: UserAccount,
  now = Date.now(),
): UserAccess {
  const manualActive =
    account.planSource === "manual" &&
    account.manualProEndsAt !== null &&
    account.manualProEndsAt > now;

  const manualDaysLeft = manualActive
    ? Math.max(
        1,
        Math.ceil(
          (account.manualProEndsAt! - now) /
            (24 * 60 * 60 * 1000),
        ),
      )
    : 0;

  if (manualActive) {
    return {
      level: "pro",
      reason: "manual",
      trialActive: false,
      trialDaysLeft: 0,
      manualDaysLeft,
    };
  }

  const subscriptionActive =
    account.plan === "pro" &&
    account.status === "active" &&
    account.planSource !== "manual";

  if (subscriptionActive) {
    return {
      level: "pro",
      reason: "subscription",
      trialActive: false,
      trialDaysLeft: 0,
      manualDaysLeft: 0,
    };
  }

  const trialEndsAt = account.trialEndsAt;
  const trialActive =
    trialEndsAt !== null &&
    trialEndsAt > now;

  const trialDaysLeft = trialActive
    ? Math.max(
        1,
        Math.ceil(
          (trialEndsAt - now) /
            (24 * 60 * 60 * 1000),
        ),
      )
    : 0;

  if (trialActive) {
    return {
      level: "pro",
      reason: "trial",
      trialActive: true,
      trialDaysLeft,
      manualDaysLeft: 0,
    };
  }

  return {
    level: "free",
    reason: "free",
    trialActive: false,
    trialDaysLeft: 0,
    manualDaysLeft: 0,
  };
}

export async function ensureUserAccount(
  user: User,
): Promise<UserAccount> {
  const idToken = await user.getIdToken();

  const response = await fetch(
    "/api/account/ensure",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      }),
    },
  );

  let payload: EnsureAccountResponse = {};

  try {
    payload =
      (await response.json()) as EnsureAccountResponse;
  } catch {
    // Genel hata mesajı aşağıda kullanılır.
  }

  if (!response.ok) {
    throw new Error(
      payload.error ||
        `Hesap servisi hata verdi (${response.status}).`,
    );
  }

  if (!isUserAccount(payload.account)) {
    throw new Error(
      "Sunucudan geçersiz kullanıcı hesap bilgisi döndü.",
    );
  }

  return payload.account;
}

export async function loadUserAccount(
  userId: string,
): Promise<UserAccount | null> {
  const snapshot = await getDoc(
    getAccountDocument(userId),
  );

  if (!snapshot.exists()) {
    return null;
  }

  return mapAccountDocument(
    userId,
    snapshot.data() as AccountDocument,
  );
}

export async function loadCloudData(
  userId: string,
): Promise<AppData | null> {
  const snapshot = await getDoc(
    getAppDocument(userId),
  );

  if (!snapshot.exists()) {
    return null;
  }

  const cloudDocument =
    snapshot.data() as CloudDocument;

  return cloudDocument.appData ?? null;
}

export async function saveCloudData(
  userId: string,
  appData: AppData,
): Promise<void> {
  await setDoc(
    getAppDocument(userId),
    {
      appData,
      updatedAt: serverTimestamp(),
    },
    {
      merge: true,
    },
  );
}
