import { Content, Part, GenerateContentResponse, Type, FunctionDeclaration } from "@google/genai";
import type { TFunction } from 'i18next';
import type { AttachedFile, ModelType, Geolocation, ChatMessageSource, ChatMessage } from '../types';
import { clinicFinderTool } from '../tools/clinicFinder';
import { symptomCheckerTool } from '../tools/symptomCheckerTool';
import { medicationReminderTool } from '../tools/medicationReminderTool';
import { getClinicInfo } from './clinicService';
import { getSymptomAdvice } from './symptomService';
import { setReminder } from './reminderService';
import { ai } from './geminiService';

/**
 * Safely extracts text from a Gemini API response object.
 */
function extractText(response: GenerateContentResponse): string {
    // @google/genai-fix: Use the `.text` property for direct text access.
    return response.text;
}


const modelMap: Record<ModelType, string> = {
    'flash-lite': 'gemini-flash-lite-latest',
    'flash': 'gemini-2.5-flash',
    'pro': 'gemini-2.5-pro',
};

interface GroundingChunk {
    web?: { uri: string; title: string; };
    maps?: { uri?: string; title?: string; placeAnswerSources?: { reviewSnippets?: { uri: string; title: string; }[]; }[]; };
}

const formatSources = (chunks: GroundingChunk[] | undefined): ChatMessageSource[] => {
    if (!chunks) return [];
    const sources: ChatMessageSource[] = [];
    chunks.forEach(chunk => {
        if (chunk.web && chunk.web.uri) sources.push({ uri: chunk.web.uri, title: chunk.web.title || new URL(chunk.web.uri).hostname });
        if (chunk.maps) {
            if (chunk.maps.uri) sources.push({ uri: chunk.maps.uri, title: chunk.maps.title || 'Map View' });
            if (chunk.maps.placeAnswerSources) {
                chunk.maps.placeAnswerSources.forEach(p => p.reviewSnippets?.forEach(s => s.uri && sources.push({ uri: s.uri, title: s.title || 'Review' })));
            }
        }
    });
    return Array.from(new Map(sources.map(item => [item.uri, item])).values());
};

export async function* generateText(
    prompt: string,
    files: AttachedFile[],
    history: Content[],
    model: ModelType,
    useSearch: boolean,
    useMaps: boolean,
    location: Geolocation | null,
    useClinicFinder: boolean,
    useSymptomChecker: boolean,
    useMedicationReminder: boolean,
    systemInstructionText: string,
    knowledgeContext: string | null,
    abortSignal: AbortSignal
): AsyncGenerator<{ textChunk?: string, sources?: ChatMessageSource[], toolUse?: ChatMessage['toolUse'] }> {
    const geminiModel = modelMap[model];
    const tools: any[] = [];
    const functionDeclarations: FunctionDeclaration[] = [];

    if (useSearch) tools.push({ googleSearch: {} });
    if (useMaps) tools.push({ googleMaps: {} });
    if (useClinicFinder) functionDeclarations.push(clinicFinderTool);
    if (useSymptomChecker) functionDeclarations.push(symptomCheckerTool);
    if (useMedicationReminder) functionDeclarations.push(medicationReminderTool);
    
    if (functionDeclarations.length > 0) {
        tools.push({ functionDeclarations });
    }

    const parts: Part[] = [{ text: prompt }];
    if (files && files.length > 0) {
        for (const file of files) {
            if (file.base64) {
                parts.push({
                    inlineData: {
                        data: file.base64,
                        mimeType: file.mimeType,
                    }
                });
            }
        }
    }

    const contents: Content[] = [...history, { role: 'user', parts }];
    
    let instructionWithKnowledge = systemInstructionText;
    if (knowledgeContext) {
        instructionWithKnowledge = `Please prioritize the following information to answer the user's question. This is official, curated data that should be considered the primary source of truth.\n\n[Official Data]\n${knowledgeContext}\n---\n\nOriginal instructions: ${systemInstructionText}`;
    }
    
    const config: any = {};
    if (instructionWithKnowledge) config.systemInstruction = instructionWithKnowledge;
    if (model === 'pro') config.thinkingConfig = { thinkingBudget: 16384 };
    if (tools.length > 0) config.tools = tools;
    
    const toolConfig: any = {};
    if (useMaps && location) {
        toolConfig.retrievalConfig = { latLng: { latitude: location.latitude, longitude: location.longitude } };
    }
    
    const requestPayload = {
        model: geminiModel,
        contents,
        ...(Object.keys(config).length > 0 && { config }),
        ...(Object.keys(toolConfig).length > 0 && { toolConfig }),
    };

    try {
        const firstStreamResult = await ai.models.generateContentStream(requestPayload);
        
        let functionCalls: any[] = [];
        let firstPassGroundingChunks: GroundingChunk[] = [];
        
        for await (const chunk of firstStreamResult) {
            if (abortSignal.aborted) break;
            const textChunk = extractText(chunk);
            if(textChunk) yield { textChunk };
            if (chunk.functionCalls) functionCalls.push(...chunk.functionCalls);
            const grounding = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] | undefined;
            if (grounding) firstPassGroundingChunks.push(...grounding);
        }
        
        if (functionCalls.length > 0 && !abortSignal.aborted) {
            const toolParts: Part[] = [];
            for (const call of functionCalls) {
                if (call.name === 'getClinicInfo') {
                    yield { toolUse: { name: 'getClinicInfo', args: call.args, isCalling: true }};
                    const result = await getClinicInfo(call.args.location);
                    yield { toolUse: { name: 'getClinicInfo', args: call.args, result: JSON.stringify(result, null, 2), isCalling: false }};
                    toolParts.push({ functionResponse: { name: call.name, response: { result } } });
                } else if (call.name === 'checkSymptoms') {
                    yield { toolUse: { name: 'checkSymptoms', args: call.args, isCalling: true }};
                    const result = await getSymptomAdvice(call.args.symptoms, call.args.severity);
                    yield { toolUse: { name: 'checkSymptoms', args: call.args, result: JSON.stringify(result, null, 2), isCalling: false }};
                    toolParts.push({ functionResponse: { name: call.name, response: { result } } });
                } else if (call.name === 'setMedicationReminder') {
                    yield { toolUse: { name: 'setMedicationReminder', args: call.args, isCalling: true }};
                    const result = await setReminder(call.args.time, call.args.medication);
                    yield { toolUse: { name: 'setMedicationReminder', args: call.args, result: result, isCalling: false }};
                    toolParts.push({ functionResponse: { name: call.name, response: { result } } });
                }
            }

            const modelTurn: Part[] = functionCalls.map(fc => ({ functionCall: fc }));
            const secondStreamContents = [...contents, { role: 'model', parts: modelTurn }, { role: 'tool', parts: toolParts }];
            
            const secondStreamResult = await ai.models.generateContentStream({
                ...requestPayload,
                contents: secondStreamContents,
            });

            for await (const chunk of secondStreamResult) {
                if (abortSignal.aborted) break;
                const textChunk = extractText(chunk);
                if (textChunk) yield { textChunk };
                const grounding = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] | undefined;
                if (grounding) {
                    const sources = formatSources(grounding);
                    if (sources.length > 0) yield { sources };
                }
            }
        } else {
            if (firstPassGroundingChunks.length > 0) {
                const sources = formatSources(firstPassGroundingChunks);
                if (sources.length > 0) yield { sources };
            }
        }
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error("Error during text generation stream:", error);
            throw error;
        }
    }
}

