// @google/genai-fix: Refactored to use Firebase v9 compat API to resolve type errors with v8 syntax.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';

import type { Conversation, KnowledgeDocument } from '../types';
import { chunkText, createEmbedding } from './embeddingService';

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
if (auth) {
  // Explicitly set persistence to 'local' (localStorage) to avoid environment issues.
  // This helps signInWithPopup work correctly in restricted environments like iframes.
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .catch((error) => {
      console.error("Firebase: Could not set auth persistence.", error);
    });
}
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

export const uploadKnowledgeDocument = async (uid: string, docId: string, textContent: string): Promise<void> => {
    if (!db) throw new Error("Firebase not configured.");
    
    // 1. Chunk the text content
    const chunks = chunkText(textContent);
    
    // 2. Create an embedding for each chunk
    const chunkPromises = chunks.map(async (text, index) => {
        const embedding = await createEmbedding(text);
        return { text, embedding, chunkIndex: index };
    });
    
    const chunksWithEmbeddings = await Promise.all(chunkPromises);
    
    // 3. Save chunks and their embeddings to a subcollection in Firestore
    const knowledgeDocRef = getKnowledgeCollection(uid).doc(docId);
    const chunksCollectionRef = knowledgeDocRef.collection('chunks');
    
    const batch = db.batch();
    chunksWithEmbeddings.forEach((chunkData, index) => {
        const chunkDocRef = chunksCollectionRef.doc(String(index));
        batch.set(chunkDocRef, {
            text: chunkData.text,
            embedding: chunkData.embedding,
        });
    });
    
    await batch.commit();
};

export const deleteKnowledgeDocument = async (uid: string, document: KnowledgeDocument): Promise<void> => {
    if (!db) throw new Error("Firebase not configured.");

    const knowledgeDocRef = getKnowledgeCollection(uid).doc(document.id);
    const chunksCollectionRef = knowledgeDocRef.collection('chunks');
    
    // Delete all chunk subdocuments
    const querySnapshot = await chunksCollectionRef.get();
    const batch = db.batch();
    querySnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    // Delete the main document entry
    await knowledgeDocRef.delete();
};

// This function is no longer used for search but kept for potential direct content viewing.
export const getKnowledgeDocumentContent = async (uid: string, docId: string): Promise<string> => {
    if (!storage) throw new Error("Firebase Storage not configured.");
    const storageRef = storage.ref(`knowledge/${uid}/${docId}`);
    const url = await storageRef.getDownloadURL();
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download document content: ${response.statusText}`);
    }
    return response.text();
};

export const getKnowledgeVectorsForUser = async (uid: string): Promise<{ docId: string, chunkId: string, text: string, embedding: number[] }[]> => {
    const knowledgeCol = getKnowledgeCollection(uid);
    const docsSnapshot = await knowledgeCol.get();
    
    const allVectors: { docId: string, chunkId: string, text: string, embedding: number[] }[] = [];
    
    for (const doc of docsSnapshot.docs) {
        const chunksSnapshot = await doc.ref.collection('chunks').get();
        chunksSnapshot.forEach(chunkDoc => {
            const data = chunkDoc.data();
            allVectors.push({
                docId: doc.id,
                chunkId: chunkDoc.id,
                text: data.text,
                embedding: data.embedding
            });
        });
    }
    
    return allVectors;
};