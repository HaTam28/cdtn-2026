import { initializeApp, getApps } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";

const getConfig = () => ({
    apiKey: "AIzaSyCjk4taY72CSsggbtgz62d_KT1BvMSfzGs",
    authDomain: "cdtn-2004bn.firebaseapp.com",
    projectId: "cdtn-2004bn",
    storageBucket: "cdtn-2004bn.firebasestorage.app",
    messagingSenderId: "214516380588",
    appId: "1:214516380588:web:8e64eb165464b90bd20009",
    measurementId: "G-V30ZD1GJBV",
});

export const getFirebaseApp = () => {
    const config = getConfig();
    if (!config) return null;
    if (!getApps().length) {
        return initializeApp(config);
    }
    return getApps()[0];
};

let firestoreDb = null;

export const getFirestoreDb = () => {
    const app = getFirebaseApp();
    if (!app) return null;
    if (firestoreDb) return firestoreDb;
    try {
        firestoreDb = initializeFirestore(app, {
            experimentalForceLongPolling: true,
            useFetchStreams: false,
        });
    } catch {
        return null;
    }
    return firestoreDb;
};
