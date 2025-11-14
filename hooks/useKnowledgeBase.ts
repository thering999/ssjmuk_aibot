
import { useState, useEffect, useCallback } from 'react';
import { User } from '../services/firebase';
import { KnowledgeDocument } from '../types';
import { 
    getKnowledgeDocuments, 
    uploadKnowledgeDocument, 
    deleteKnowledgeDocument,
    finalizeKnowledgeDocumentMetadata
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
            
            const newDoc: KnowledgeDocument = {
                id: docId,
                name: file.name,
                size: file.size,
                createdAt: Date.now(),
            };
            setDocuments(prev => [newDoc, ...prev]);

            const processedFiles = await processFiles([file], SUPPORTED_GENERATE_CONTENT_MIME_TYPES, () => {});
            const textContent = processedFiles[0]?.textContent;
            
            if (!textContent) {
                throw new Error("Could not extract text content from the document.");
            }

            await uploadKnowledgeDocument(user.uid, docId, textContent);
            
            await finalizeKnowledgeDocumentMetadata(user.uid, docId, {
                name: file.name,
                size: file.size,
            });

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
        const originalDocuments = documents;
        setDocuments(prev => prev.filter(d => d.id !== doc.id));
        try {
            await deleteKnowledgeDocument(user.uid, doc);
        } catch (e: any) {
            setError("Failed to delete document. Please refresh.");
            console.error(e);
            setDocuments(originalDocuments);
        }
    };

    return { documents, isLoading, error, uploadDocument, deleteDocument };
};
