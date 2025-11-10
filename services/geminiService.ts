import { GoogleGenAI } from "@google/genai";

/**
 * ! SECURITY WARNING !
 * This approach initializes the Gemini API client directly on the client-side.
 * This will expose your API key in the browser's network requests.
 * For production applications, it is STRONGLY recommended to use a secure backend proxy
 * to handle API calls and protect your key. You have opted to create your own
 * deployment solution, so this direct client is provided for development and portability.
 */
// @google/genai-fix: Per guidelines, the API key must be obtained from `process.env.API_KEY`.
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("FATAL ERROR: Gemini API Key is not configured in the environment!");
}

// @google/genai-fix: Per guidelines, use `new GoogleGenAI({ apiKey: ... })`.
export const ai = new GoogleGenAI({ apiKey: API_KEY });
