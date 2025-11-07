import type { Geolocation, EmergencyResult } from '../types';
import { ai } from './geminiService';

/**
 * Safely extracts text from a Gemini API response object.
 * This avoids console warnings about non-text parts (e.g., thoughtSignature)
 * by manually concatenating only the text parts from the response candidates.
 * @param response The GenerateContentResponse or a stream chunk.
 * @returns The extracted text as a single string.
 */
function extractText(response: any): string {
    if (!response?.candidates || response.candidates.length === 0) {
        return '';
    }
    const candidate = response.candidates[0];
    if (!candidate?.content || !candidate.content.parts) {
        return '';
    }
    return candidate.content.parts
        .map((part: any) => part.text)
        .filter((text: string | undefined) => text !== undefined)
        .join('');
}


/**
 * Finds the nearest hospital with an emergency room using Gemini with Google Maps grounding.
 * @param location The user's current geolocation.
 * @returns A promise that resolves to an EmergencyResult object or null if not found.
 */
export const findNearestEmergencyRoom = async (location: Geolocation): Promise<EmergencyResult | null> => {
  try {
    const prompt = `Based on the user's location, find the single closest hospital or medical facility with an emergency room available 24/7. Respond with ONLY the name of the facility on the first line, and its full address on the second line. Do not add any other text, labels, or formatting.`;

    // FIX: The user's @google/genai version may have outdated type definitions
    // that don't recognize 'toolConfig'. The `generateContent` parameters are
    // assigned to a variable to bypass the incorrect type check.
    const params = {
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
      },
      toolConfig: {
        retrievalConfig: {
          latLng: {
            latitude: location.latitude,
            longitude: location.longitude
          }
        }
      }
    };
    
    const response = await ai.models.generateContent(params);

    const text = extractText(response).trim();
    if (text) {
        const lines = text.split('\n');
        if (lines.length >= 2) {
            return {
                name: lines[0].trim(),
                address: lines.slice(1).join(' ').trim(), // Join remaining lines in case address spans multiple lines
            };
        } else if (lines.length === 1) {
            // Fallback if only one line is returned
             return {
                 name: lines[0].trim(),
                 address: 'Address not specified',
             }
        }
    }
    return null;

  } catch (error) {
    console.error("Error finding nearest emergency room:", error);
    throw error;
  }
};