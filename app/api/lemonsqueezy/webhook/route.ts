import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDatabase } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPPORTED_EVENTS = new Set([
  "subscription_created",
  "subscription_updated",
  "subscription_cancelled",
  "subscription_resumed",
  "subscription_expired",
  "subscription_paused",
  "subscription_unpaused",
]);

type WebhookPayload = {
  meta?: {
    event_name?: unknown;
    custom_data?: {
      user_id?: unknown;
    };
  };
  data?: {
    id?: unknown;
    type?: unknown;
    attributes?: Record<string, unknown>;
  };
};

function getRequiredEnvironmentValue(
  name: string,
): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `${name} ortam değişkeni tanımlı değil.`,
    );
  }

  return value;
}

function readString(
  value: unknown,
): string | null {
  if (
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    return null;
  }

  const text = String(value).trim();
  return text || null;
}

function readBoolean(
  value: unknown,
): boolean {
  return value === true;
}

function verifyWebhookSignature(
  rawBody: string,
  receivedSignature: string,
  secret: string,
): boolean {
  if (
    !/^[a-f0-9]{64}$/i.test(
      receivedSignature,
    )
  ) {
    return false;
  }

  const expectedSignature = createHmac(
    "sha256",
    secret,
  )
    .update(rawBody)
    .digest("hex");

  const receivedBuffer = Buffer.from(
    receivedSignature,
    "hex",
  );

  const expectedBuffer = Buffer.from(
    expectedSignature,
    "hex",
  );

  return (
    receivedBuffer.length ===
      expectedBuffer.length &&
    timingSafeEqual(
      receivedBuffer,
      expectedBuffer,
    )
  );
}

export async function POST(
  request: Request,
) {
  try {
    const webhookSecret =
      getRequiredEnvironmentValue(
        "LEMONSQUEEZY_WEBHOOK_SECRET",
      );

    const expectedVariantId =
      getRequiredEnvironmentValue(
        "LEMONSQUEEZY_VARIANT_ID",
      );

    const receivedSignature =
      request.headers.get("x-signature");

    if (!receivedSignature) {
      return NextResponse.json(
        {
          error:
            "Webhook imzası bulunamadı.",
        },
        {
          status: 401,
        },
      );
    }

    const rawBody = await request.text();

    if (
      !verifyWebhookSignature(
        rawBody,
        receivedSignature,
        webhookSecret,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Webhook imzası geçersiz.",
        },
        {
          status: 401,
        },
      );
    }

    let payload: WebhookPayload;

    try {
      payload =
        JSON.parse(rawBody) as WebhookPayload;
    } catch {
      return NextResponse.json(
        {
          error:
            "Webhook gövdesi geçerli JSON değil.",
        },
        {
          status: 400,
        },
      );
    }

    const eventName = readString(
      payload.meta?.event_name,
    );

    if (
      !eventName ||
      !SUPPORTED_EVENTS.has(eventName)
    ) {
      return NextResponse.json({
        received: true,
        ignored: true,
      });
    }

    const userId = readString(
      payload.meta?.custom_data?.user_id,
    );

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "Webhook içinde kullanıcı kimliği bulunamadı.",
        },
        {
          status: 400,
        },
      );
    }

    const attributes =
      payload.data?.attributes ?? {};

    const variantId = readString(
      attributes.variant_id,
    );

    if (
      !variantId ||
      variantId !== expectedVariantId
    ) {
      return NextResponse.json({
        received: true,
        ignored: true,
        reason: "variant_mismatch",
      });
    }

    const subscriptionId = readString(
      payload.data?.id,
    );

    const lemonStatus =
      readString(attributes.status) ??
      "unknown";

    const isExpired =
      eventName ===
        "subscription_expired" ||
      lemonStatus === "expired";

    const accountPlan = isExpired
      ? "free"
      : "pro";

    const accountStatus = isExpired
      ? "expired"
      : "active";

    const database =
      getAdminDatabase();

    const accountReference =
      database.doc(
        `users/${userId}/account/profile`,
      );

    const subscriptionReference =
      database.doc(
        `users/${userId}/billing/subscription`,
      );

    const serverTime =
      FieldValue.serverTimestamp();

    const batch = database.batch();

    batch.set(
      accountReference,
      {
        uid: userId,
        plan: accountPlan,
        status: accountStatus,
        trialEndsAt: null,
        updatedAt: serverTime,
      },
      {
        merge: true,
      },
    );

    batch.set(
      subscriptionReference,
      {
        provider: "lemonsqueezy",
        subscriptionId,
        eventName,
        status: lemonStatus,
        statusFormatted: readString(
          attributes.status_formatted,
        ),
        storeId: readString(
          attributes.store_id,
        ),
        orderId: readString(
          attributes.order_id,
        ),
        customerId: readString(
          attributes.customer_id,
        ),
        productId: readString(
          attributes.product_id,
        ),
        variantId,
        productName: readString(
          attributes.product_name,
        ),
        variantName: readString(
          attributes.variant_name,
        ),
        userEmail: readString(
          attributes.user_email,
        ),
        renewsAt: readString(
          attributes.renews_at,
        ),
        endsAt: readString(
          attributes.ends_at,
        ),
        trialEndsAt: readString(
          attributes.trial_ends_at,
        ),
        cancelled: readBoolean(
          attributes.cancelled,
        ),
        testMode: readBoolean(
          attributes.test_mode,
        ),
        urls:
          attributes.urls &&
          typeof attributes.urls ===
            "object"
            ? attributes.urls
            : null,
        receivedAt: serverTime,
        updatedAt: serverTime,
      },
      {
        merge: true,
      },
    );

    await batch.commit();

    return NextResponse.json({
      received: true,
      userId,
      plan: accountPlan,
      subscriptionStatus:
        lemonStatus,
    });
  } catch (error) {
    console.error(
      "Lemon Squeezy webhook hatası:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Webhook işlenirken sunucu hatası oluştu.",
      },
      {
        status: 500,
      },
    );
  }
}
