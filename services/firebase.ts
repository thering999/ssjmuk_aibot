
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
// IMPORTANT: Side-effect imports must come first to ensure components are registered
import 'firebase/auth';
import 'firebase/firestore';

import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User, 
  Auth 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp, 
  serverTimestamp, 
  writeBatch, 
  Firestore,
  increment
} from 'firebase/firestore';

import type { Conversation, HealthRecord, KnowledgeDocument, UserProfile, MealLog, MoodLog, AppointmentRecord, SleepLog } from '../types';
import { chunkText, createEmbedding } from './embeddingService';

// Export User type for use in other components
export type { User };

// --- Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyAFC2MkS-ie0AI6OEsbCSD20FhyQZplv9g",
  authDomain: "ssj-mukdahan-ai-bot.firebaseapp.com",
  projectId: "ssj-mukdahan-ai-bot",
  storageBucket: "ssj-mukdahan-ai-bot.firebasestorage.app",
  messagingSenderId: "557496406519",
  appId: "1:557496406519:web:5e18658a40bf1c63415ef2",
  measurementId: "G-8KEMJLGT70"
};

// --- Initialization State ---
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let googleProvider: GoogleAuthProvider;

const isConfigured = !!(firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY");

// --- Lazy Initialization Helpers ---
const getFirebaseApp = (): FirebaseApp => {
    if (!app) {
        app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    }
    return app;
};

const getFirebaseAuth = (): Auth => {
    if (!isConfigured) throw new Error("Firebase not configured");
    if (!auth) {
        const firebaseApp = getFirebaseApp();
        // Use standard getAuth. The side-effect imports at the top of this file 
        // and in index.tsx ensure the component is registered.
        auth = getAuth(firebaseApp);
        googleProvider = new GoogleAuthProvider();
    }
    return auth;
};

const getFirebaseDb = (): Firestore => {
    if (!isConfigured) throw new Error("Firebase not configured");
    if (!db) {
        const firebaseApp = getFirebaseApp();
        db = getFirestore(firebaseApp);
    }
    return db;
};

// --- Exports ---
export const isFirebaseConfigured = (): boolean => isConfigured;

// --- Authentication ---
export const onAuthChange = (callback: (user: User | null) => void) => {
    if (!isConfigured) {
        callback(null);
        return () => {}; 
    }
    try {
        const authInstance = getFirebaseAuth();
        return onAuthStateChanged(authInstance, callback);
    } catch (error) {
        console.error("Error initializing auth listener:", error);
        callback(null);
        return () => {};
    }
};

export const signInWithGoogle = () => {
    const authInstance = getFirebaseAuth();
    if (!googleProvider) googleProvider = new GoogleAuthProvider();
    return signInWithPopup(authInstance, googleProvider);
};

export const signOutUser = (): Promise<void> => {
    if (!isConfigured) return Promise.resolve();
    return signOut(getFirebaseAuth());
};

export const getProjectId = (): string | undefined => {
    return isConfigured ? firebaseConfig.projectId : undefined;
};

// --- Firestore References Helpers ---
const getConversationsRef = (uid: string) => collection(getFirebaseDb(), 'users', uid, 'conversations');
export const getKnowledgeRef = (uid: string) => collection(getFirebaseDb(), 'users', uid, 'knowledge');
const getSharedConversationsRef = () => collection(getFirebaseDb(), 'sharedConversations');
const getHealthRecordsRef = (uid: string) => collection(getFirebaseDb(), 'users', uid, 'healthRecords');
const getMealLogsRef = (uid: string) => collection(getFirebaseDb(), 'users', uid, 'mealLogs');
const getMoodLogsRef = (uid: string) => collection(getFirebaseDb(), 'users', uid, 'moodLogs');
const getSleepLogsRef = (uid: string) => collection(getFirebaseDb(), 'users', uid, 'sleepLogs');
const getAppointmentsRef = (uid: string) => collection(getFirebaseDb(), 'users', uid, 'appointments');
const getUserProfileRef = (uid: string) => doc(getFirebaseDb(), 'users', uid, 'profiles', 'health');

// --- Conversation Management ---
export const fetchConversations = async (uid: string): Promise<Conversation[]> => {
    if (!isConfigured) return [];
    const q = query(getConversationsRef(uid), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now(),
        } as Conversation;
    });
};

