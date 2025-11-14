/**
 * Calls the backend proxy to generate an image using the Imagen model.
 * @param prompt The text prompt for image generation.
 * @returns A promise that resolves to a base64 data URL of the generated image.
 */
export const generateImageViaProxy = async (prompt: string): Promise<string> => {
    try {
        const response = await fetch('/api/generate-images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'imagen-4.0-generate-001',
                prompt: prompt,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: '1:1', // Default aspect ratio for live conversation generation
                },
            }),
        });

        if (!response.ok) {
            // Attempt to parse error from proxy, which forwards Gemini's error structure
            const errorBody = await response.json().catch(() => ({ error: response.statusText }));
            const blockReason = errorBody?.promptFeedback?.blockReason;
            if (blockReason) {
                throw new Error(`Image generation failed due to: ${blockReason}. Please adjust your prompt.`);
            }
            throw new Error(`Proxy request failed: ${response.status} ${errorBody.error || ''}`.trim());
        }

        const data = await response.json();
        const image = data.generatedImages?.[0];

        if (image?.image?.imageBytes) {
            return `data:image/jpeg;base64,${image.image.imageBytes}`;
        }

        // Handle cases where the API returns a response but no image data
        const blockReason = (data as any).promptFeedback?.blockReason;
        if (blockReason) {
            throw new Error(`Image generation failed due to: ${blockReason}. Please adjust your prompt.`);
        }

        throw new Error("Image generation via proxy failed to return image data.");
    } catch (error) {
        console.error("Error in generateImageViaProxy:", error);
        // Re-throw the error so the calling component can handle it (e.g., show a toast)
        throw error;
    }
};
