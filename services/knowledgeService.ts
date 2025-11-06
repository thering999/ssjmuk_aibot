import { User } from './firebase';
import { getKnowledgeDocuments, getKnowledgeDocumentContent } from './firebase';

/**
 * Searches the user's uploaded knowledge base documents for content matching the query.
 * This is a basic implementation; a more advanced version would use vector embeddings.
 * @param query The user's search query.
 * @param user The authenticated user object.
 * @returns A string containing the content of matched articles, or null if no match is found.
 */
export const searchKnowledgeBase = async (query: string, user: User | null): Promise<string | null> => {
  if (!user) {
    return null; // No user, no knowledge base to search.
  }

  const lowerCaseQuery = query.toLowerCase();
  
  try {
    const documents = await getKnowledgeDocuments(user.uid);
    if (documents.length === 0) {
      return null;
    }

    // This could be slow for many/large documents. We process them in parallel.
    const searchPromises = documents.map(async (doc) => {
      try {
        const content = await getKnowledgeDocumentContent(user.uid, doc.id);
        // Perform a simple case-insensitive search on the document content.
        if (content.toLowerCase().includes(lowerCaseQuery)) {
          return { title: doc.name, content };
        }
      } catch(e) {
        console.error(`Failed to read content of document: ${doc.name}`, e);
      }
      return null;
    });

    const results = await Promise.all(searchPromises);
    const matchedArticles = results.filter(r => r !== null) as { title: string, content: string }[];

    if (matchedArticles.length === 0) {
      return null;
    }
    
    // Combine the content of all matched articles to provide comprehensive context.
    const context = matchedArticles.map(article => 
      `--- Document: ${article.title} ---\n${article.content}`
    ).join('\n\n');
    
    console.log(`[Knowledge Service] Found context for query "${query}"`);

    return context;

  } catch (error) {
    console.error("Error searching knowledge base:", error);
    return null; // Don't block the chat if knowledge search fails.
  }
};