export const createConversation = async (uid: string, conversation: Conversation): Promise<void> => {
    if (!isConfigured) return;
    const { id, messages, ...restOfData } = conversation;
    const docRef = doc(getConversationsRef(uid), id);
    await setDoc(docRef, {
        ...restOfData,
        createdAt: Timestamp.fromMillis(conversation.createdAt)
    });
};

export const updateConversation = async (uid: string, id: string, updates: Partial<Conversation>): Promise<void> => {
    if (!isConfigured) return;
    const dataToUpdate: any = { ...updates };
    if (typeof dataToUpdate.createdAt === 'number') {
        dataToUpdate.createdAt = Timestamp.fromMillis(dataToUpdate.createdAt);
    }
    const docRef = doc(getConversationsRef(uid), id);
    await updateDoc(docRef, dataToUpdate);
};

export const removeConversation = async (uid: string, id: string): Promise<void> => {
    if (!isConfigured) return;
    const docRef = doc(getConversationsRef(uid), id);
    await deleteDoc(docRef);
};

export const shareConversation = async (conversation: Conversation): Promise<string> => {
    if (!isConfigured) throw new Error("Firebase not configured");
    const docRef = await addDoc(getSharedConversationsRef(), {
        ...conversation,
        sharedAt: serverTimestamp(),
    });
    return docRef.id;
};

export const getSharedConversation = async (shareId: string): Promise<Conversation | null> => {
    if (!isConfigured) return null;
    const docRef = doc(getSharedConversationsRef(), shareId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        if (!data) return null;
        return {
            ...data,
            id: docSnap.id,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now(),
        } as Conversation;
    }
    return null;
};

// --- User Profile Management ---
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
    if (!isConfigured) return null;
    const docSnap = await getDoc(getUserProfileRef(uid));
    if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
    }
    return null;
};

export const updateUserProfile = async (uid: string, profileData: Partial<UserProfile>): Promise<{ success: boolean }> => {
    if (!isConfigured) throw new Error("Firebase not configured");
    await setDoc(getUserProfileRef(uid), profileData, { merge: true });
    return { success: true };
};

export const addHealthPoints = async (uid: string, points: number): Promise<void> => {
    if (!isConfigured) return;
    await updateDoc(getUserProfileRef(uid), {
        healthPoints: increment(points)
    });
};

export const deductHealthPoints = async (uid: string, points: number): Promise<void> => {
    if (!isConfigured) return;
    // Use a negative increment to deduct points
    await updateDoc(getUserProfileRef(uid), {
        healthPoints: increment(-points)
    });
};

// --- Knowledge Base Management ---
export const getKnowledgeDocuments = async (uid: string): Promise<KnowledgeDocument[]> => {
    if (!isConfigured) return [];
    const q = query(getKnowledgeRef(uid), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            name: data.name,
            size: data.size,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now(),
        };
    });
};

export const uploadKnowledgeDocument = async (uid: string, docId: string, textContent: string): Promise<void> => {
    if (!isConfigured) throw new Error("Firebase not configured");
    const chunks = chunkText(textContent);
    const chunkPromises = chunks.map(async (text, index) => {
        const embedding = await createEmbedding(text);
        return { text, embedding, chunkIndex: index };
    });
    const chunksWithEmbeddings = await Promise.all(chunkPromises);
    
    const docRef = doc(getKnowledgeRef(uid), docId);
    const chunksRef = collection(docRef, 'chunks');
    const batch = writeBatch(getFirebaseDb());
    
    chunksWithEmbeddings.forEach((chunkData, index) => {
        const chunkDoc = doc(chunksRef, String(index));
        batch.set(chunkDoc, {
            text: chunkData.text,
            embedding: chunkData.embedding,
        });
    });
    await batch.commit();
};

