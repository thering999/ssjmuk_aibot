
import { ai } from "./geminiService";
import type { HealthRecord } from '../types';
import { GenerateContentResponse } from "@google/genai";

export { 
  getHealthRecords, 
  saveHealthRecord, 
  deleteHealthRecord,
  getMealLogs,
  getMoodLogs,
  getAppointments,
  deleteAppointment
} from './firebase';

/**
 * Safely extracts and concatenates text from a Gemini API response object,
 * avoiding the `.text` getter to prevent console warnings about non-text parts.
 */
function extractText(response: GenerateContentResponse): string {
    let text = '';
    if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        if (candidate.content && candidate.content.parts) {
            for (const part of candidate.content.parts) {
                if (part.text) {
                    text += part.text;
                }
            }
        }
    }
    return text;
}

export const getAIHealthSummary = async (records: HealthRecord[]): Promise<string> => {
    if (records.length === 0) return "";
    
    // Use the latest 5 records for a better trend analysis
    const recordsToSummarize = records.slice(0, 5);

    const prompt = `Given the following JSON array of a user's health records, sorted from most recent to oldest, please act as a helpful health assistant. Provide a concise, encouraging, and easy-to-understand 2-3 sentence summary of their overall health trends. 
    - Address the user directly ('You'/'Your').
    - Highlight positive changes or areas of stability.
    - Gently mention any metrics that might need attention without causing alarm.
    - DO NOT provide medical advice or specific treatment suggestions.
    - The goal is to give a high-level overview of their health journey based on the data.
    
Example response: "Looking at your recent reports, your glucose levels have shown a positive downward trend, which is great to see! Your cholesterol has remained stable. It might be helpful to keep an eye on your blood pressure in your next check-up. Keep up the great work on your health journey!"

Health Records:
${JSON.stringify(recordsToSummarize, null, 2)}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: [{ parts: [{ text: prompt }] }],
            config: { temperature: 0.5 }
        });
        
        const summaryText = extractText(response);
        return summaryText || "Could not generate a summary at this time.";

    } catch (error) {
        console.error("Error fetching AI health summary:", error);
        throw new Error("Could not generate an AI health summary.");
    }
};