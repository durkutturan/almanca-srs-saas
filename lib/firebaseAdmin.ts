import {
  cert,
  getApp,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import {
  getFirestore,
  type Firestore,
} from "firebase-admin/firestore";

const ADMIN_APP_NAME = "almanca-srs-admin";

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

function normalizePrivateKey(
  value: string,
): string {
  let normalized = value.trim();

  if (
    normalized.startsWith('"') &&
    normalized.endsWith('"')
  ) {
    normalized = normalized.slice(1, -1);
  }

  return normalized
    .replace(/\\n/g, "\n")
    .trim();
}

export function getAdminApp(): App {
  try {
    return getApp(ADMIN_APP_NAME);
  } catch {
    return initializeApp(
      {
        credential: cert({
          projectId:
            getRequiredEnvironmentValue(
              "FIREBASE_ADMIN_PROJECT_ID",
            ),
          clientEmail:
            getRequiredEnvironmentValue(
              "FIREBASE_ADMIN_CLIENT_EMAIL",
            ),
          privateKey:
            normalizePrivateKey(
              getRequiredEnvironmentValue(
                "FIREBASE_ADMIN_PRIVATE_KEY",
              ),
            ),
        }),
      },
      ADMIN_APP_NAME,
    );
  }
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminDatabase(): Firestore {
  return getFirestore(getAdminApp());
}