import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import {
  getAdminAuth,
  getAdminDatabase,
} from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

function adminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((item) =>
        item.trim().toLowerCase(),
      )
      .filter(Boolean),
  );
}

async function requireAdmin(
  request: NextRequest,
) {
  const authorization =
    request.headers.get("authorization") ?? "";

  const token = authorization.startsWith(
    "Bearer ",
  )
    ? authorization.slice(7).trim()
    : "";

  if (!token) {
    throw new Error("UNAUTHORIZED");
  }

  const decoded =
    await getAdminAuth().verifyIdToken(token);

  const email =
    decoded.email?.trim().toLowerCase() ?? "";

  if (!email || !adminEmails().has(email)) {
    throw new Error("FORBIDDEN");
  }

  return decoded;
}

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

async function readSettings() {
  const db = getAdminDatabase();
  const snap = await db
    .doc("config/app")
    .get();

  const defaults = {
    priceLabel:
      process.env.NEXT_PUBLIC_PRO_PRICE_LABEL?.trim() ||
      "100 TL / ay",
    checkoutUrl:
      process.env
        .NEXT_PUBLIC_LEMON_SQUEEZY_CHECKOUT_URL
        ?.trim() || "",
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
    purchaseButtonLabel:
      "💳 Aylık Pro’ya Geç",
  };

  const data = snap.exists
    ? snap.data()
    : {};

  return {
    ...defaults,
    ...data,
    freeLimits: {
      ...defaults.freeLimits,
      ...(data?.freeLimits ?? {}),
    },
  };
}

async function getUsers() {
  const auth = getAdminAuth();
  const db = getAdminDatabase();

  const authPage = await auth.listUsers(200);

  const users = await Promise.all(
    authPage.users.map(async (authUser) => {
      const [accountSnap, billingSnap, appSnap] =
        await Promise.all([
          db
            .doc(
              `users/${authUser.uid}/account/profile`,
            )
            .get(),
          db
            .doc(
              `users/${authUser.uid}/billing/subscription`,
            )
            .get(),
          db
            .doc(
              `users/${authUser.uid}/app/main`,
            )
            .get(),
        ]);

      const account =
        accountSnap.exists
          ? accountSnap.data() ?? {}
          : {};

      const billing =
        billingSnap.exists
          ? billingSnap.data() ?? {}
          : {};

      const app =
        appSnap.exists
          ? appSnap.data() ?? {}
          : {};

      const appData =
        app.appData &&
        typeof app.appData === "object"
          ? app.appData
          : null;

      const sentenceCount =
        Array.isArray(appData?.sentences)
          ? appData.sentences.length
          : 0;

      const categoryCount =
        Array.isArray(appData?.categories)
          ? appData.categories.length
          : 0;

      const manualProEndsAt =
        millis(account.manualProEndsAt);

      const trialEndsAt =
        millis(account.trialEndsAt);

      const now = Date.now();

      const manualActive =
        account.planSource === "manual" &&
        manualProEndsAt !== null &&
        manualProEndsAt > now;

      const subscriptionActive =
        account.plan === "pro" &&
        account.status === "active" &&
        account.planSource !== "manual";

      const trialActive =
        !subscriptionActive &&
        !manualActive &&
        trialEndsAt !== null &&
        trialEndsAt > now;

      const access = subscriptionActive
        ? "subscription"
        : manualActive
          ? "manual"
          : trialActive
            ? "trial"
            : "free";

      return {
        uid: authUser.uid,
        email:
          account.email ??
          authUser.email ??
          null,
        displayName:
          account.displayName ??
          authUser.displayName ??
          null,
        photoURL:
          account.photoURL ??
          authUser.photoURL ??
          null,
        disabled: authUser.disabled,
        access,
        plan:
          account.plan ?? "free",
        status:
          account.status ?? "trial",
        planSource:
          account.planSource ?? null,
        trialEndsAt,
        manualProEndsAt,
        createdAt:
          millis(account.createdAt) ??
          (authUser.metadata.creationTime
            ? Date.parse(
                authUser.metadata.creationTime,
              )
            : null),
        updatedAt:
          millis(account.updatedAt),
        sentenceCount,
        categoryCount,
        lemonStatus:
          billing.status ??
          billing.attributes?.status ??
          null,
        lemonSubscriptionId:
          billing.subscriptionId ??
          billing.id ??
          null,
        renewsAt:
          millis(billing.renewsAt) ??
          (billing.attributes?.renews_at
            ? Date.parse(
                billing.attributes.renews_at,
              )
            : null),
      };
    }),
  );

  users.sort(
    (a, b) =>
      (b.createdAt ?? 0) -
      (a.createdAt ?? 0),
  );

  return users;
}

