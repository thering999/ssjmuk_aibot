import { Content, Part, GenerateContentResponse, Type, FunctionDeclaration } from "@google/genai";
import type { TFunction } from 'i18next';
import type { AttachedFile, ModelType, Geolocation, ChatMessageSource, ChatMessage } from '../types';
import { clinicFinderTool } from '../tools/clinicFinder';
import { getClinicInfo } from './clinicService';
import { ai } from './geminiService';

/**
 * Safely extracts text from a Gemini API response object.
 * This avoids console warnings about non-text parts (e.g., thoughtSignature)
 * by manually concatenating only the text parts from the response candidates.
 * @param response The GenerateContentResponse or a stream chunk.
 * @returns The extracted text as a single string.
 */
function extractText(response: any): string {
    if (!response?.candidates || response.candidates.length === 0) {
        return '';
    }
    const candidate = response.candidates[0];
    if (!candidate?.content || !candidate.content.parts) {
        return '';
    }
    return candidate.content.parts
        .map((part: any) => part.text)
        .filter((text: string | undefined) => text !== undefined)
        .join('');
}


const modelMap: Record<ModelType, string> = {
    'flash-lite': 'gemini-flash-lite-latest',
    'flash': 'gemini-2.5-flash',
    'pro': 'gemini-2.5-pro',
};

// Simplified local type as GroundingChunk is not exported from the SDK
interface GroundingChunk {
    web?: {
        uri: string;
        title: string;
    };
    maps?: {
        uri?: string;
        title?: string;
        placeAnswerSources?: {
            reviewSnippets?: {
                uri: string;
                title: string;
            }[];
        }[];
    };
}

const formatSources = (chunks: GroundingChunk[] | undefined): ChatMessageSource[] => {
    if (!chunks) return [];
    
    const sources: ChatMessageSource[] = [];
    
    chunks.forEach(chunk => {
        if (chunk.web && chunk.web.uri) {
            sources.push({ uri: chunk.web.uri, title: chunk.web.title || new URL(chunk.web.uri).hostname });
        }
        if (chunk.maps) {
            if (chunk.maps.uri) {
                 sources.push({ uri: chunk.maps.uri, title: chunk.maps.title || 'Map View' });
            }
            if (chunk.maps.placeAnswerSources) {
                chunk.maps.placeAnswerSources.forEach(placeSource => {
                    if (placeSource.reviewSnippets) {
                        placeSource.reviewSnippets.forEach(snippet => {
                            if (snippet.uri) {
                                sources.push({ uri: snippet.uri, title: snippet.title || 'Review' });
                            }
                        });
                    }
                });
            }
        }
    });
    
    // Remove duplicates based on URI
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
    systemInstructionText: string,
    knowledgeContext: string | null,
    abortSignal: AbortSignal
): AsyncGenerator<{ textChunk?: string, sources?: ChatMessageSource[], toolUse?: ChatMessage['toolUse'] }> {
    const geminiModel = modelMap[model];
    const tools: any[] = [];
    if (useSearch) tools.push({ googleSearch: {} });
    if (useMaps) tools.push({ googleMaps: {} });
    if (useClinicFinder) tools.push({ functionDeclarations: [clinicFinderTool]});

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
        instructionWithKnowledge = `Please prioritize the following information to answer the user's question. This is official, curated data that should be considered the primary source of truth.

[Official Data]
${knowledgeContext}
---

Original instructions: ${systemInstructionText}`;
    }
    
    const config: any = {};
    if (instructionWithKnowledge) {
        config.systemInstruction = instructionWithKnowledge;
    }
    
    if (model === 'pro') {
        config.thinkingConfig = { thinkingBudget: 16384 };
    }

    if (tools.length > 0) {
        config.tools = tools;
    }
    
    const toolConfig: any = {};
    if (useMaps && location) {
        toolConfig.retrievalConfig = {
            latLng: {
                latitude: location.latitude,
                longitude: location.longitude,
            }
        };
    }

    const abortPromise = new Promise<never>((_, reject) => {
        if (abortSignal.aborted) {
            return reject(new DOMException('Aborted', 'AbortError'));
        }
        const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
        abortSignal.addEventListener('abort', onAbort, { once: true });
    });

    try {
        const firstStream = await ai.models.generateContentStream({
            model: geminiModel,
            contents,
            ...(Object.keys(config).length > 0 && { config }),
            ...(Object.keys(toolConfig).length > 0 && { toolConfig }),
        });
        
        let functionCalls: any[] = [];
        let firstPassGroundingChunks: GroundingChunk[] = [];
        
        const firstStreamIterator = firstStream[Symbol.asyncIterator]();
        while (true) {
            const result = await Promise.race([firstStreamIterator.next(), abortPromise]);
            const chunk = result as IteratorResult<GenerateContentResponse>;
            if (chunk.done) break;

            // Yield text chunks immediately for streaming UI
            const textChunk = extractText(chunk.value);
            if(textChunk) {
                yield { textChunk: textChunk };
            }

            // Aggregate function calls and grounding data
            if (chunk.value.functionCalls) {
                functionCalls.push(...chunk.value.functionCalls);
            }
            const grounding = chunk.value.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] | undefined;
            if ( grounding) {
                 firstPassGroundingChunks.push(...grounding);
            }
        }
        
        if (functionCalls.length > 0) {
            const toolParts: Part[] = [];
            for (const call of functionCalls) {
                if (call.name === 'getClinicInfo') {
                    // 1. Yield that we are starting the call
                    yield { toolUse: { name: 'getClinicInfo', args: call.args, isCalling: true }};

                    const result = await getClinicInfo(call.args.location);

                    // 2. Yield the final result
                    yield { toolUse: { name: 'getClinicInfo', args: call.args, result: JSON.stringify(result, null, 2), isCalling: false }};
                    
                    toolParts.push({ functionResponse: { name: call.name, response: { result } } });
                }
            }

            const modelTurn: Part[] = functionCalls.map(fc => ({ functionCall: fc }));
            const secondStream = await ai.models.generateContentStream({
                model: geminiModel,
                contents: [...contents, { role: 'model', parts: modelTurn }, { role: 'tool', parts: toolParts }],
                ...(Object.keys(config).length > 0 && { config }),
                ...(Object.keys(toolConfig).length > 0 && { toolConfig }),
            });

            const secondStreamIterator = secondStream[Symbol.asyncIterator]();
             while (true) {
                const result = await Promise.race([secondStreamIterator.next(), abortPromise]);
                const chunk = result as IteratorResult<GenerateContentResponse>;
                if (chunk.done) break;

                const textChunk = extractText(chunk.value);
                if (textChunk) yield { textChunk: textChunk };

                 const grounding = chunk.value.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] | undefined;
                if (grounding) {
                    const sources = formatSources(grounding);
                    if (sources.length > 0) yield { sources };
                }
            }
        } else {
            // If no function calls, yield the collected sources at the end
            if (firstPassGroundingChunks.length > 0) {
                const sources = formatSources(firstPassGroundingChunks);
                if (sources.length > 0) yield { sources };
            }
        }
    } catch (error) {
        console.error("Error during text generation stream:", error);
        throw error;
    }
}

