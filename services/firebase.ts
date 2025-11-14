// --- Firebase Service Imports ---
// Service modules (like auth, firestore) are imported BEFORE the core 'app' module.
// This ensures their components are registered via side-effects before the app is initialized.
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  setPersistence,
  browserSessionPersistence,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  orderBy,
  query,
  getDocs,
  Timestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  getDoc,
  writeBatch,
  type Firestore,
  serverTimestamp,
} from 'firebase/firestore';

// --- Firebase App Core Import ---
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';

// --- Other Imports ---
import type { Conversation, HealthRecord, KnowledgeDocument, UserProfile } from '../types';
import { chunkText, createEmbedding } from './embeddingService';

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

// --- Initialization ---
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let provider: GoogleAuthProvider;

export const isFirebaseConfigured = (): boolean => {
    return firebaseConfig.apiKey !== "YOUR_API_KEY" && firebaseConfig.projectId !== "YOUR_PROJECT_ID";
};

// Initialize services directly at the module level
if (isFirebaseConfigured()) {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    provider = new GoogleAuthProvider();
    setPersistence(auth, browserSessionPersistence).catch(console.error);
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    // Services will remain undefined, and subsequent calls will be guarded.
  }
}

// --- Authentication ---
export const onAuthChange = (callback: (user: User | null) => void) => {
    if (!auth) {
      console.warn("Firebase not available for onAuthChange.");
      callback(null);
      return () => {}; // Return an empty unsubscribe function
    }
    return onAuthStateChanged(auth, callback);
};

export const signInWithGoogle = () => {
    if (!auth || !provider) throw new Error("Firebase Auth not initialized.");
    return signInWithPopup(auth, provider);
};

export const signOutUser = (): Promise<void> => {
    if (!auth) return Promise.resolve();
    return signOut(auth);
};

export const getProjectId = (): string | undefined => {
    return isFirebaseConfigured() ? firebaseConfig.projectId : undefined;
};

// Internal helper to get DB instance safely
const getDb = (): Firestore => {
    if (!db) throw new Error("Firestore not initialized.");
    return db;
}

// --- Firestore Collections (internal helpers) ---
const getConversationsCollection = (uid: string) => collection(getDb(), 'users', uid, 'conversations');
export const getKnowledgeCollection = (uid: string) => collection(getDb(), 'users', uid, 'knowledge');
const getSharedConversationsCollection = () => collection(getDb(), 'sharedConversations');
const getHealthRecordsCollection = (uid: string) => collection(getDb(), 'users', uid, 'healthRecords');
const getUserProfileDoc = (uid: string) => doc(getDb(), 'users', uid, 'profiles', 'health');

// --- Conversation Management ---
export const fetchConversations = async (uid: string): Promise<Conversation[]> => {
    const conversationsRef = getConversationsCollection(uid);
    const q = query(conversationsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            ...data,
            createdAt: (data.createdAt as Timestamp).toMillis(),
        } as Conversation
    });
};

export const createConversation = (uid: string, conversation: Conversation): Promise<void> => {
    const { id, messages, ...restOfData } = conversation;
    const conversationDocRef = doc(getConversationsCollection(uid), id);
    return setDoc(conversationDocRef, {
        ...restOfData,
        createdAt: Timestamp.fromMillis(conversation.createdAt)
    });
};

export const updateConversation = (uid: string, id: string, updates: Partial<Conversation>): Promise<void> => {
    const dataToUpdate: { [key: string]: any } = { ...updates };
    if (dataToUpdate.createdAt && typeof dataToUpdate.createdAt === 'number') {
        dataToUpdate.createdAt = Timestamp.fromMillis(dataToUpdate.createdAt);
    }
    const conversationDocRef = doc(getConversationsCollection(uid), id);
    return updateDoc(conversationDocRef, dataToUpdate);
};

export const removeConversation = (uid: string, id: string): Promise<void> => {
    const conversationDocRef = doc(getConversationsCollection(uid), id);
    return deleteDoc(conversationDocRef);
};

export const shareConversation = async (conversation: Conversation): Promise<string> => {
    const sharedConversationsRef = getSharedConversationsCollection();
    const docRef = await addDoc(sharedConversationsRef, {
        ...conversation,
        sharedAt: serverTimestamp(),
    });
    return docRef.id;
};

