
import { Type } from "@google/genai";
import { ai } from "./geminiService";
import type { AttachedFile, HealthReportAnalysis } from '../types';

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        summary: {
            type: Type.STRING,
            description: "A brief, one or two-sentence overall summary of the lab results. Mention if results are generally normal or if there are notable findings."
        },
        keyFindings: {
            type: Type.ARRAY,
            description: "An array of only the metrics that are outside the normal range (High or Low). If all are normal, this array should be empty.",
            items: {
                type: Type.OBJECT,
                properties: {
                    metric: { type: Type.STRING, description: "The name of the test/metric (e.g., 'Hemoglobin', 'Glucose')." },
                    value: { type: Type.STRING, description: "The patient's result value (e.g., '14.5', '98')." },
                    unit: { type: Type.STRING, description: "The unit of measurement (e.g., 'g/dL', 'mg/dL')." },
                    range: { type: Type.STRING, description: "The normal reference range (e.g., '13.5-17.5')." },
                    status: { type: Type.STRING, description: "The status of the result, must be one of: 'High', 'Low'." },
                    explanation: { type: Type.STRING, description: "A simple, one-sentence explanation of what this metric measures and why a high/low value is significant." }
                }
            }
        },
        detailedResults: {
            type: Type.ARRAY,
            description: "A comprehensive array of all metrics identified in the report, including those within the normal range.",
            items: {
                type: Type.OBJECT,
                properties: {
                    metric: { type: Type.STRING, description: "The name of the test/metric." },
                    value: { type: Type.STRING, description: "The patient's result value." },
                    unit: { type: Type.STRING, description: "The unit of measurement." },
                    range: { type: Type.STRING, description: "The normal reference range. If not available, use 'N/A'." },
                    status: { type: Type.STRING, description: "The status of the result, must be one of: 'Normal', 'High', 'Low', 'Abnormal', 'Unavailable'." },
                    explanation: { type: Type.STRING, description: "A simple, one or two-sentence explanation in layman's terms of what this metric is for." }
                }
            }
        }
    }
};

export const analyzeHealthReport = async (file: AttachedFile): Promise<HealthReportAnalysis> => {
    try {
        const systemInstruction = `You are a helpful AI assistant designed to analyze medical lab reports. Your task is to extract information from an image of a report, structure it into a specific JSON format, and explain medical terms in simple, easy-to-understand language.

IMPORTANT: You are not a medical professional. Do NOT provide any diagnosis, medical advice, or treatment recommendations. Your response must be purely informational. Always begin your summary with a disclaimer stating this fact. Adhere strictly to the provided JSON schema.`;
        
        const prompt = "Please analyze the provided image of a lab report and return the data in the specified JSON format.";

        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: {
                parts: [
                    { inlineData: { data: file.base64, mimeType: file.mimeType } },
                    { text: prompt }
                ]
            },
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.2 // Lower temperature for more factual, less creative output
            }
        });

        const jsonText = ((response.candidates?.[0]?.content?.parts || []).map(p => p.text).filter(Boolean).join('')).trim();
        const result = JSON.parse(jsonText) as HealthReportAnalysis;
        
        // Prepend the disclaimer to the summary if the model forgets
        const disclaimer = "Disclaimer: This is an AI-generated summary for informational purposes only and is not medical advice. Please consult a healthcare professional.";
        if (!result.summary.toLowerCase().includes("disclaimer")) {
            result.summary = `${disclaimer} ${result.summary}`;
        }
        
        return result;

    } catch (error) {
        console.error("Error analyzing health report:", error);
        // Re-throw to be handled by the UI component
        throw new Error("Failed to analyze the health report. The AI model could not process the request.");
    }
};