export const generateFollowUpQuestions = async (lastUserPrompt: string, lastBotResponse: string): Promise<string[]> => {
    try {
        const prompt = `Based on the last user question and the bot's answer, generate 2 or 3 relevant follow-up questions the user might ask next.

User Question: "${lastUserPrompt}"
Bot Answer: "${lastBotResponse}"

Provide only a JSON array of strings in your response. For example: ["Question 1?", "Question 2?", "Question 3?"]`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        questions: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    }
                }
            }
        });

        const jsonText = extractText(response).trim();
        if (!jsonText) return [];
        
        const cleanedJsonText = jsonText.replace(/^```json\s*|```$/g, '').trim();
        const result = JSON.parse(cleanedJsonText);
        if (result && Array.isArray(result.questions)) return result.questions;
        if (Array.isArray(result)) return result.filter(item => typeof item === 'string');
        
        return [];
    } catch (error) {
        console.error("Error generating follow-up questions:", error);
        throw error;
    }
};

export const getAvailableVoiceCommands = (t: TFunction): FunctionDeclaration[] => [
    { name: 'newChat', description: t('voiceCommandDescNewChat') },
    { name: 'readLastMessage', description: t('voiceCommandDescReadLastMessage') },
    { name: 'setDarkMode', description: t('voiceCommandDescSetDarkMode') },
    { name: 'setLightMode', description: t('voiceCommandDescSetLightMode') },
    { name: 'toggleCamera', description: t('voiceCommandDescToggleCamera') },
    { name: 'analyzeImage', description: t('voiceCommandDescAnalyzeImage') },
    { name: 'switchToLiveMode', description: t('voiceCommandDescSwitchToLive') }
];

export const interpretVoiceCommand = async (commandPhrase: string, t: TFunction): Promise<string | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `The user said: "${commandPhrase}". Which function should be called?`,
            config: {
                tools: [{ functionDeclarations: getAvailableVoiceCommands(t) }],
            },
        });
        
        const functionCall = response.functionCalls?.[0];
        if (functionCall) {
            console.log(`[Voice Intent] Matched "${commandPhrase}" to function: ${functionCall.name}`);
            return functionCall.name;
        }
        return null;
    } catch (error) {
        console.error("Error interpreting voice command:", error);
        return null;
    }
};