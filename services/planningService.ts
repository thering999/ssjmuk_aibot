
import { Type, GenerateContentResponse } from "@google/genai";
import { ai } from "./geminiService";
import type { UserProfile, HealthPlan } from '../types';

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

const mealPlanSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        summary: { type: Type.STRING },
        type: { type: Type.STRING, enum: ['Meal'] },
        schedule: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    day: { type: Type.STRING },
                    breakfast: { type: Type.STRING },
                    lunch: { type: Type.STRING },
                    dinner: { type: Type.STRING },
                    snack: { type: Type.STRING },
                    totalCalories: { type: Type.NUMBER }
                },
                required: ["day", "breakfast", "lunch", "dinner", "snack", "totalCalories"]
            }
        }
    },
    required: ["title", "summary", "type", "schedule"]
};

const workoutPlanSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        summary: { type: Type.STRING },
        type: { type: Type.STRING, enum: ['Workout'] },
        schedule: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    day: { type: Type.STRING },
                    activity: { type: Type.STRING },
                    duration: { type: Type.STRING },
                    intensity: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
                    notes: { type: Type.STRING }
                },
                required: ["day", "activity", "duration", "intensity", "notes"]
            }
        }
    },
    required: ["title", "summary", "type", "schedule"]
};

export const generateMealPlan = async (userProfile: UserProfile | null, days: number = 3): Promise<HealthPlan> => {
    try {
        let context = "The user has no specific dietary restrictions.";
        if (userProfile) {
            context = `User Profile:\n- Allergies: ${userProfile.allergies?.join(', ') || 'None'}\n- Health Conditions: ${userProfile.medicalConditions?.join(', ') || 'None'}\n- Health Goals: ${userProfile.healthGoals?.join(', ') || 'General Health'}\n- Preferences: ${userProfile.preferences?.join(', ') || 'None'}`;
        }

        const prompt = `Generate a healthy, balanced ${days}-day meal plan for the following user. 
        ${context}
        Focus on local Thai/Isan ingredients if possible, but keep it balanced.
        Ensure it matches their health goals.
        Output purely in JSON format matching the schema.`;

        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: mealPlanSchema,
                temperature: 0.5,
                thinkingConfig: { thinkingBudget: 4096 }
            }
        });

        const jsonText = extractText(response).trim();
        const plan = JSON.parse(jsonText);
        
        return {
            ...plan,
            createdFor: userProfile?.name || 'User',
            generatedAt: Date.now()
        };

    } catch (error) {
        console.error("Error generating meal plan:", error);
        throw new Error("Failed to generate meal plan.");
    }
};

export const generateWorkoutPlan = async (userProfile: UserProfile | null, days: number = 3): Promise<HealthPlan> => {
    try {
        let context = "The user is a general adult.";
        if (userProfile) {
            context = `User Profile:\n- Health Conditions: ${userProfile.medicalConditions?.join(', ') || 'None'}\n- Health Goals: ${userProfile.healthGoals?.join(', ') || 'General Fitness'}\n- Interests: ${userProfile.interests?.join(', ') || 'None'}`;
        }

        const prompt = `Generate a safe and effective ${days}-day workout routine for the following user.
        ${context}
        Consider their limitations (medical conditions) if any.
        Include warm-up and cool-down in notes.
        Output purely in JSON format matching the schema.`;

        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: workoutPlanSchema,
                temperature: 0.5,
                thinkingConfig: { thinkingBudget: 4096 }
            }
        });

        const jsonText = extractText(response).trim();
        const plan = JSON.parse(jsonText);
        
        return {
            ...plan,
            createdFor: userProfile?.name || 'User',
            generatedAt: Date.now()
        };

    } catch (error) {
        console.error("Error generating workout plan:", error);
        throw new Error("Failed to generate workout plan.");
    }
};
