import { User } from './firebase';
import { getKnowledgeDocuments, getKnowledgeVectorsForUser } from './firebase';
import { createEmbedding, cosineSimilarity } from './embeddingService';


/**
 * Searches the user's knowledge base using vector similarity.
 * @param query The user's search query.
 * @param user The authenticated user object.
 * @returns A string containing the content of the most relevant document chunks, or null if no match is found.
 */
export const searchKnowledgeBase = async (query: string, user: User | null): Promise<string | null> => {
  if (!user) {
    return null; // No user, no knowledge base to search.
  }
  
  try {
    const allVectors = await getKnowledgeVectorsForUser(user.uid);
    if (allVectors.length === 0) {
      return null;
    }
    
    // 1. Create an embedding for the user's query
    const queryEmbedding = await createEmbedding(query);

    // 2. Calculate similarity for all stored vectors
    const rankedChunks = allVectors.map(chunk => ({
        ...chunk,
        similarity: cosineSimilarity(queryEmbedding, chunk.embedding)
    }));
    
    // 3. Sort by similarity and filter out irrelevant results
    const sortedChunks = rankedChunks.sort((a, b) => b.similarity - a.similarity);
    const SIMILARITY_THRESHOLD = 0.75;
    const MAX_CONTEXT_CHUNKS = 3;

    const relevantChunks = sortedChunks
        .filter(chunk => chunk.similarity > SIMILARITY_THRESHOLD)
        .slice(0, MAX_CONTEXT_CHUNKS);
    
    if (relevantChunks.length === 0) {
      console.log(`[Knowledge Service] No relevant chunks found for query "${query}" above threshold ${SIMILARITY_THRESHOLD}`);
      return null;
    }
    
    // 4. Combine the text of the most relevant chunks to create context
    const context = relevantChunks.map(chunk => 
      `--- Relevant Document Snippet (Similarity: ${chunk.similarity.toFixed(2)}) ---\n${chunk.text}`
    ).join('\n\n');
    
    console.log(`[Knowledge Service] Found ${relevantChunks.length} relevant chunks for query "${query}"`);

    return context;

  } catch (error) {
    console.error("Error searching knowledge base with embeddings:", error);
    return null; // Don't block the chat if knowledge search fails.
  }
};