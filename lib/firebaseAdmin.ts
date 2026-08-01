import {
    cert,
    getApp,
    getApps,
    initializeApp,
  } from "firebase-admin/app";
  import {
    getFirestore,
    type Firestore,
  } from "firebase-admin/firestore";
  
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
  
  export function getAdminDatabase(): Firestore {
    const existingApp =
      getApps().length > 0
        ? getApp()
        : initializeApp({
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
                getRequiredEnvironmentValue(
                  "FIREBASE_ADMIN_PRIVATE_KEY",
                ).replace(/\\n/g, "\n"),
            }),
          });
  
    return getFirestore(existingApp);
  }
  