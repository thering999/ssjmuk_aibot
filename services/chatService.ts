
import { Content, Part, GenerateContentResponse, Type, FunctionDeclaration } from "@google/genai";
import type { TFunction } from 'i18next';
import type { AttachedFile, ModelType, Geolocation, ChatMessageSource, ChatMessage, UserProfile, Appointment } from '../types';
import { clinicFinderTool } from '../tools/clinicFinder';
import { symptomCheckerTool } from '../tools/symptomCheckerTool';
import { medicationReminderTool } from '../tools/medicationReminderTool';
import { medicationSchedulerTool } from '../tools/medicationSchedulerTool';
import { appointmentBookingTool } from '../tools/appointmentBookingTool';
import { outputGenerationTools } from '../tools/outputGenerationTools';
import { userProfileTool } from '../tools/healthProfileTool';
import { browserTools } from '../tools/browserTools';
import { getClinicInfo } from './clinicService';
import { getSymptomAdvice } from './symptomService';
import { setReminder } from './reminderService';
import { bookAppointment } from './appointmentService';
import { ai } from './geminiService';
import { User } from './firebase';

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


const modelMap: Record<ModelType, string> = {
    'flash-lite': 'gemini-flash-lite-latest',
    'flash': 'gemini-2.5-flash',
    'pro': 'gemini-3-pro-preview', // Upgraded to Gemini 3 Pro
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

export type GenerateTextOptions = {
    prompt: string;
    files: AttachedFile[];
    history: Content[];
    model: ModelType;
    useSearch: boolean;
    useMaps: boolean;
    location: Geolocation | null;
    useClinicFinder: boolean;
    useSymptomChecker: boolean;
    useMedicationReminder: boolean;
    useMedicationScheduler: boolean;
    useUserProfile: boolean;
    useAppointmentBooking: boolean;
    useIsanDialect: boolean;
    systemInstructionText: string;
    knowledgeContext: string | null;
    userProfile: UserProfile | null;
    user?: User | null; // Add user object to options
    abortSignal: AbortSignal;
}

export async function* generateText(options: GenerateTextOptions): AsyncGenerator<{ textChunk?: string, sources?: ChatMessageSource[], toolUse?: ChatMessage['toolUse'] }> {
    const {
        prompt, files, history, model, useSearch, useMaps, location,
        useClinicFinder, useSymptomChecker, useMedicationReminder, useMedicationScheduler,
        useUserProfile, useAppointmentBooking, useIsanDialect, systemInstructionText, knowledgeContext, userProfile, user, abortSignal
    } = options;

    const geminiModel = modelMap[model];
    const tools: any[] = [];
    const functionDeclarations: FunctionDeclaration[] = [];

    if (useSearch) tools.push({ googleSearch: {} });
    if (useMaps) tools.push({ googleMaps: {} });
    if (useClinicFinder) functionDeclarations.push(clinicFinderTool);
    if (useSymptomChecker) functionDeclarations.push(symptomCheckerTool);
    if (useMedicationReminder) functionDeclarations.push(medicationReminderTool);
    if (useMedicationScheduler) functionDeclarations.push(medicationSchedulerTool);
    if (useAppointmentBooking) functionDeclarations.push(appointmentBookingTool);
    if (useUserProfile) functionDeclarations.push(userProfileTool);
    functionDeclarations.push(...outputGenerationTools);
    functionDeclarations.push(...browserTools);
    
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
    
    let instructionWithKnowledge = `You are a personalized AI assistant. When the user shares personal details (like their name, work, interests, preferences, or health information), use the 'rememberUserDetails' tool to save them. Proactively use the information you have saved about the user to tailor your responses. ${systemInstructionText || ''}`;
    
    if (useIsanDialect) {
        instructionWithKnowledge += "\nIMPORTANT: You must speak in the Northeastern Thai dialect (Isan language). Use words like 'เจ้า', 'เด้อ', 'บ่', 'แม่น', 'เฮา' appropriately to sound friendly, warm, and local to Mukdahan province.";
    }

    if (knowledgeContext) {
        instructionWithKnowledge = `Please prioritize the following information to answer the user's question. This is official, curated data that should be considered the primary source of truth.\n\n[Official Data]\n${knowledgeContext}\n---\n\nOriginal instructions: ${instructionWithKnowledge}`;
    }
     if (userProfile) {
        const profileContext = `\n\n[User Profile]\nThis is your memory of the user. Use these details for personalization and update them using the 'rememberUserDetails' tool when the user provides new information:\n${JSON.stringify(userProfile, null, 2)}`;
        instructionWithKnowledge = instructionWithKnowledge 
            ? `${instructionWithKnowledge}${profileContext}` 
            : profileContext;
    }
    
    const config: any = {};
    if (instructionWithKnowledge) config.systemInstruction = instructionWithKnowledge;
    // Enable thinking for Pro model (Gemini 3 Pro)
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
                if (call.name === 'createDocument') {
                     yield { toolUse: { name: 'createDocument', args: call.args, isCalling: false, result: "Client-side document creation initiated." }};
                     toolParts.push({ functionResponse: { name: call.name, response: { result: { success: true, message: "Document has been created for the user to download." } } } });
                } else if (call.name === 'openWebsite') {
                    const url = call.args.url;
                    if (url) {
                        let result: { success: boolean, message: string };
                        // Security check to prevent "javascript:" URIs etc.
                        if (String(url).startsWith('http:') || String(url).startsWith('https://')) {
                            window.open(url, '_blank');
                            result = { success: true, message: `Opened ${url} in a new tab.` };
                        } else {
                            result = { success: false, message: `Invalid or insecure URL format: ${url}` };
                        }
                        yield { toolUse: { name: 'openWebsite', args: call.args, result: JSON.stringify(result), isCalling: false }};
                        toolParts.push({ functionResponse: { name: call.name, response: { result } } });
                    }
                } else if (call.name === 'getClinicInfo') {
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
                } else if (call.name === 'scheduleMedication') {
                    yield { toolUse: { name: 'scheduleMedication', args: call.args, isCalling: true }};
                    const result = { success: true, message: "The medication schedule has been saved to the user's profile." };
                    yield { toolUse: { name: 'scheduleMedication', args: call.args, result: JSON.stringify(result), isCalling: false }};
                    toolParts.push({ functionResponse: { name: call.name, response: { result } } });
                } else if (call.name === 'bookAppointment') {
                    yield { toolUse: { name: 'bookAppointment', args: call.args, isCalling: true }};
                    // Pass user ID to save appointment
                    const result = await bookAppointment(call.args.specialty, call.args.date, call.args.time, user?.uid);
                    yield { toolUse: { name: 'bookAppointment', args: call.args, result: result.message, isCalling: false }};
                    toolParts.push({ functionResponse: { name: call.name, response: { result } } });
                }
            }
            
            if (toolParts.length > 0) {
                contents.push({ role: 'model', parts: [{ functionCall: functionCalls[0] }] });
                contents.push({ role: 'tool', parts: toolParts });

                const secondStreamResult = await ai.models.generateContentStream({ ...requestPayload, contents });
                 for await (const chunk of secondStreamResult) {
                    if (abortSignal.aborted) break;
                    const textChunk = extractText(chunk);
                    if(textChunk) yield { textChunk };
                     // Sources might also come in the second pass
                    const grounding = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] | undefined;
                    if (grounding) yield { sources: formatSources(grounding) };
                 }
            }
        }
        
        const allGroundingChunks = [...firstPassGroundingChunks];
        yield { sources: formatSources(allGroundingChunks) };

    } catch (error: any) {
        console.error("Error in generateText stream:", error);
        if (error.name !== 'AbortError') {
             throw error;
        }
    }
}


