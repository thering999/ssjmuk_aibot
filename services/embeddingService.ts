import { ai } from "./geminiService";

/**
 * Creates a vector embedding for a given text using a Gemini model.
 * @param text The text to create an embedding for.
 * @returns A promise that resolves to an array of numbers representing the vector.
 */
export const createEmbedding = async (text: string): Promise<number[]> => {
    try {
        const embeddingModel = "text-embedding-004";
        const response = await ai.models.embedContent({
            model: embeddingModel,
            contents: { parts: [{ text }] },
        });
        return response.embedding.values;
    } catch (error) {
        console.error("Error creating embedding:", error);
        throw new Error("Failed to create text embedding.");
    }
};

/**
 * Splits a long text into smaller chunks suitable for embedding.
 * This is a simple implementation that splits by paragraphs and then by size.
 * @param text The full text content.
 * @param chunkSize The approximate size of each chunk.
 * @param chunkOverlap The number of characters to overlap between chunks.
 * @returns An array of text chunks.
 */
export const chunkText = (text: string, chunkSize = 1000, chunkOverlap = 100): string[] => {
    if (text.length <= chunkSize) {
        return [text];
    }
    
    const chunks: string[] = [];
    let i = 0;
    while (i < text.length) {
        const end = Math.min(i + chunkSize, text.length);
        chunks.push(text.slice(i, end));
        i += chunkSize - chunkOverlap;
    }
    return chunks;
};


/**
 * Calculates the cosine similarity between two vectors.
 * @param vecA The first vector.
 * @param vecB The second vector.
 * @returns A number between -1 and 1 representing the similarity.
 */
export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
    if (vecA.length !== vecB.length) {
        return 0; // Vectors must be the same length
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    const magnitudeA = Math.sqrt(normA);
    const magnitudeB = Math.sqrt(normB);

    if (magnitudeA === 0 || magnitudeB === 0) {
        return 0; // Avoid division by zero
    }

    return dotProduct / (magnitudeA * magnitudeB);
};