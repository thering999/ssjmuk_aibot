import type { Geolocation, EmergencyResult } from '../types';
import { ai } from './geminiService';
import { GenerateContentResponse } from '@google/genai';

/**
 * Safely extracts text from a Gemini API response object.
 */
function extractText(response: GenerateContentResponse): string {
    // @google/genai-fix: Use the `.text` property for direct text access.
    return response.text;
}

/**
 * Finds the nearest hospital with an emergency room using Gemini with Google Maps grounding via the secure proxy.
 * @param location The user's current geolocation.
 * @returns A promise that resolves to an EmergencyResult object or null if not found.
 */
export const findNearestEmergencyRoom = async (location: Geolocation): Promise<EmergencyResult | null> => {
  try {
    const prompt = `Based on the user's location, find the single closest hospital or medical facility with an emergency room available 24/7. Respond with ONLY the name of the facility on the first line, and its full address on the second line. Do not add any other text, labels, or formatting.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
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

    const text = extractText(response).trim();
    if (text) {
        const lines = text.split('\n');
        if (lines.length >= 2) {
            return {
                name: lines[0].trim(),
                address: lines.slice(1).join(' ').trim(),
            };
        } else if (lines.length === 1) {
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