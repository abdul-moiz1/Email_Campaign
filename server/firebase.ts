import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
let db: admin.firestore.Firestore | null = null;

export function initializeFirebase() {
  try {
    // Check if Firebase Admin has already been initialized
    if (admin.apps.length === 0) {
      // Initialize with service account credentials from environment
      const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      });

      console.log('✓ Firebase Admin initialized successfully');
    }

    db = admin.firestore();
    return db;
  } catch (error) {
    console.error('Firebase initialization error:', error);
    throw error;
  }
}

export function getFirestore(): admin.firestore.Firestore {
  if (!db) {
    db = initializeFirebase();
  }
  return db;
}
