import { ai } from "./geminiService";
import type { HealthHubArticle } from '../types';
import { GenerateContentResponse } from "@google/genai";

/**
 * Safely extracts text from a Gemini API response object.
 */
function extractText(response: GenerateContentResponse): string {
    // @google/genai-fix: Use the `.text` property for direct text access.
    return response.text;
}


export const fetchHealthNews = async (): Promise<HealthHubArticle[]> => {
    try {
        const prompt = `Please act as a public health journalist for Mukdahan, Thailand.
Use Google Search to find 3-5 of the most recent and important public health news, announcements, or alerts relevant to the people of Thailand, with a preference for news specifically about Mukdahan province if available.
Focus on topics like disease outbreaks (e.g., dengue fever, influenza), vaccination campaigns, air quality warnings (PM2.5), and official announcements from the Ministry of Public Health.
For each finding, create a concise summary in simple language.
Your response MUST be a single JSON object wrapped in a markdown code block (e.g. \`\`\`json ... \`\`\`). The JSON object must have a single key "articles" which is an array of objects. Each object must have the following keys: "category" (one of: 'Alert', 'Campaign', 'News', 'Tip'), "title", "summary", and "source" (the original URL).`;
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                temperature: 0.5,
                thinkingConfig: { thinkingBudget: 8192 }
            },
        });
        
        let jsonText = extractText(response).trim();

        const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
            jsonText = jsonMatch[1];
        }

        const result = JSON.parse(jsonText);

        if (result && Array.isArray(result.articles)) {
            return result.articles.map((article: any) => ({
                ...article,
                category: ['Alert', 'Campaign', 'News', 'Tip'].includes(article.category) ? article.category : 'News',
            }));
        }

        console.warn("Health Hub: AI response did not match expected format.", result);
        return [];

    } catch (error) {
        console.error("Error fetching health news:", error);
        throw new Error("Failed to fetch health news from the AI model.");
    }
};