import { Operation } from "@google/genai";
import type { AttachedFile } from "../types";
import { getAiClient } from "./geminiService";

export class ApiKeyNotSelectedError extends Error {
  constructor(message?: string) {
    super(message || "API key not selected.");
    this.name = "ApiKeyNotSelectedError";
  }
}

export const generateVideo = async (
    prompt: string,
    file: AttachedFile | null,
    aspectRatio: '16:9' | '9:16',
    onProgress: (status: string) => void
): Promise<string> => {
    if ((window as any).aistudio && !(await (window as any).aistudio.hasSelectedApiKey())) {
        throw new ApiKeyNotSelectedError();
    }
    
    // Create a new instance right before the call to get the latest key
    const ai = getAiClient();

    onProgress("Starting video generation...");
    let operation: Operation<any>;
    try {
      operation = await ai.models.generateVideos({
          // Fix: Updated to the recommended model for video generation.
          model: 'veo-3.1-fast-generate-preview',
          prompt: prompt,
          ...(file && { image: { imageBytes: file.base64, mimeType: file.mimeType } }),
          config: {
              numberOfVideos: 1,
              resolution: '720p',
              aspectRatio: aspectRatio
          }
      });
    } catch(err: any) {
        if (err.message?.includes("Requested entity was not found.")) {
             throw new ApiKeyNotSelectedError("Invalid API Key. Please select another key.");
        }
        throw err;
    }

    onProgress("Video generation in progress... this may take a few minutes.");
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
        onProgress(`Processing... Status: ${operation.metadata?.state ?? 'UNKNOWN'}`);
    }

    if(operation.error) {
        throw new Error(`Video generation failed: ${operation.error.message}`);
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error("Video generation failed to produce a download link.");
    }

    onProgress("Fetching generated video...");
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.statusText}`);
    }
    const blob = await response.blob();
    const videoUrl = URL.createObjectURL(blob);
    
    onProgress("Video ready.");
    return videoUrl;
};