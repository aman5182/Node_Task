import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { env } from './env';

let firestoreInstance: admin.firestore.Firestore | null = null;

export const initFirebase = (): admin.firestore.Firestore | null => {
  if (admin.apps.length > 0) {
    return admin.firestore();
  }

  try {
    const credPath = env.googleApplicationCredentials
      ? path.resolve(process.cwd(), env.googleApplicationCredentials)
      : null;

    if (credPath && fs.existsSync(credPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: env.firebaseProjectId || serviceAccount.project_id,
      });
      console.log('✅ Firebase Admin initialized with service account key');
    } else if (env.firebaseProjectId) {
      admin.initializeApp({
        projectId: env.firebaseProjectId,
      });
      console.log(`✅ Firebase Admin initialized with project ID: ${env.firebaseProjectId}`);
    } else {
      console.warn(
        '⚠️ Firebase Admin credentials not found. Message Firestore operations will require GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_PROJECT_ID.'
      );
      return null;
    }

    firestoreInstance = admin.firestore();
    return firestoreInstance;
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error);
    return null;
  }
};

export const getFirestore = (): admin.firestore.Firestore => {
  if (!firestoreInstance) {
    firestoreInstance = initFirebase();
  }
  if (!firestoreInstance) {
    throw new Error(
      'Firestore is not initialized. Please configure FIREBASE_PROJECT_ID or GOOGLE_APPLICATION_CREDENTIALS in .env'
    );
  }
  return firestoreInstance;
};

export { admin };