export async function GET(
  request: NextRequest,
) {
  try {
    await requireAdmin(request);

    const mode =
      request.nextUrl.searchParams.get(
        "mode",
      );

    if (mode === "check") {
      return NextResponse.json({
        ok: true,
      });
    }

    const [users, settings] =
      await Promise.all([
        getUsers(),
        readSettings(),
      ]);

    const stats = {
      total: users.length,
      free: users.filter(
        (user) =>
          user.access === "free",
      ).length,
      trial: users.filter(
        (user) =>
          user.access === "trial",
      ).length,
      manual: users.filter(
        (user) =>
          user.access === "manual",
      ).length,
      paid: users.filter(
        (user) =>
          user.access ===
          "subscription",
      ).length,
    };

    return NextResponse.json({
      users,
      settings,
      stats,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "";

    return NextResponse.json(
      {
        error:
          message === "FORBIDDEN"
            ? "Bu hesap admin değil."
            : "Admin oturumu doğrulanamadı.",
      },
      {
        status:
          message === "FORBIDDEN"
            ? 403
            : 401,
      },
    );
  }
}

function getBillingStatusForAdmin(
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

async function hasActivePaidSubscription(
  uid: string,
): Promise<boolean> {
  const snap = await getAdminDatabase()
    .doc(
      `users/${uid}/billing/subscription`,
    )
    .get();

  if (!snap.exists) {
    return false;
  }

  const status = getBillingStatusForAdmin(
    (snap.data() ?? {}) as Record<
      string,
      unknown
    >,
  );

  return (
    status === "active" ||
    status === "cancelled" ||
    status === "canceled"
  );
}

export async function POST(
  request: NextRequest,
) {
  try {
    const admin =
      await requireAdmin(request);

    const body =
      (await request.json()) as {
        action?: string;
        uid?: string;
        days?: number;
        settings?: Record<
          string,
          unknown
        >;
      };

    const db = getAdminDatabase();

    if (
      body.action === "update_settings"
    ) {
      const input = body.settings ?? {};

      const next = {
        priceLabel:
          String(
            input.priceLabel ?? "",
          ).trim() || "100 TL / ay",
        checkoutUrl:
          String(
            input.checkoutUrl ?? "",
          ).trim(),
        billingPortalUrl:
          String(
            input.billingPortalUrl ?? "",
          ).trim() ||
          "https://almanca-cumle-srs-pro.lemonsqueezy.com/billing",
        trialEnabled:
          input.trialEnabled !== false,
        trialDays: Math.max(
          0,
          Math.min(
            365,
            Number(
              input.trialDays ?? 14,
            ) || 0,
          ),
        ),
        freeLimits: {
          maxSentences: Math.max(
            1,
            Number(
              (
                input.freeLimits as
                  | Record<string, unknown>
                  | undefined
              )?.maxSentences ?? 100,
            ) || 100,
          ),
          maxCategories: Math.max(
            1,
            Number(
              (
                input.freeLimits as
                  | Record<string, unknown>
                  | undefined
              )?.maxCategories ?? 5,
            ) || 5,
          ),
          maxSubcategoriesPerCategory:
            Math.max(
              1,
              Number(
                (
                  input.freeLimits as
                    | Record<
                        string,
                        unknown
                      >
                    | undefined
                )
                  ?.maxSubcategoriesPerCategory ??
                  10,
              ) || 10,
            ),
        },
        proTitle:
          String(
            input.proTitle ?? "Pro",
          ).trim() || "Pro",
        proDescription:
          String(
            input.proDescription ??
              "Tüm özelliklerin kilidini aç",
          ).trim(),
        purchaseButtonLabel:
          String(
            input.purchaseButtonLabel ??
              "💳 Aylık Pro’ya Geç",
          ).trim(),
        updatedAt:
          Timestamp.now(),
        updatedBy:
          admin.email ?? admin.uid,
      };

      await db
        .doc("config/app")
        .set(next, { merge: true });

      return NextResponse.json({
        ok: true,
        settings: next,
      });
    }

    const uid = body.uid?.trim();

    if (!uid) {
      return NextResponse.json(
        {
          error:
            "Kullanıcı seçilmedi.",
        },
        { status: 400 },
      );
    }

    const ref = db.doc(
      `users/${uid}/account/profile`,
    );

    const isPaidSubscriber =
      await hasActivePaidSubscription(uid);

    if (
      isPaidSubscriber &&
      (
        body.action === "set_free" ||
        body.action === "set_manual_pro" ||
        body.action === "set_trial_days"
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Bu kullanıcının gerçek Lemon Pro aboneliği aktif. Admin paneli ücretli aboneliğin üzerine Free/Manuel Pro/Deneme yazamaz. Abonelik işlemlerini Lemon üzerinden yönet.",
        },
        { status: 409 },
      );
    }

    if (body.action === "set_free") {
      await ref.set(
        {
          plan: "free",
          status: "canceled",
          planSource: "free",
          manualProEndsAt: null,
          updatedAt: Timestamp.now(),
          adminUpdatedBy:
            admin.email ?? admin.uid,
        },
        { merge: true },
      );

      return NextResponse.json({
        ok: true,
      });
    }

    if (
      body.action === "set_manual_pro"
    ) {
      const days = Math.max(
        1,
        Math.min(
          3650,
          Number(body.days ?? 30) || 30,
        ),
      );

      await ref.set(
        {
          plan: "pro",
          status: "active",
          planSource: "manual",
          manualProEndsAt:
            Timestamp.fromMillis(
              Date.now() +
                days * DAY,
            ),
          updatedAt: Timestamp.now(),
          adminUpdatedBy:
            admin.email ?? admin.uid,
        },
        { merge: true },
      );

      return NextResponse.json({
        ok: true,
      });
    }

    if (
      body.action === "set_trial_days"
    ) {
      const days = Math.max(
        0,
        Math.min(
          365,
          Number(body.days ?? 14) || 0,
        ),
      );

      await ref.set(
        {
          plan: "free",
          status:
            days > 0
              ? "trial"
              : "expired",
          planSource:
            days > 0
              ? "trial"
              : "free",
          trialStartedAt:
            Timestamp.now(),
          trialEndsAt:
            days > 0
              ? Timestamp.fromMillis(
                  Date.now() +
                    days * DAY,
                )
              : Timestamp.fromMillis(
                  Date.now() - 1000,
                ),
          manualProEndsAt: null,
          updatedAt: Timestamp.now(),
          adminUpdatedBy:
            admin.email ?? admin.uid,
        },
        { merge: true },
      );

      return NextResponse.json({
        ok: true,
      });
    }

    return NextResponse.json(
      {
        error:
          "Bilinmeyen admin işlemi.",
      },
      { status: 400 },
    );
  } catch (error) {
    console.error(
      "Admin POST error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "";

    return NextResponse.json(
      {
        error:
          message === "FORBIDDEN"
            ? "Bu hesap admin değil."
            : "Admin işlemi başarısız.",
      },
      {
        status:
          message === "FORBIDDEN"
            ? 403
            : 401,
      },
    );
  }
}