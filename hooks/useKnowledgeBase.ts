import { useState, useEffect, useCallback } from 'react';
import { User } from '../services/firebase';
import { KnowledgeDocument } from '../types';
import { 
    getKnowledgeDocuments, 
    uploadKnowledgeDocument, 
    deleteKnowledgeDocument 
} from '../services/firebase';

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
            await uploadKnowledgeDocument(user.uid, file);
            await refreshDocuments(); // Refresh list after upload
        } catch (e: any) {
            setError("Failed to upload document.");
            console.error(e);
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
