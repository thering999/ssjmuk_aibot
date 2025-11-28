
import { ai } from "./geminiService";
import type { MoodType, SleepLog } from '../types';
import { GenerateContentResponse } from "@google/genai";

/**
 * Safely extracts text from a Gemini API response.
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

export const analyzeMood = async (mood: MoodType, note: string): Promise<string> => {
    try {
        const prompt = `The user is feeling "${mood}" today.
        ${note ? `They added this note: "${note}"` : ''}
        
        Act as a supportive, empathetic, and wise mental wellness companion (not a doctor).
        1. Validate their feelings briefly.
        2. If the mood is positive, celebrate it.
        3. If the mood is negative (Low, Stressed, Anxious), offer a specific, short, and actionable coping strategy (e.g., a breathing technique, a perspective shift, or a small self-care act).
        4. Keep the response warm, encouraging, and concise (under 100 words).`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                temperature: 0.7,
            }
        });

        return extractText(response).trim();

    } catch (error) {
        console.error("Error analyzing mood:", error);
        throw new Error("Could not generate a wellness response.");
    }
};

export const analyzeSleep = async (log: Omit<SleepLog, 'id' | 'userId' | 'timestamp' | 'aiAnalysis'>): Promise<string> => {
    try {
        const prompt = `Analyze the following sleep record:
        Bedtime: ${log.bedtime}
        Wake time: ${log.waketime}
        Duration: ${log.durationHours.toFixed(1)} hours
        Quality: ${log.quality}
        ${log.notes ? `Notes: ${log.notes}` : ''}

        Provide 2-3 short, actionable "Sleep Hygiene" tips to improve their sleep quality or maintain their good streak. 
        Tone: Friendly and scientific.
        Length: Keep it under 80 words.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ parts: [{ text: prompt }] }],
            config: { temperature: 0.6 }
        });

        return extractText(response).trim();
    } catch (error) {
        console.error("Error analyzing sleep:", error);
        return "Remember, consistent sleep schedules are key to good health!";
    }
};
