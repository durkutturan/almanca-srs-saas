import type { User } from "firebase/auth";
import {
  Timestamp,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppData } from "@/types/app";

const TRIAL_DAYS = 14;

export type UserPlan = "free" | "pro";

export type AccountStatus =
  | "trial"
  | "active"
  | "expired"
  | "canceled";

export type UserAccount = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  plan: UserPlan;
  status: AccountStatus;
  trialStartedAt: number | null;
  trialEndsAt: number | null;
  createdAt: number | null;
  updatedAt: number | null;
};

export type UserAccess = {
  level: UserPlan;
  reason: "free" | "trial" | "subscription";
  trialActive: boolean;
  trialDaysLeft: number;
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
  trialStartedAt?: Timestamp | null;
  trialEndsAt?: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
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
  value: Timestamp | null | undefined,
): number | null {
  return value instanceof Timestamp
    ? value.toMillis()
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

export function getUserAccess(
  account: UserAccount,
  now = Date.now(),
): UserAccess {
  const trialActive =
    account.trialEndsAt !== null &&
    account.trialEndsAt > now;

  const trialDaysLeft = trialActive
    ? Math.max(
        1,
        Math.ceil(
          (account.trialEndsAt! - now) /
            (24 * 60 * 60 * 1000),
        ),
      )
    : 0;

  if (
    account.plan === "pro" &&
    account.status === "active"
  ) {
    return {
      level: "pro",
      reason: "subscription",
      trialActive: false,
      trialDaysLeft: 0,
    };
  }

  if (trialActive) {
    return {
      level: "pro",
      reason: "trial",
      trialActive: true,
      trialDaysLeft,
    };
  }

  return {
    level: "free",
    reason: "free",
    trialActive: false,
    trialDaysLeft: 0,
  };
}

export async function ensureUserAccount(
  user: Pick<
    User,
    "uid" | "email" | "displayName" | "photoURL"
  >,
): Promise<UserAccount> {
  const accountDocument =
    getAccountDocument(user.uid);

  let account: UserAccount | null = null;

  await runTransaction(
    db,
    async (transaction) => {
      const snapshot = await transaction.get(
        accountDocument,
      );

      if (snapshot.exists()) {
        const existingData =
          snapshot.data() as AccountDocument;

        transaction.set(
          accountDocument,
          {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            updatedAt: serverTimestamp(),
          },
          {
            merge: true,
          },
        );

        account = mapAccountDocument(
          user.uid,
          existingData,
        );

        return;
      }

      const trialStartedAt = Timestamp.now();

      const trialEndsAt = Timestamp.fromMillis(
        trialStartedAt.toMillis() +
          TRIAL_DAYS *
            24 *
            60 *
            60 *
            1000,
      );

      transaction.set(accountDocument, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        plan: "free",
        status: "trial",
        trialStartedAt,
        trialEndsAt,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      account = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        plan: "free",
        status: "trial",
        trialStartedAt:
          trialStartedAt.toMillis(),
        trialEndsAt: trialEndsAt.toMillis(),
        createdAt:
          trialStartedAt.toMillis(),
        updatedAt:
          trialStartedAt.toMillis(),
      };
    },
  );

  if (!account) {
    throw new Error(
      "Kullanıcı hesap bilgileri oluşturulamadı.",
    );
  }

  return account;
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