export const generateFollowUpQuestions = async (lastUserPrompt: string, lastBotResponse: string): Promise<string[]> => {
    try {
        const prompt = `Based on the last user question and the bot's answer, generate 2 or 3 relevant follow-up questions the user might ask next.

User Question: "${lastUserPrompt}"
Bot Answer: "${lastBotResponse}"

Provide only a JSON array of strings in your response. For example: ["Question 1?", "Question 2?", "Question 3?"]`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Use a fast model for this
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        questions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.STRING
                            }
                        }
                    }
                }
            }
        });

        const jsonText = extractText(response).trim();
        if (!jsonText) {
            console.warn("generateFollowUpQuestions: received empty text response from model.");
            return [];
        }
        
        // The model might return markdown ```json ... ```. Strip it.
        const cleanedJsonText = jsonText.replace(/^```json\s*|```$/g, '').trim();

        const result = JSON.parse(cleanedJsonText);

        // The schema asks for { questions: [...] }, so check for that property.
        if (result && Array.isArray(result.questions)) {
            return result.questions;
        }

        // Fallback for if the model just returns a raw array.
        if (Array.isArray(result)) {
            return result.filter(item => typeof item === 'string');
        }

        console.warn("generateFollowUpQuestions: parsed JSON does not match expected schema.", result);
        return [];
    } catch (error) {
        console.error("Error generating follow-up questions:", error);
        throw error; // Re-throw so the caller can handle it
    }
};

export const getAvailableVoiceCommands = (t: TFunction): FunctionDeclaration[] => [
    {
        name: 'newChat',
        description: t('voiceCommandDescNewChat'),
    },
    {
        name: 'readLastMessage',
        description: t('voiceCommandDescReadLastMessage'),
    },
    {
        name: 'setDarkMode',
        description: t('voiceCommandDescSetDarkMode'),
    },
    {
        name: 'setLightMode',
        description: t('voiceCommandDescSetLightMode'),
    },
    {
        name: 'toggleCamera',
        description: t('voiceCommandDescToggleCamera'),
    },
    {
        name: 'analyzeImage',
        description: t('voiceCommandDescAnalyzeImage'),
    },
    {
        name: 'switchToLiveMode',
        description: t('voiceCommandDescSwitchToLive'),
    }
];


export const interpretVoiceCommand = async (commandPhrase: string, t: TFunction): Promise<string | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Fast model for quick command recognition
            contents: `The user said: "${commandPhrase}". Which function should be called?`,
            config: {
                tools: [{ functionDeclarations: getAvailableVoiceCommands(t) }],
            },
        });
        
        const functionCall = response.functionCalls?.[0];
        if (functionCall) {
            console.log(`[Voice Intent] Gemini matched "${commandPhrase}" to function: ${functionCall.name}`);
            return functionCall.name;
        }

        console.log(`[Voice Intent] Gemini could not match a function for "${commandPhrase}"`);
        return null;

    } catch (error) {
        console.error("Error interpreting voice command:", error);
        return null;
    }
};