import {
  NextRequest,
  NextResponse,
} from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

const API_BASE =
  "https://api.lemonsqueezy.com/v1";

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
    throw new Error(
      "UNAUTHORIZED",
    );
  }

  const decoded =
    await getAdminAuth()
      .verifyIdToken(token);

  const email =
    decoded.email
      ?.trim()
      .toLowerCase() ?? "";

  if (
    !email ||
    !adminEmails().has(email)
  ) {
    throw new Error(
      "FORBIDDEN",
    );
  }
}

function apiKey() {
  const value =
    process.env
      .LEMONSQUEEZY_API_KEY
      ?.trim();

  if (!value) {
    throw new Error(
      "LEMON_API_KEY_MISSING",
    );
  }

  return value;
}

function lemonHeaders() {
  return {
    Accept:
      "application/vnd.api+json",
    "Content-Type":
      "application/vnd.api+json",
    Authorization:
      `Bearer ${apiKey()}`,
  };
}

async function lemonFetch(
  path: string,
  init?: RequestInit,
) {
  const response = await fetch(
    `${API_BASE}${path}`,
    {
      ...init,
      headers: {
        ...lemonHeaders(),
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    },
  );

  if (
    response.status === 204
  ) {
    return {
      response,
      data: null,
    };
  }

  const data =
    await response
      .json()
      .catch(() => null);

  if (!response.ok) {
    const detail =
      data?.errors?.[0]
        ?.detail ||
      data?.errors?.[0]
        ?.title ||
      "Lemon Squeezy API işlemi başarısız.";

    throw new Error(
      `LEMON_ERROR:${detail}`,
    );
  }

  return {
    response,
    data,
  };
}

async function getStore() {
  const { data } =
    await lemonFetch(
      "/stores?page[size]=100",
    );

  const stores =
    Array.isArray(data?.data)
      ? data.data
      : [];

  if (stores.length === 0) {
    throw new Error(
      "LEMON_STORE_MISSING",
    );
  }

  const requestedStoreId =
    process.env
      .LEMONSQUEEZY_STORE_ID
      ?.trim();

  const store =
    requestedStoreId
      ? stores.find(
          (item: {
            id?: string;
          }) =>
            String(
              item.id,
            ) ===
            requestedStoreId,
        )
      : stores[0];

  if (!store?.id) {
    throw new Error(
      "LEMON_STORE_MISSING",
    );
  }

  return {
    id: String(store.id),
    name:
      store.attributes?.name ??
      null,
  };
}

function errorResponse(
  error: unknown,
) {
  const message =
    error instanceof Error
      ? error.message
      : "UNKNOWN";

  if (
    message ===
    "UNAUTHORIZED"
  ) {
    return NextResponse.json(
      { error: "Oturum gerekli." },
      { status: 401 },
    );
  }

  if (
    message === "FORBIDDEN"
  ) {
    return NextResponse.json(
      {
        error:
          "Bu işlem için admin yetkisi gerekli.",
      },
      { status: 403 },
    );
  }

  if (
    message ===
    "LEMON_API_KEY_MISSING"
  ) {
    return NextResponse.json(
      {
        error:
          "LEMONSQUEEZY_API_KEY tanımlı değil.",
      },
      { status: 500 },
    );
  }

  if (
    message ===
    "LEMON_STORE_MISSING"
  ) {
    return NextResponse.json(
      {
        error:
          "Lemon Squeezy mağazası bulunamadı.",
      },
      { status: 500 },
    );
  }

  if (
    message.startsWith(
      "LEMON_ERROR:",
    )
  ) {
    return NextResponse.json(
      {
        error:
          message.replace(
            "LEMON_ERROR:",
            "",
          ),
      },
      { status: 502 },
    );
  }

  console.error(
    "[admin-discounts]",
    error,
  );

  return NextResponse.json(
    {
      error:
        "Kupon işlemi başarısız.",
    },
    { status: 500 },
  );
}

export async function GET(
  request: NextRequest,
) {
  try {
    await requireAdmin(
      request,
    );

    const store =
      await getStore();

    const { data } =
      await lemonFetch(
        `/discounts?filter[store_id]=${encodeURIComponent(
          store.id,
        )}&page[size]=100`,
      );

    const discounts =
      (
        Array.isArray(
          data?.data,
        )
          ? data.data
          : []
      ).map(
        (item: {
          id: string;
          attributes?: Record<
            string,
            unknown
          >;
        }) => {
          const attributes =
            item.attributes ??
            {};

          return {
            id: String(
              item.id,
            ),
            name:
              String(
                attributes.name ??
                  "",
              ),
            code:
              String(
                attributes.code ??
                  "",
              ),
            amount:
              Number(
                attributes.amount ??
                  0,
              ),
            amountType:
              attributes.amount_type ===
              "fixed"
                ? "fixed"
                : "percent",
            duration:
              attributes.duration ===
              "forever"
                ? "forever"
                : attributes.duration ===
                    "repeating"
                  ? "repeating"
                  : "once",
            durationInMonths:
              Number(
                attributes.duration_in_months ??
                  1,
              ),
            maxRedemptions:
              attributes.is_limited_redemptions
                ? Number(
                    attributes.max_redemptions ??
                      0,
                  )
                : null,
            expiresAt:
              typeof attributes.expires_at ===
              "string"
                ? attributes.expires_at
                : null,
            status:
              String(
                attributes.status_formatted ??
                  attributes.status ??
                  "",
              ),
            createdAt:
              typeof attributes.created_at ===
              "string"
                ? attributes.created_at
                : null,
          };
        },
      );

    return NextResponse.json({
      discounts,
      storeName: store.name,
    });
  } catch (error) {
    return errorResponse(
      error,
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  try {
    await requireAdmin(
      request,
    );

    const body =
      (await request.json()) as {
        name?: string;
        code?: string;
        amount?: number;
        amountType?:
          | "percent"
          | "fixed";
        duration?:
          | "once"
          | "repeating"
          | "forever";
        durationInMonths?: number;
        maxRedemptions?:
          | number
          | null;
        expiresAt?:
          | string
          | null;
      };

    const name =
      body.name?.trim() ?? "";

    const code =
      (body.code ?? "")
        .trim()
        .toUpperCase()
        .replace(
          /[^A-Z0-9]/g,
          "",
        );

    const amountType =
      body.amountType ===
      "fixed"
        ? "fixed"
        : "percent";

    const rawAmount =
      Number(body.amount);

    if (
      !name ||
      code.length < 3 ||
      !Number.isFinite(
        rawAmount,
      ) ||
      rawAmount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Kupon bilgileri geçersiz.",
        },
        { status: 400 },
      );
    }

    if (
      amountType ===
        "percent" &&
      rawAmount > 100
    ) {
      return NextResponse.json(
        {
          error:
            "Yüzde indirim 100'den büyük olamaz.",
        },
        { status: 400 },
      );
    }

    const duration =
      body.duration ===
      "forever"
        ? "forever"
        : body.duration ===
            "repeating"
          ? "repeating"
          : "once";

    const durationInMonths =
      Math.max(
        1,
        Math.round(
          Number(
            body.durationInMonths ??
              1,
          ),
        ),
      );

    const maxRedemptions =
      body.maxRedemptions ===
        null ||
      body.maxRedemptions ===
        undefined
        ? null
        : Math.max(
            1,
            Math.round(
              Number(
                body.maxRedemptions,
              ),
            ),
          );

    const expiresAt =
      body.expiresAt
        ? new Date(
            `${body.expiresAt}T23:59:59`,
          ).toISOString()
        : null;

    const store =
      await getStore();

    const variantId =
      process.env
        .LEMONSQUEEZY_VARIANT_ID
        ?.trim();

    if (!variantId) {
      return NextResponse.json(
        {
          error:
            "LEMONSQUEEZY_VARIANT_ID tanımlı değil.",
        },
        { status: 500 },
      );
    }

    const lemonAmount =
      amountType ===
      "fixed"
        ? Math.round(
            rawAmount * 100,
          )
        : Math.round(
            rawAmount,
          );

    const attributes: Record<
      string,
      unknown
    > = {
      name,
      code,
      amount: lemonAmount,
      amount_type:
        amountType,
      is_limited_to_products:
        true,
      is_limited_redemptions:
        maxRedemptions !==
        null,
      max_redemptions:
        maxRedemptions ??
        0,
      duration,
      duration_in_months:
        durationInMonths,
      test_mode: false,
    };

    if (expiresAt) {
      attributes.expires_at =
        expiresAt;
    }

    const payload = {
      data: {
        type: "discounts",
        attributes,
        relationships: {
          store: {
            data: {
              type: "stores",
              id: store.id,
            },
          },
          variants: {
            data: [
              {
                type:
                  "variants",
                id: variantId,
              },
            ],
          },
        },
      },
    };

    const { data } =
      await lemonFetch(
        "/discounts",
        {
          method: "POST",
          body: JSON.stringify(
            payload,
          ),
        },
      );

    return NextResponse.json(
      {
        ok: true,
        id:
          data?.data?.id ??
          null,
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(
      error,
    );
  }
}

export async function DELETE(
  request: NextRequest,
) {
  try {
    await requireAdmin(
      request,
    );

    const id =
      request.nextUrl.searchParams
        .get("id")
        ?.trim();

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Kupon ID eksik.",
        },
        { status: 400 },
      );
    }

    await lemonFetch(
      `/discounts/${encodeURIComponent(
        id,
      )}`,
      {
        method: "DELETE",
      },
    );

    return new NextResponse(
      null,
      { status: 204 },
    );
  } catch (error) {
    return errorResponse(
      error,
    );
  }
}