/**
 * Generates relevant follow-up questions based on the last interaction.
 * @param userPrompt - The last message sent by the user.
 * @param botResponse - The last response from the bot.
 * @returns A promise that resolves to an array of string questions.
 */
export const generateFollowUpQuestions = async (userPrompt: string, botResponse: string): Promise<string[]> => {
    try {
        const prompt = `Based on the last user prompt and the bot's response, generate 3 concise and relevant follow-up questions the user might ask. Respond with ONLY a JSON array of strings.
        
        Last User Prompt: "${userPrompt}"
        
        Bot Response: "${botResponse}"
        
        Example Response:
        ["What are the side effects?", "Where can I get this medication?", "How long should I take it for?"]`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                temperature: 0.7,
                responseMimeType: "application/json",
            }
        });

        const text = extractText(response);
        if (!text) {
            return [];
        }

        const questions = JSON.parse(text);
        if (Array.isArray(questions) && questions.every(q => typeof q === 'string')) {
            return questions;
        }

        return [];
    } catch (error) {
        // Log the raw error for debugging but don't crash the app
        console.error("Error generating follow-up questions:", error);
        // Silently fail to not disrupt the user experience
        return [];
    }
};

/**
 * Interprets a natural language voice command and maps it to a predefined function name.
 * @param command - The transcribed voice command from the user.
 * @param t - The i18next translation function.
 * @returns A promise that resolves to a function name string or null if no match is found.
 */
export const interpretVoiceCommand = async (command: string, t: TFunction): Promise<string | null> => {
    const availableCommands = [
        { name: 'newChat', description: t('voiceCommandDescNewChat') },
        { name: 'readLastMessage', description: t('voiceCommandDescReadLastMessage') },
        { name: 'setDarkMode', description: t('voiceCommandDescSetDarkMode') },
        { name: 'setLightMode', description: t('voiceCommandDescSetLightMode') },
        { name: 'switchToLiveMode', description: t('voiceCommandDescSwitchToLive') },
        { name: 'toggleCamera', description: t('voiceCommandDescToggleCamera') },
        { name: 'analyzeImage', description: t('voiceCommandDescAnalyzeImage') },
    ];

    const prompt = `The user issued a voice command: "${command}".
    
    Based on the user's command, identify which of the following functions should be called.
    
    Available Functions:
    ${availableCommands.map(c => `- ${c.name}: ${c.description}`).join('\n')}
    
    Respond with ONLY the function name that is the best match. If no function is a clear match, respond with "null".`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                temperature: 0, // We want a deterministic response
                stopSequences: ['\n']
            }
        });

        const functionName = extractText(response).trim();
        
        // Validate that the returned name is one of the available commands
        if (availableCommands.some(c => c.name === functionName)) {
            return functionName;
        }

        return null;

    } catch (error) {
        console.error("Error interpreting voice command:", error);
        return null;
    }
};
