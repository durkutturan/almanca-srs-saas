import { NextResponse } from "next/server";
import { getAdminDatabase } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

const DEFAULTS = {
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
  purchaseButtonLabel: "💳 Aylık Pro’ya Geç",
};

export async function GET() {
  try {
    const db = getAdminDatabase();
    const snapshot = await db
      .doc("config/app")
      .get();

    const data = snapshot.exists
      ? snapshot.data()
      : {};

    return NextResponse.json(
      {
        settings: {
          ...DEFAULTS,
          ...data,
          freeLimits: {
            ...DEFAULTS.freeLimits,
            ...(data?.freeLimits ?? {}),
          },
        },
      },
      {
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error(
      "App settings read error:",
      error,
    );

    return NextResponse.json({
      settings: DEFAULTS,
    });
  }
}