export const getSharedConversation = async (shareId: string): Promise<Conversation | null> => {
    const docRef = doc(getSharedConversationsCollection(), shareId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        if (!data) return null;
        return {
            ...data,
            id: docSnap.id,
            createdAt: (data.createdAt as Timestamp).toMillis(),
        } as Conversation;
    }
    return null;
};

// --- User Profile Management ---
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
    const docRef = getUserProfileDoc(uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
    }
    return null;
};

export const updateUserProfile = async (uid: string, profileData: Partial<UserProfile>): Promise<{ success: boolean }> => {
    const docRef = getUserProfileDoc(uid);
    await setDoc(docRef, profileData, { merge: true });
    return { success: true };
};

// --- Knowledge Base Management ---
export const getKnowledgeDocuments = async (uid: string): Promise<KnowledgeDocument[]> => {
    const q = query(getKnowledgeCollection(uid), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            name: data.name,
            size: data.size,
            createdAt: (data.createdAt as Timestamp).toMillis(),
        };
    });
};

export const uploadKnowledgeDocument = async (uid: string, docId: string, textContent: string): Promise<void> => {
    const chunks = chunkText(textContent);
    
    const chunkPromises = chunks.map(async (text, index) => {
        const embedding = await createEmbedding(text);
        return { text, embedding, chunkIndex: index };
    });
    
    const chunksWithEmbeddings = await Promise.all(chunkPromises);
    
    const knowledgeDocRef = doc(getKnowledgeCollection(uid), docId);
    const chunksCollectionRef = collection(knowledgeDocRef, 'chunks');
    
    const batch = writeBatch(getDb());
    chunksWithEmbeddings.forEach((chunkData, index) => {
        const chunkDocRef = doc(chunksCollectionRef, String(index));
        batch.set(chunkDocRef, {
            text: chunkData.text,
            embedding: chunkData.embedding,
        });
    });
    
    await batch.commit();
};

export const finalizeKnowledgeDocumentMetadata = async (uid: string, docId: string, metadata: { name: string; size: number }) => {
    const docRef = doc(getKnowledgeCollection(uid), docId);
    await setDoc(docRef, {
        ...metadata,
        createdAt: serverTimestamp(),
    });
};

export const deleteKnowledgeDocument = async (uid: string, document: KnowledgeDocument): Promise<void> => {
    const knowledgeDocRef = doc(getKnowledgeCollection(uid), document.id);
    const chunksCollectionRef = collection(knowledgeDocRef, 'chunks');
    
    const querySnapshot = await getDocs(chunksCollectionRef);
    const batch = writeBatch(getDb());
    querySnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    await deleteDoc(knowledgeDocRef);
};

export const getKnowledgeVectorsForUser = async (uid: string): Promise<{ docId: string, chunkId: string, text: string, embedding: number[] }[]> => {
    const knowledgeCol = getKnowledgeCollection(uid);
    const docsSnapshot = await getDocs(knowledgeCol);
    
    const allVectors: { docId: string, chunkId: string, text: string, embedding: number[] }[] = [];
    
    for (const docSnap of docsSnapshot.docs) {
        const chunksCollectionRef = collection(docSnap.ref, 'chunks');
        const chunksSnapshot = await getDocs(chunksCollectionRef);
        chunksSnapshot.forEach(chunkDoc => {
            const data = chunkDoc.data();
            allVectors.push({
                docId: docSnap.id,
                chunkId: chunkDoc.id,
                text: data.text,
                embedding: data.embedding
            });
        });
    }
    
    return allVectors;
};

// --- Health Dashboard Management ---
export const saveHealthRecord = async (uid: string, recordData: Omit<HealthRecord, 'id' | 'userId'>): Promise<string> => {
    const healthRecordsRef = getHealthRecordsCollection(uid);
    const { createdAt, ...rest } = recordData;
    const docRef = await addDoc(healthRecordsRef, {
        ...rest,
        createdAt: serverTimestamp(),
    });
    return docRef.id;
};

export const getHealthRecords = async (uid: string): Promise<HealthRecord[]> => {
    const healthRecordsRef = getHealthRecordsCollection(uid);
    const q = query(healthRecordsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            userId: uid,
            title: data.title,
            analysis: data.analysis,
            createdAt: (data.createdAt as Timestamp).toMillis(),
        } as HealthRecord;
    });
};

export const deleteHealthRecord = async (uid: string, recordId: string): Promise<void> => {
    const recordDocRef = doc(getHealthRecordsCollection(uid), recordId);
    await deleteDoc(recordDocRef);
};