export const finalizeKnowledgeDocumentMetadata = async (uid: string, docId: string, metadata: { name: string; size: number }) => {
    if (!isConfigured) return;
    const docRef = doc(getKnowledgeRef(uid), docId);
    await setDoc(docRef, {
        ...metadata,
        createdAt: serverTimestamp(),
    });
};

export const deleteKnowledgeDocument = async (uid: string, document: KnowledgeDocument): Promise<void> => {
    if (!isConfigured) return;
    const docRef = doc(getKnowledgeRef(uid), document.id);
    const chunksRef = collection(docRef, 'chunks');
    const chunksSnapshot = await getDocs(chunksRef);
    
    const batch = writeBatch(getFirebaseDb());
    chunksSnapshot.docs.forEach(c => batch.delete(c.ref));
    batch.delete(docRef);
    await batch.commit();
};

export const getKnowledgeVectorsForUser = async (uid: string): Promise<{ docId: string, chunkId: string, text: string, embedding: number[] }[]> => {
    if (!isConfigured) return [];
    const docsSnapshot = await getDocs(getKnowledgeRef(uid));
    const allVectors: any[] = [];
    
    await Promise.all(docsSnapshot.docs.map(async (docSnap) => {
        const chunksRef = collection(docSnap.ref, 'chunks');
        const chunksSnapshot = await getDocs(chunksRef);
        chunksSnapshot.docs.forEach(chunkDoc => {
            const data = chunkDoc.data();
            allVectors.push({
                docId: docSnap.id,
                chunkId: chunkDoc.id,
                text: data.text,
                embedding: data.embedding
            });
        });
    }));

    return allVectors;
};

// --- Health Dashboard Management ---
export const saveHealthRecord = async (uid: string, recordData: Omit<HealthRecord, 'id' | 'userId'>): Promise<string> => {
    if (!isConfigured) throw new Error("Firebase not configured");
    const { createdAt, ...rest } = recordData;
    const docRef = await addDoc(getHealthRecordsRef(uid), {
        ...rest,
        createdAt: serverTimestamp(),
    });
    return docRef.id;
};

export const getHealthRecords = async (uid: string): Promise<HealthRecord[]> => {
    if (!isConfigured) return [];
    const q = query(getHealthRecordsRef(uid), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            userId: uid,
            title: data.title,
            analysis: data.analysis,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now(),
        } as HealthRecord;
    });
};

export const deleteHealthRecord = async (uid: string, recordId: string): Promise<void> => {
    if (!isConfigured) return;
    const docRef = doc(getHealthRecordsRef(uid), recordId);
    await deleteDoc(docRef);
};

// --- Nutrition Tracking Management ---
export const saveMealLog = async (uid: string, mealData: Omit<MealLog, 'id' | 'userId'>): Promise<string> => {
    if (!isConfigured) throw new Error("Firebase not configured");
    const { timestamp, ...rest } = mealData;
    const docRef = await addDoc(getMealLogsRef(uid), {
        ...rest,
        timestamp: timestamp ? Timestamp.fromMillis(timestamp) : serverTimestamp(),
    });
    return docRef.id;
};

export const getMealLogs = async (uid: string, date?: Date): Promise<MealLog[]> => {
    if (!isConfigured) return [];
    let q;
    const collectionRef = getMealLogsRef(uid);
    
    if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        q = query(collectionRef, 
            where('timestamp', '>=', Timestamp.fromDate(startOfDay)),
            where('timestamp', '<=', Timestamp.fromDate(endOfDay)),
            orderBy('timestamp', 'desc')
        );
    } else {
        q = query(collectionRef, orderBy('timestamp', 'desc'));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => {
        const data = docSnap.data() as any;
        return {
            id: docSnap.id,
            userId: uid,
            name: data.name,
            calories: data.calories,
            protein: data.protein,
            carbs: data.carbs,
            fat: data.fat,
            imageUrl: data.imageUrl,
            analysis: data.analysis,
            timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toMillis() : Date.now(),
        } as MealLog;
    });
};

