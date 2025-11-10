import { ai } from "./geminiService";
import type { Geolocation, MapSearchResult, ChatMessageSource } from '../types';
import { GenerateContentResponse } from "@google/genai";

/**
 * Safely extracts text from a Gemini API response object.
 */
function extractText(response: GenerateContentResponse): string {
    // @google/genai-fix: Use the `.text` property for direct text access.
    return response.text;
}

interface GroundingChunk {
    web?: { uri: string; title: string; };
    maps?: { uri?: string; title?: string; placeAnswerSources?: { reviewSnippets?: { uri: string; title: string; }[]; }[]; };
}

const formatPlaces = (chunks: GroundingChunk[] | undefined): ChatMessageSource[] => {
    if (!chunks) return [];
    const places: ChatMessageSource[] = [];
    chunks.forEach(chunk => {
        if (chunk.maps) {
            if (chunk.maps.uri && chunk.maps.title) {
                places.push({ uri: chunk.maps.uri, title: chunk.maps.title });
            }
        }
    });
    // Remove duplicates
    return Array.from(new Map(places.map(item => [item.uri, item])).values());
};


export const searchPlaces = async (query: string, location: Geolocation): Promise<MapSearchResult> => {
    try {
        const prompt = `Based on the user's location, find relevant health-related places or information for the query: "${query}". Provide a helpful, conversational summary of the findings.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleMaps: {} }],
                temperature: 0.7,
                // @google/genai-fix: The 'toolConfig' property should be nested inside the 'config' object.
                toolConfig: {
                    retrievalConfig: {
                        latLng: {
                            latitude: location.latitude,
                            longitude: location.longitude
                        }
                    }
                }
            },
        });
        
        const summary = extractText(response);
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] | undefined;
        const places = formatPlaces(groundingChunks);

        return { summary, places };

    } catch (error) {
        console.error("Error searching places with Gemini:", error);
        throw new Error("Failed to search for places using the AI model.");
    }
};