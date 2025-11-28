
import { ai } from "./geminiService";
import { Type, GenerateContentResponse } from "@google/genai";
import { getMealLogs, getMoodLogs, getSleepLogs } from "./firebase";
import type { User } from "./firebase";
import type { MealLog, MoodLog, SleepLog, HealthInsight } from "../types";

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

const insightSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            type: { type: Type.STRING, enum: ['Correlation', 'Prediction', 'Anomaly'] },
            title: { type: Type.STRING, description: "Short, catchy title" },
            description: { type: Type.STRING, description: "The core finding, e.g. 'Your mood drops when sleep is under 6 hours'." },
            confidence: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
            relatedMetrics: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendation: { type: Type.STRING, description: "Actionable advice based on the finding." }
        },
        required: ["type", "title", "description", "confidence", "relatedMetrics", "recommendation"]
    }
};

export const generateHealthInsights = async (user: User | null): Promise<HealthInsight[]> => {
    if (!user) return [];

    try {
        // 1. Fetch data from different sources
        const [meals, moods, sleeps] = await Promise.all([
            getMealLogs(user.uid),
            getMoodLogs(user.uid),
            getSleepLogs(user.uid)
        ]);

        if (meals.length === 0 && moods.length === 0 && sleeps.length === 0) {
            return [];
        }

        // 2. Prepare data summary for AI (limit to recent entries to save tokens)
        const summaryData = {
            recentMeals: meals.slice(0, 10).map(m => ({ name: m.name, calories: m.calories, healthScore: m.healthScore, date: new Date(m.timestamp).toDateString() })),
            recentMoods: moods.slice(0, 10).map(m => ({ mood: m.mood, note: m.note, date: new Date(m.timestamp).toDateString() })),
            recentSleeps: sleeps.slice(0, 7).map(s => ({ duration: s.durationHours, quality: s.quality, date: new Date(s.timestamp).toDateString() }))
        };

        // 3. Prompt Gemini to find patterns
        const prompt = `Analyze the following user health data logs (Nutrition, Mood, Sleep). 
        Look for correlations, patterns, or anomalies across these different metrics.
        
        Examples of what to look for:
        - Does poor sleep quality correlate with 'Stressed' mood the next day?
        - Does high calorie intake correlate with 'Low' mood?
        - Are there positive streaks?
        
        Return 1-3 insights in JSON format using the specified schema.
        
        Data:
        ${JSON.stringify(summaryData, null, 2)}`;

        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: insightSchema,
                temperature: 0.4,
                thinkingConfig: { thinkingBudget: 2048 } // Use reasoning for deeper insights
            }
        });

        const jsonText = extractText(response).trim();
        return JSON.parse(jsonText) as HealthInsight[];

    } catch (error) {
        console.error("Error generating insights:", error);
        return [];
    }
};
