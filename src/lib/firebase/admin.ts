import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Module-level cache
let adminAppInstance: App | undefined;
let adminDbInstance: Firestore | undefined;

export function getAdminApp(): App {
  if (adminAppInstance) {
    return adminAppInstance;
  }

  if (getApps().length > 0) {
    adminAppInstance = getApps()[0];
    adminDbInstance = getFirestore(adminAppInstance);
    return adminAppInstance;
  }

  try {
    console.log('🔥 Initializing Firebase Admin SDK...');

    // =================================================================
    // IMPORTANT: FILL IN YOUR FIREBASE ADMIN SDK DETAILS HERE
    // =================================================================
    // You can get this from your Firebase project console:
    // Project Settings > Service accounts > Generate new private key
    const serviceAccount = {
      projectId: "studio-8723557452-72ba7",
      clientEmail: "firebase-adminsdk-fbsvc@studio-8723557452-72ba7.iam.gserviceaccount.com",
      // IMPORTANT: Keep this private key secure.
      // Replace the single quotes and the escaped newlines with your actual key.
      privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDHvXT8JR5tW3NG\n1jZzXx0BtrsuiAZxkI8YOxAK09CacnoM8B4BaUgXIi/aSAWOnkJR9XNDfpQuRCjz\nBaxIqT5HhL/7l3GOt4+TiASLwI8BgVGtOu6c31jrbf9CVr6n9QtBRwsraEr7BHdS\nOmCI28T5Et0EpJfnNHc2pDiMDxvPig/LHkkBBgZrvzYAqXPVaowf/wNOm4FWr2ef\nLU+REpkk6jDx0jrKxKa3Xgcwv4AJS02G5d+jLnzzTexJrY4NVHcRAXibUU4g+5VQ\nrt9IEkOBv46KYDkBn+HfWEfluIyEu5Pmf3bai3PTtNEVsZL8wYDWDN6pDs3V5w5O\nowGhOmc9AgMBAAECggEAPAdEUUMWkecaDf/y/Vlobktsld9rkFXRq4aUm6xs1P3y\nkFDZs7LgZ5NurjtW8DW/2MHbkj1Ia18wr1jVHkE+5l+PEx3AkxO3oq8OLrIASIOE\n+Hrtm1fEcXztahKH2hJa/5NKWBFP94CwG5ZPzNG/sNtqcSrGPEYYTeOs2urvgL+F\ncCV1DES41j4CkxhK4OQjRFQA+0uvFGElaSAh/UBoKBMZSKbWg3Vdgf9Gyb/9zdD+\n6Y/CRO0DLA/spmSnd4NcjhKo2Rbl/CL3I85Vd9GfKIm+J6TtZ+Ntl/OxpnAmIRsz\nahXDPzQyaReoy8c4vNTXgxfakZw/DUI8OPk5whSAQQKBgQDlo+BYeBwybRt9lFEK\nrEzxcO0x3511GnRj0A8aFGR4plIdUPg+VBM3THu0kIFoKB+dtK0IH6EAlX+RmeZk\n3/c0lrwCOapm31prIMRq5G1z8kDcetIwf05APs2tugIZHT6FkLGG13IxeN2gpSqx\ngwd29fhyV29cAMLkxaVY/T6G0wKBgQDeqvKXFtLi00tuKrJGukkDmBlxkpjYCUbz\nCeYfeidMQ5hEWK/9KWKa/l7G93+AuG0HcYmVvMBUvGNZW1QvrH7lgBq9jzLfhbl0\nIh6IRgVsBeq/j2kok5GcsjOMusQ4iPPzcIMbNBSpvyelRNrWm90gpdvjW4QxcveJ\nDS7o9iavrwKBgQCDsKHEOkT5Sgac0oRTGZIaV4c+tZznfd9HKhau/wjLA55Nf5SM\nscw/RxYd60y6vV+8IdOkt/atjg4VImu0Z5etSc/Ret5UljuU+bqKDisSdddqWOjW\ntPrb7ugme2genN2w3NRhnoW3BzgZmv5Lw/dw6gerEqci3LDnXsy+pqPHzwKBgQCw\n0hmgx7wh6d7NllRJ/CZ9FyylVt/PNtbDq0m2F1/bnRXuuGrQ5Ctsn7EN2X7D7jCO\np6e1Y9VrtMpELFVXImkGwMr7WxrwC5Yw1eNfHhOyK6S2CCFe2ojYYV60U5/8sSzg\nVamXUa1S+vx1ro8Fu3JHOc665nK8fep6SCDHWKlx+wKBgGI7NFC6QMqvFES9ruTZ\n8v9cxIeU3oX3joPJUx8ELXu308yjyzOWFsPLhdu/+zcZXUjngvXIP5YdS7msbIlS\nxQ9++nGMMMQ9an42Vlg445nf0kyg4e5s6o5e/9tYLcUO/3CDCKELEV4LUV/nzXhD\nxEVaYUL3EkFQMhiR0g2wk7OY\n-----END PRIVATE KEY-----\n",
    };

    // Basic validation to ensure placeholders are replaced.
    if (!serviceAccount.projectId || serviceAccount.projectId === 'YOUR_PROJECT_ID' || !serviceAccount.clientEmail || !serviceAccount.privateKey.includes('PRIVATE KEY')) {
      throw new Error('Missing Firebase Admin credentials. Please update the serviceAccount object in src/lib/firebase/admin.ts');
    }

    // The private key from the JSON file doesn't need extra formatting.
    adminAppInstance = initializeApp({
      credential: cert(serviceAccount),
    });

    adminDbInstance = getFirestore(adminAppInstance);
    console.log('✅ Firebase Admin initialized');
    
    return adminAppInstance;
  } catch (error: any) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
    // Re-throwing the error is important for server-side functions to fail loudly.
    throw error;
  }
}

/**
 * Ensures the DB is initialized and returns the Firestore instance.
 */
export function getAdminDb(): Firestore {
  if (!adminDbInstance) {
    getAdminApp(); // This will initialize both app and db instances.
  }
  return adminDbInstance!;
}

/**
 * COMPATIBILITY EXPORT: 
 * This allows other files to use `import { adminDb }` 
 * while still benefiting from the lazy-loading logic above.
 */
export const adminDb = getAdminDb();
export const db = adminDb; // Alias for compatibility
