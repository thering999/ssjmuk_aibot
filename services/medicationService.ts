
import { Type, GenerateContentResponse } from "@google/genai";
import { ai } from "./geminiService";
import type { AttachedFile, DrugAnalysis, UserProfile } from '../types';

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

const drugSchema = {
    type: Type.OBJECT,
    properties: {
        drugName: { type: Type.STRING, description: "The brand name of the medication, or generic name if no brand is visible." },
        genericName: { type: Type.STRING, description: "The active ingredient/generic name." },
        indication: { type: Type.STRING, description: "A simple explanation of what this medication treats." },
        dosageInstruction: { type: Type.STRING, description: "General dosage instructions found on the label or standard usage (e.g., 'Take 1 tablet after meals')." },
        commonSideEffects: { 
            type: Type.ARRAY, 
            description: "List of 2-3 common side effects.",
            items: { type: Type.STRING } 
        },
        warnings: {
            type: Type.ARRAY,
            description: "Important warnings (e.g., 'Drowsiness', 'Do not take with alcohol').",
            items: { type: Type.STRING }
        },
        safetyCheck: {
            type: Type.OBJECT,
            properties: {
                safe: { type: Type.BOOLEAN, description: "True if safe based on user profile, False if there is a potential conflict." },
                warningMessage: { type: Type.STRING, description: "If not safe, explain why (e.g., 'Contains Penicillin which matches your allergy')." }
            },
            required: ["safe"]
        }
    },
    required: ["drugName", "genericName", "indication", "dosageInstruction", "commonSideEffects", "warnings", "safetyCheck"]
};

export const identifyMedication = async (file: AttachedFile, userProfile: UserProfile | null): Promise<DrugAnalysis> => {
    if (!file.base64) {
        throw new Error("File content is missing.");
    }

    try {
        let profileContext = "The user has no known allergies or medical conditions.";
        if (userProfile) {
            const allergies = userProfile.allergies?.join(", ") || "None";
            const conditions = userProfile.medicalConditions?.join(", ") || "None";
            const currentMeds = userProfile.medications?.join(", ") || "None";
            profileContext = `User Profile for Safety Check:\n- Allergies: ${allergies}\n- Medical Conditions: ${conditions}\n- Currently taking: ${currentMeds}`;
        }

        const prompt = `Analyze this image of a medication. Identify the drug.
        ${profileContext}
        
        Perform a safety check:
        1. Does the identified drug conflict with the user's allergies?
        2. Is it contraindicated for their medical conditions?
        3. Are there known interactions with their current medications?
        
        Provide the analysis in JSON format. Translate medical terms to simple, easy-to-understand language.`;

        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview", // Upgrade to Gemini 3 Pro for drug safety accuracy
            contents: {
                parts: [
                    { inlineData: { data: file.base64, mimeType: file.mimeType } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: drugSchema,
                temperature: 0.1,
                thinkingConfig: { thinkingBudget: 4096 }
            }
        });

        const text = extractText(response).trim();
        return JSON.parse(text) as DrugAnalysis;

    } catch (error) {
        console.error("Error identifying medication:", error);
        throw new Error("Failed to identify the medication. Please try again with a clearer image.");
    }
};