export const deleteMealLog = async (uid: string, logId: string): Promise<void> => {
    if (!isConfigured) return;
    const docRef = doc(getMealLogsRef(uid), logId);
    await deleteDoc(docRef);
};

// --- Wellness & Mood Management ---
export const saveMoodLog = async (uid: string, moodData: Omit<MoodLog, 'id' | 'userId'>): Promise<string> => {
    if (!isConfigured) throw new Error("Firebase not configured");
    const { timestamp, ...rest } = moodData;
    const docRef = await addDoc(getMoodLogsRef(uid), {
        ...rest,
        timestamp: timestamp ? Timestamp.fromMillis(timestamp) : serverTimestamp(),
    });
    return docRef.id;
};

export const getMoodLogs = async (uid: string): Promise<MoodLog[]> => {
    if (!isConfigured) return [];
    const q = query(getMoodLogsRef(uid), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            userId: uid,
            mood: data.mood,
            note: data.note,
            aiResponse: data.aiResponse,
            timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toMillis() : Date.now(),
        } as MoodLog;
    });
};

export const deleteMoodLog = async (uid: string, logId: string): Promise<void> => {
    if (!isConfigured) return;
    const docRef = doc(getMoodLogsRef(uid), logId);
    await deleteDoc(docRef);
};

// --- Sleep Management ---
export const saveSleepLog = async (uid: string, sleepData: Omit<SleepLog, 'id' | 'userId'>): Promise<string> => {
    if (!isConfigured) throw new Error("Firebase not configured");
    const { timestamp, ...rest } = sleepData;
    const docRef = await addDoc(getSleepLogsRef(uid), {
        ...rest,
        timestamp: timestamp ? Timestamp.fromMillis(timestamp) : serverTimestamp(),
    });
    return docRef.id;
};

export const getSleepLogs = async (uid: string): Promise<SleepLog[]> => {
    if (!isConfigured) return [];
    const q = query(getSleepLogsRef(uid), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            userId: uid,
            bedtime: data.bedtime,
            waketime: data.waketime,
            durationHours: data.durationHours,
            quality: data.quality,
            notes: data.notes,
            aiAnalysis: data.aiAnalysis,
            timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toMillis() : Date.now(),
        } as SleepLog;
    });
};

export const deleteSleepLog = async (uid: string, logId: string): Promise<void> => {
    if (!isConfigured) return;
    const docRef = doc(getSleepLogsRef(uid), logId);
    await deleteDoc(docRef);
};

// --- Appointment Management ---
export const saveAppointment = async (uid: string, appointmentData: Omit<AppointmentRecord, 'id' | 'userId'>): Promise<string> => {
    if (!isConfigured) throw new Error("Firebase not configured");
    const { timestamp, ...rest } = appointmentData;
    const docRef = await addDoc(getAppointmentsRef(uid), {
        ...rest,
        timestamp: timestamp ? Timestamp.fromMillis(timestamp) : serverTimestamp(),
    });
    return docRef.id;
};

export const getAppointments = async (uid: string): Promise<AppointmentRecord[]> => {
    if (!isConfigured) return [];
    const q = query(getAppointmentsRef(uid), orderBy('date', 'asc')); 
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            userId: uid,
            specialty: data.specialty,
            date: data.date,
            time: data.time,
            confirmationId: data.confirmationId,
            timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toMillis() : Date.now(),
        } as AppointmentRecord;
    });
};

export const deleteAppointment = async (uid: string, aptId: string): Promise<void> => {
    if (!isConfigured) return;
    const docRef = doc(getAppointmentsRef(uid), aptId);
    await deleteDoc(docRef);
};
