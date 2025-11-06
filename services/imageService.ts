import { Modality } from "@google/genai";
import type { AttachedFile } from '../types';
import { ai } from './geminiService';

export const generateImage = async (prompt: string, aspectRatio: string): Promise<string> => {
  const response = await ai.models.generateImages({
    // Fix: Updated to the recommended model for high-quality image generation.
    model: 'imagen-4.0-generate-001',
    prompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/jpeg',
      aspectRatio: aspectRatio as any,
    },
  });
  
  const image = response.generatedImages?.[0];

  if (image?.image?.imageBytes) {
      return `data:image/jpeg;base64,${image.image.imageBytes}`;
  }

  // The generateImages endpoint might not have promptFeedback in the same way, 
  // but we can check for an empty response which is indicative of an issue.
  const blockReason = (response as any).promptFeedback?.blockReason;
   if (blockReason) {
      throw new Error(`Image generation failed due to: ${blockReason}. Please adjust your prompt.`);
  }

  throw new Error("Image generation failed to return an image or the response was empty.");
};

export const editImage = async (prompt: string, file: AttachedFile): Promise<string> => {
    const response = await ai.models.generateContent({
        // Fix: Updated to the recommended model for image editing.
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: file.base64, mimeType: file.mimeType } },
                { text: prompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const blockReason = response.promptFeedback?.blockReason;
    if (blockReason) {
        throw new Error(`Image editing was blocked due to: ${blockReason}. Please adjust your prompt.`);
    }

    const candidate = response.candidates?.[0];
    if (!candidate) {
        throw new Error("Image editing failed: No valid response candidate was returned from the model.");
    }

    // Safely find the first part that contains image data
    const imagePart = candidate.content?.parts?.find(p => p.inlineData);

    if (imagePart?.inlineData?.data) {
        return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    }
    
    // If no image, provide a more detailed error based on why the generation stopped.
    
    // Check if the model provided a text explanation.
    const textPart = candidate.content?.parts?.find(p => p.text);
    if (textPart?.text) {
        throw new Error(`Image editing failed. The model responded with: "${textPart.text}"`);
    }

    // Check the finish reason and safety ratings.
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
        if (candidate.finishReason === 'NO_IMAGE') {
            throw new Error("The AI couldn't determine how to edit the image from your request. Please try being more specific, for example: 'add a hat to the cat' or 'change the background to a beach'.");
        }
        
        let reason = `Image editing stopped unexpectedly. Reason: ${candidate.finishReason}.`;
        const safetyInfo = candidate.safetyRatings
            ?.map(r => `${r.category.replace('HARM_CATEGORY_', '')}: ${r.probability}`)
            .join(', ');
        if (safetyInfo) {
            reason += ` Safety ratings: [${safetyInfo}]. Please adjust your prompt.`;
        }
        throw new Error(reason);
    }

    // Fallback for an unknown empty response.
    throw new Error("Image editing failed to return an image or the response was empty.");
};