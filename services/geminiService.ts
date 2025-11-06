import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

// Log an error if the key is missing, but don't crash the app.
// The app should handle API call failures gracefully.
if (!API_KEY) {
  console.error("API_KEY environment variable not set. AI features will not work.");
}

// This singleton instance can be used by most services.
// The '!' is used because we've checked and logged, and we'll let API calls fail
// if the key is indeed missing, which will be handled by the UI.
export const ai = new GoogleGenAI({ apiKey: API_KEY! });

/**
 * Creates a new GoogleGenAI client instance.
 * This is used by services like video generation that require ensuring the
 * very latest API key from the environment is used for each request,
 * particularly after user interaction with an API key selector dialog.
 */
export const getAiClient = (): GoogleGenAI => {
    // Re-read from process.env to get the latest value.
    const currentApiKey = process.env.API_KEY;
    if (!currentApiKey) {
      console.error("API_KEY is not available for new client instance.");
    }
    return new GoogleGenAI({ apiKey: currentApiKey! });
};
