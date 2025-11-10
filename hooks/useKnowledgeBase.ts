import { useState, useEffect, useCallback } from 'react';
import { User } from '../services/firebase';
import { KnowledgeDocument } from '../types';
import { 
    getKnowledgeDocuments, 
    uploadKnowledgeDocument, 
    deleteKnowledgeDocument 
} from '../services/firebase';
import { fileToText } from '../utils/fileUtils';
import { processFiles, SUPPORTED_GENERATE_CONTENT_MIME_TYPES } from '../utils/fileUtils';


export const useKnowledgeBase = (user: User | null) => {
    const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refreshDocuments = useCallback(async () => {
        if (!user) {
            setDocuments([]);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const docs = await getKnowledgeDocuments(user.uid);
            setDocuments(docs);
        } catch (e: any) {
            setError("Failed to load documents.");
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        refreshDocuments();
    }, [refreshDocuments]);

    const uploadDocument = async (file: File) => {
        if (!user) throw new Error("User not logged in");
        setIsLoading(true);
        try {
            const docId = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            
            // 1. Save metadata to Firestore first to get an immediate UI update
            const newDoc: KnowledgeDocument = {
                id: docId,
                name: file.name,
                size: file.size,
                createdAt: Date.now(),
            };
            setDocuments(prev => [newDoc, ...prev]);

            // 2. Process the file to get its text content
            const processedFiles = await processFiles([file], SUPPORTED_GENERATE_CONTENT_MIME_TYPES, () => {});
            const textContent = processedFiles[0]?.textContent;
            
            if (!textContent) {
                throw new Error("Could not extract text content from the document.");
            }

            // 3. Upload chunks and embeddings in the background
            await uploadKnowledgeDocument(user.uid, docId, textContent);
            
            // 4. Finalize the metadata in Firestore
            await getKnowledgeCollection(user.uid).doc(docId).set({
                name: file.name,
                size: file.size,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });

            // Optional: Refresh the list to get the server timestamp
            await refreshDocuments();

        } catch (e: any) {
            setError("Failed to upload document.");
            console.error(e);
            await refreshDocuments(); // Revert optimistic update on failure
            throw e; // Re-throw to be caught by the component
        } finally {
            setIsLoading(false);
        }
    };

    const deleteDocument = async (doc: KnowledgeDocument) => {
        if (!user) return;
        // Optimistic UI update
        const originalDocuments = documents;
        setDocuments(prev => prev.filter(d => d.id !== doc.id));
        try {
            await deleteKnowledgeDocument(user.uid, doc);
        } catch (e: any) {
            setError("Failed to delete document. Please refresh.");
            console.error(e);
            // Revert on failure
            setDocuments(originalDocuments);
        }
    };

    return { documents, isLoading, error, uploadDocument, deleteDocument };
};

// Helper to get the collection reference, assuming it's also needed here.
// This might be better placed in firebase.ts if it's used more broadly.
const getKnowledgeCollection = (uid: string) => {
    const db = firebase.firestore();
    return db.collection('users').doc(uid).collection('knowledge');
};
// Add firebase import if not already present
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';