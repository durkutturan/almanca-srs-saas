import {
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import {
  getAdminAuth,
  getAdminDatabase,
} from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TRIAL_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

type RequestBody = {
  email?: unknown;
  displayName?: unknown;
  photoURL?: unknown;
};

type AccountDocument = {
  uid?: unknown;
  email?: unknown;
  displayName?: unknown;
  photoURL?: unknown;
  plan?: unknown;
  status?: unknown;
  trialStartedAt?: unknown;
  trialEndsAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

function readNullableString(
  value: unknown,
): string | null {
  return typeof value === "string"
    ? value
    : null;
}

function readPlan(
  value: unknown,
): "free" | "pro" {
  return value === "pro" ? "pro" : "free";
}

function readStatus(
  value: unknown,
):
  | "trial"
  | "active"
  | "expired"
  | "canceled" {
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

function timestampToMillis(
  value: unknown,
): number | null {
  return value instanceof Timestamp
    ? value.toMillis()
    : null;
}

function toResponseAccount(
  userId: string,
  data: AccountDocument,
) {
  return {
    uid:
      typeof data.uid === "string"
        ? data.uid
        : userId,
    email: readNullableString(data.email),
    displayName: readNullableString(
      data.displayName,
    ),
    photoURL: readNullableString(
      data.photoURL,
    ),
    plan: readPlan(data.plan),
    status: readStatus(data.status),
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

function readBearerToken(
  request: Request,
): string | null {
  const authorization =
    request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const [scheme, token] =
    authorization.split(" ");

  if (
    scheme?.toLowerCase() !== "bearer" ||
    !token
  ) {
    return null;
  }

  return token;
}

export async function POST(
  request: Request,
) {
  try {
    const idToken =
      readBearerToken(request);

    if (!idToken) {
      return NextResponse.json(
        {
          error:
            "Kimlik doğrulama bilgisi bulunamadı.",
        },
        {
          status: 401,
        },
      );
    }

    const decodedToken =
      await getAdminAuth().verifyIdToken(
        idToken,
      );

    const userId = decodedToken.uid;

    let body: RequestBody = {};

    try {
      body =
        (await request.json()) as RequestBody;
    } catch {
      body = {};
    }

    const database =
      getAdminDatabase();

    const accountReference =
      database.doc(
        `users/${userId}/account/profile`,
      );

    const account =
      await database.runTransaction(
        async (transaction) => {
          const snapshot =
            await transaction.get(
              accountReference,
            );

          if (snapshot.exists) {
            const existingData =
              snapshot.data() as AccountDocument;

            transaction.set(
              accountReference,
              {
                uid: userId,
                email:
                  decodedToken.email ??
                  readNullableString(
                    body.email,
                  ),
                displayName:
                  readNullableString(
                    body.displayName,
                  ),
                photoURL:
                  readNullableString(
                    body.photoURL,
                  ),
                updatedAt:
                  FieldValue.serverTimestamp(),
              },
              {
                merge: true,
              },
            );

            return toResponseAccount(
              userId,
              existingData,
            );
          }

          const now = Timestamp.now();

          const trialEndsAt =
            Timestamp.fromMillis(
              now.toMillis() +
                TRIAL_DAYS * DAY_MS,
            );

          const newAccount = {
            uid: userId,
            email:
              decodedToken.email ??
              readNullableString(
                body.email,
              ),
            displayName:
              readNullableString(
                body.displayName,
              ),
            photoURL:
              readNullableString(
                body.photoURL,
              ),
            plan: "free" as const,
            status: "trial" as const,
            trialStartedAt: now,
            trialEndsAt,
            createdAt: now,
            updatedAt: now,
          };

          transaction.set(
            accountReference,
            newAccount,
          );

          return toResponseAccount(
            userId,
            newAccount,
          );
        },
      );

    return NextResponse.json({
      account,
    });
  } catch (error) {
    console.error(
      "Hesap oluşturma/güncelleme hatası:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Kullanıcı hesabı sunucuda doğrulanamadı.",
      },
      {
        status: 500,
      },
    );
  }
}
