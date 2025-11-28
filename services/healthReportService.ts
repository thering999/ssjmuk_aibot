
import { Type, GenerateContentResponse } from "@google/genai";
import { ai } from "./geminiService";
import type { AttachedFile, HealthReportAnalysis } from '../types';

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

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        reportType: { type: Type.STRING, description: "The specific medical type of the report (e.g., 'Complete Blood Count (CBC)', 'Lipid Profile', 'Liver Function Test', 'Urinalysis'). If it is not a recognizable medical report, return 'Unknown Document'." },
        summary: { type: Type.STRING, description: "A brief, one or two-sentence overall summary of the results. Mention if results are generally normal or if there are specific areas of concern." },
        keyFindings: {
            type: Type.ARRAY, description: "An array of ONLY the metrics that are outside the normal range (High, Low, or Abnormal). If all metrics are normal, this array should be empty.",
            items: {
                type: Type.OBJECT,
                properties: {
                    metric: { type: Type.STRING, description: "The name of the test/metric (e.g., 'Hemoglobin', 'Glucose')." },
                    value: { type: Type.STRING, description: "The patient's result value." },
                    unit: { type: Type.STRING, description: "The unit of measurement." },
                    range: { type: Type.STRING, description: "The reference range." },
                    status: { type: Type.STRING, description: "The status: 'High', 'Low', or 'Abnormal'." },
                    explanation: { type: Type.STRING, description: "A simple, one-sentence explanation of why this specific result might be high or low and what it could indicate." }
                }
            }
        },
        detailedResults: {
            type: Type.ARRAY, description: "A comprehensive array of all metrics identified in the report, including normal ones.",
            items: {
                type: Type.OBJECT,
                properties: {
                    metric: { type: Type.STRING, description: "The name of the test/metric." },
                    value: { type: Type.STRING, description: "The patient's result value." },
                    unit: { type: Type.STRING, description: "The unit of measurement." },
                    range: { type: Type.STRING, description: "The reference range. Use 'N/A' if not visible." },
                    status: { type: Type.STRING, description: "The status: 'Normal', 'High', 'Low', 'Abnormal', 'Unavailable'." },
                    explanation: { type: Type.STRING, description: "A simple explanation of what this test measures." }
                }
            }
        },
        lifestyleTips: {
            type: Type.ARRAY,
            description: "A list of 3-5 actionable lifestyle, diet, or habit tips based specifically on the abnormal results found. If all results are normal, provide general wellness advice. Do not prescribe medication.",
            items: { type: Type.STRING }
        }
    },
    required: ["reportType", "summary", "keyFindings", "detailedResults", "lifestyleTips"]
};

export const analyzeHealthReport = async (file: AttachedFile): Promise<HealthReportAnalysis> => {
    if (!file.base64) {
        throw new Error("File content is missing.");
    }

    try {
        const prompt = "Analyze this image of a medical laboratory report. Identify the type of report. Extract all data accurately. For any abnormal results, provide specific explanations and actionable lifestyle tips. Translate complex medical terms into simple, easy-to-understand language.";
        
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview", // Upgrade to Gemini 3 Pro for medical accuracy
            contents: {
                parts: [
                    { inlineData: { data: file.base64, mimeType: file.mimeType } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.1, // Low temperature for accuracy
                thinkingConfig: { thinkingBudget: 8192 } // Enable reasoning for better data extraction
            }
        });

        const text = extractText(response).trim();
        const analysis: HealthReportAnalysis = JSON.parse(text);
        return analysis;

    } catch (error) {
        console.error("Error analyzing health report:", error);
        throw new Error("Failed to analyze the health report. Please ensure the image is clear and legible.");
    }
};
