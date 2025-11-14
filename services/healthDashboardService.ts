
import type { HealthRecord } from '../types';

export { getHealthRecords, saveHealthRecord, deleteHealthRecord } from './firebase';


export const getAIHealthSummary = async (records: HealthRecord[]): Promise<string> => {
    if (records.length === 0) return "";
    
    // Use the latest 2 records for trend analysis, or 1 if that's all there is.
    const recordsToSummarize = records.slice(0, 2);

    const prompt = `Given the following JSON array of health records for a user, sorted from most recent to oldest, please provide a concise and encouraging 2-3 sentence summary of their overall health trends. Highlight any positive changes or areas of stability. Address the user directly in the second person ('You' or 'Your'). DO NOT provide medical advice or specific treatment suggestions. Focus on trends, not single data points unless it's the only one available.
    
Example response: "Your latest health report shows stable cholesterol levels, and your glucose has improved since your last check-up. Keep up the great work on managing your diet!"

Health Records:
${JSON.stringify(recordsToSummarize, null, 2)}`;

    try {
        const response = await fetch('/api/generate-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gemini-2.5-flash',
                contents: { parts: [{ text: prompt }] },
                config: { temperature: 0.5 }
            }),
        });
        
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`API request failed: ${response.status} ${errorBody}`);
        }

        const data = await response.json();
        return data.text || "Could not generate a summary at this time.";

    } catch (error) {
        console.error("Error fetching AI health summary:", error);
        throw new Error("Could not generate an AI health summary.");
    }
};
