import { Operation } from "@google/genai";
import type { AttachedFile } from "../types";
import { ai } from "./geminiService";

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
    
    onProgress("Starting video generation...");
    let operation: Operation<any>;
    try {
      operation = await ai.models.generateVideos({
          model: 'veo-3.1-fast-generate-preview',
          prompt: prompt,
          ...(file && file.base64 && { image: { imageBytes: file.base64, mimeType: file.mimeType } }),
          config: {
              numberOfVideos: 1,
              resolution: '720p',
              aspectRatio: aspectRatio
          }
      });
    } catch(err: any) {
        if (err.message && err.message.includes("API key not valid")) {
            throw new ApiKeyNotSelectedError();
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
    
    // @google/genai-fix: Per guidelines, the API key must be obtained from `process.env.API_KEY` and appended to the download URI.
    const API_KEY = process.env.API_KEY;
    if (!API_KEY) {
        throw new Error("API Key is not available for video download.");
    }

    const response = await fetch(`${downloadLink}&key=${API_KEY}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.statusText}`);
    }
    const blob = await response.blob();
    const videoUrl = URL.createObjectURL(blob);
    
    onProgress("Video ready.");
    return videoUrl;
};
