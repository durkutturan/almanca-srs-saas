import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import {
  getAdminAuth,
  getAdminDatabase,
} from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

function millis(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis?: unknown })
      .toMillis === "function"
  ) {
    return (
      value as { toMillis: () => number }
    ).toMillis();
  }

  return null;
}

async function getTrialSettings() {
  try {
    const snap =
      await getAdminDatabase()
        .doc("config/app")
        .get();

    const data = snap.exists
      ? snap.data()
      : null;

    return {
      enabled:
        data?.trialEnabled !== false,
      days: Math.max(
        0,
        Math.min(
          365,
          Number(data?.trialDays ?? 14) ||
            0,
        ),
      ),
    };
  } catch {
    return {
      enabled: true,
      days: 14,
    };
  }
}

function getBillingStatus(
  value: Record<string, unknown> | null,
): string {
  if (!value) {
    return "";
  }

  const direct =
    typeof value.status === "string"
      ? value.status
      : "";

  const attributes =
    value.attributes &&
    typeof value.attributes === "object"
      ? (value.attributes as Record<
          string,
          unknown
        >)
      : null;

  const nested =
    typeof attributes?.status === "string"
      ? attributes.status
      : "";

  return (direct || nested)
    .trim()
    .toLowerCase();
}

function billingHasPaidAccess(
  value: Record<string, unknown> | null,
): boolean {
  const status = getBillingStatus(value);

  /*
   * Lemon'da iptal edilmiş (cancelled/canceled) abonelik,
   * dönem sonuna kadar erişim hakkını koruyabilir.
   * Webhook akışımız da gerçek expiry gelene kadar Pro'yu korur.
   */
  return (
    status === "active" ||
    status === "cancelled" ||
    status === "canceled"
  );
}

function serializeAccount(
  uid: string,
  data: Record<string, unknown>,
) {
  return {
    uid,
    email:
      typeof data.email === "string"
        ? data.email
        : null,
    displayName:
      typeof data.displayName === "string"
        ? data.displayName
        : null,
    photoURL:
      typeof data.photoURL === "string"
        ? data.photoURL
        : null,
    plan:
      data.plan === "pro"
        ? "pro"
        : "free",
    status:
      data.status === "active" ||
      data.status === "expired" ||
      data.status === "canceled"
        ? data.status
        : "trial",
    planSource:
      typeof data.planSource === "string"
        ? data.planSource
        : null,
    manualProEndsAt:
      millis(data.manualProEndsAt),
    trialStartedAt:
      millis(data.trialStartedAt),
    trialEndsAt:
      millis(data.trialEndsAt),
    createdAt:
      millis(data.createdAt),
    updatedAt:
      millis(data.updatedAt),
  };
}

export async function POST(
  request: NextRequest,
) {
  try {
    const authorization =
      request.headers.get(
        "authorization",
      ) ?? "";

    const token =
      authorization.startsWith(
        "Bearer ",
      )
        ? authorization
            .slice(7)
            .trim()
        : "";

    if (!token) {
      return NextResponse.json(
        {
          error:
            "Oturum doğrulanamadı.",
        },
        { status: 401 },
      );
    }

    const decoded =
      await getAdminAuth().verifyIdToken(
        token,
      );

    const body =
      (await request.json().catch(
        () => ({}),
      )) as {
        email?: string | null;
        displayName?: string | null;
        photoURL?: string | null;
      };

    const db = getAdminDatabase();
    const ref = db.doc(
      `users/${decoded.uid}/account/profile`,
    );

    const existing =
      await ref.get();

    if (!existing.exists) {
      const trial =
        await getTrialSettings();

      const now = Date.now();

      await ref.set({
        uid: decoded.uid,
        email:
          body.email ??
          decoded.email ??
          null,
        displayName:
          body.displayName ?? null,
        photoURL:
          body.photoURL ?? null,
        plan: "free",
        status:
          trial.enabled &&
          trial.days > 0
            ? "trial"
            : "expired",
        planSource:
          trial.enabled &&
          trial.days > 0
            ? "trial"
            : "free",
        trialStartedAt:
          Timestamp.fromMillis(now),
        trialEndsAt:
          trial.enabled &&
          trial.days > 0
            ? Timestamp.fromMillis(
                now +
                  trial.days * DAY,
              )
            : Timestamp.fromMillis(
                now - 1000,
              ),
        manualProEndsAt: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    } else {
      const billingSnap = await db
        .doc(
          `users/${decoded.uid}/billing/subscription`,
        )
        .get();

      const billingData = billingSnap.exists
        ? ((billingSnap.data() ?? {}) as Record<
            string,
            unknown
          >)
        : null;

      const paidAccess =
        billingHasPaidAccess(billingData);

      await ref.set(
        {
          uid: decoded.uid,
          email:
            body.email ??
            decoded.email ??
            null,
          displayName:
            body.displayName ?? null,
          photoURL:
            body.photoURL ?? null,
          ...(paidAccess
            ? {
                plan: "pro",
                status: "active",
                planSource: "subscription",
                manualProEndsAt: null,
              }
            : {}),
          updatedAt: Timestamp.now(),
        },
        { merge: true },
      );
    }

    const finalSnap =
      await ref.get();

    return NextResponse.json({
      account: serializeAccount(
        decoded.uid,
        (finalSnap.data() ??
          {}) as Record<
          string,
          unknown
        >,
      ),
    });
  } catch (error) {
    console.error(
      "Account ensure error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Hesap bilgisi hazırlanamadı.",
      },
      { status: 500 },
    );
  }
}