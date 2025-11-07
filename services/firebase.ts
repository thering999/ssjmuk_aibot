// @google/genai-fix: Refactored to use Firebase v9 compat API to resolve type errors with v8 syntax.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';

import type { Conversation, KnowledgeDocument } from '../types';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAFC2MkS-ie0AI6OEsbCSD20FhyQZplv9g",
  authDomain: "ssj-mukdahan-ai-bot.firebaseapp.com",
  projectId: "ssj-mukdahan-ai-bot",
  storageBucket: "ssj-mukdahan-ai-bot.firebasestorage.app",
  messagingSenderId: "557496406519",
  appId: "1:557496406519:web:5e18658a40bf1c63415ef2",
  measurementId: "G-8KEMJLGT70"
};


// Function to check if Firebase config is set
export const isFirebaseConfigured = (): boolean => {
    return firebaseConfig.apiKey !== "YOUR_API_KEY" && firebaseConfig.projectId !== "YOUR_PROJECT_ID";
};

let app: firebase.app.App | undefined;
if (isFirebaseConfigured()) {
    try {
        app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();
    } catch (error) {
        console.error("Firebase initialization error:", error);
    }
}

// Export User type for convenience.
export type User = firebase.User;

// --- Services ---
const auth = app ? firebase.auth() : undefined;
export const db = app ? firebase.firestore() : undefined;
const storage = app ? firebase.storage() : undefined;
const provider = app ? new firebase.auth.GoogleAuthProvider() : undefined;

// --- Authentication ---
export const onAuthChange = (callback: (user: User | null) => void) => {
    if (!auth) return () => {};
    return auth.onAuthStateChanged(callback);
};

export const signInWithGoogle = async (): Promise<User | null> => {
    if (!auth || !provider) throw new Error("Firebase not configured for authentication.");
    const result = await auth.signInWithPopup(provider);
    return result.user;
};

export const signOutUser = (): Promise<void> => {
    if (!auth) return Promise.resolve();
    return auth.signOut();
};

export const getProjectId = (): string | undefined => {
    return firebaseConfig.projectId;
};

// --- Firestore Collections ---
const getConversationsCollection = (uid: string) => {
    if (!db) throw new Error("Firestore not initialized");
    return db.collection('users').doc(uid).collection('conversations');
};

const getKnowledgeCollection = (uid: string) => {
    if (!db) throw new Error("Firestore not initialized");
    return db.collection('users').doc(uid).collection('knowledge');
};

const getSharedConversationsCollection = () => {
     if (!db) throw new Error("Firestore not initialized");
    return db.collection('sharedConversations');
};


// --- Conversation Management ---
export const fetchConversations = async (uid: string): Promise<Conversation[]> => {
    const conversationsRef = getConversationsCollection(uid);
    const q = conversationsRef.orderBy('createdAt', 'desc');
    const querySnapshot = await q.get();
    return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            ...data,
            // Convert Firestore Timestamp to number
            createdAt: (data.createdAt as firebase.firestore.Timestamp).toMillis(),
        } as Conversation
    });
};

export const createConversation = (uid: string, conversation: Conversation): Promise<void> => {
    const { id, ...dataToSave } = conversation;
    // For new conversations, messages might not exist yet, so we don't save it.
    const { messages, ...restOfData } = dataToSave;
    const conversationDocRef = getConversationsCollection(uid).doc(id);
    return conversationDocRef.set({
        ...restOfData,
        createdAt: firebase.firestore.Timestamp.fromMillis(conversation.createdAt)
    });
};


export const updateConversation = (uid: string, id: string, updates: Partial<Conversation>): Promise<void> => {
    const dataToUpdate: firebase.firestore.DocumentData = { ...updates };
    // Convert number timestamp back to Firestore Timestamp if present
    if (dataToUpdate.createdAt && typeof dataToUpdate.createdAt === 'number') {
        dataToUpdate.createdAt = firebase.firestore.Timestamp.fromMillis(dataToUpdate.createdAt);
    }
    const conversationDocRef = getConversationsCollection(uid).doc(id);
    return conversationDocRef.update(dataToUpdate);
};

export const removeConversation = (uid: string, id: string): Promise<void> => {
    const conversationDocRef = getConversationsCollection(uid).doc(id);
    return conversationDocRef.delete();
};

export const shareConversation = async (conversation: Conversation): Promise<string> => {
    const sharedConversationsRef = getSharedConversationsCollection();
    const docRef = await sharedConversationsRef.add({
        ...conversation,
        sharedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    return docRef.id;
};

export const getSharedConversation = async (shareId: string): Promise<Conversation | null> => {
    const docRef = getSharedConversationsCollection().doc(shareId);
    const docSnap = await docRef.get();
    if (docSnap.exists) {
        const data = docSnap.data();
        if (!data) return null;
        return {
            ...data,
            id: docSnap.id,
            // Convert Firestore Timestamp to number
            createdAt: (data.createdAt as firebase.firestore.Timestamp).toMillis(),
        } as Conversation;
    }
    return null;
};

// --- Knowledge Base Management ---
export const getKnowledgeDocuments = async (uid: string): Promise<KnowledgeDocument[]> => {
    const q = getKnowledgeCollection(uid).orderBy('createdAt', 'desc');
    const querySnapshot = await q.get();
    return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            name: data.name,
            size: data.size,
            createdAt: (data.createdAt as firebase.firestore.Timestamp).toMillis(),
        };
    });
};

export const uploadKnowledgeDocument = async (uid: string, file: File): Promise<void> => {
    if (!storage || !db) throw new Error("Firebase not configured.");
    const docId = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`; // Sanitize name
    const storageRef = storage.ref(`knowledge/${uid}/${docId}`);
    
    await storageRef.put(file);
    
    await getKnowledgeCollection(uid).doc(docId).set({
        name: file.name,
        size: file.size,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
};

export const deleteKnowledgeDocument = async (uid: string, document: KnowledgeDocument): Promise<void> => {
    if (!storage || !db) throw new Error("Firebase not configured.");
    const storageRef = storage.ref(`knowledge/${uid}/${document.id}`);
    await storageRef.delete();
    await getKnowledgeCollection(uid).doc(document.id).delete();
};

export const getKnowledgeDocumentContent = async (uid: string, docId: string): Promise<string> => {
    if (!storage) throw new Error("Firebase Storage not configured.");
    const storageRef = storage.ref(`knowledge/${uid}/${docId}`);
    const url = await storageRef.getDownloadURL();
    // Fetch the content from the URL. Note: this might require CORS configuration on your bucket.
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download document content: ${response.statusText}`);
    }
    // Simple text extraction. For complex files (.pdf, .docx), a more advanced server-side parser would be needed.
    return response.text();
};