
import { Type, GenerateContentResponse } from "@google/genai";
import { ai } from "./geminiService";
import type { AttachedFile, MealLog } from '../types';

/**
 * Safely extracts and concatenates text from a Gemini API response object.
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

const mealSchema = {
    type: Type.OBJECT,
    properties: {
        foodName: { type: Type.STRING, description: "The name of the dish or food item identified." },
        calories: { type: Type.NUMBER, description: "Estimated total calories (kcal)." },
        protein: { type: Type.NUMBER, description: "Estimated protein in grams." },
        carbs: { type: Type.NUMBER, description: "Estimated carbohydrates in grams." },
        fat: { type: Type.NUMBER, description: "Estimated fat in grams." },
        healthScore: { type: Type.NUMBER, description: "A score from 1 to 10 indicating how healthy this meal is (10 being healthiest)." },
        advice: { type: Type.STRING, description: "Brief nutritional advice or comment about this meal." }
    },
    required: ["foodName", "calories", "protein", "carbs", "fat", "healthScore", "advice"]
};

export const analyzeMeal = async (input: AttachedFile | string): Promise<Omit<MealLog, 'id' | 'userId' | 'timestamp'>> => {
    try {
        const systemInstruction = `You are an expert nutritionist AI. Analyze the provided food image or description.
        Estimate the nutritional content as accurately as possible. If specific portion sizes aren't provided, assume standard serving sizes.
        Be encouraging but honest about the health value. Return the data strictly in JSON format.`;

        const parts = [];
        if (typeof input === 'string') {
            parts.push({ text: `Analyze this meal description: "${input}"` });
        } else {
             parts.push({ inlineData: { data: input.base64!, mimeType: input.mimeType } });
             parts.push({ text: "Analyze this food image." });
        }

        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview", // Upgrade to Gemini 3 Pro for better visual recognition
            contents: { parts },
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: mealSchema,
                temperature: 0.3,
            }
        });

        const jsonText = extractText(response).trim();
        const parsed = JSON.parse(jsonText);

        return {
            name: parsed.foodName,
            calories: parsed.calories,
            protein: parsed.protein,
            carbs: parsed.carbs,
            fat: parsed.fat,
            healthScore: parsed.healthScore,
            analysis: parsed.advice,
            imageUrl: typeof input !== 'string' ? `data:${input.mimeType};base64,${input.base64}` : undefined
        };

    } catch (error) {
        console.error("Error analyzing meal:", error);
        throw new Error("Failed to analyze the meal. Please try again.");
    }
};
