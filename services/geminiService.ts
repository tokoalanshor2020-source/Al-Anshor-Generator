import { GoogleGenAI, Operation, Modality, GenerateContentResponse } from "@google/genai";
import type { GeneratorOptions } from '../types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const makeApiCallWithRetry = async <T>(apiCall: () => Promise<T>, maxRetries = 3): Promise<T> => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await apiCall();
        } catch (error) {
            if (error instanceof Error && (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED'))) {
                if (attempt === maxRetries - 1) {
                    // Last attempt failed, throw a user-friendly error
                    throw new Error('errorRateLimit');
                }
                const delayTime = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
                console.warn(`Rate limit hit. Retrying in ${delayTime.toFixed(0)}ms... (Attempt ${attempt + 1}/${maxRetries})`);
                await delay(delayTime);
            } else {
                // Not a rate limit error, fail immediately
                throw error;
            }
        }
    }
    // This part should be unreachable, but typescript needs a return path.
    throw new Error('errorRateLimit');
};

export const generateVideo = async ({ options }: { options: GeneratorOptions }): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const videoParams = [
        `- Aspect Ratio: ${options.aspectRatio}`,
        `- Resolution: ${options.resolution}`,
        `- Sound: ${options.enableSound ? 'enabled' : 'disabled'}`
    ];

    let augmentedPrompt = `
      ${options.prompt.video}
    `;

    if (options.enableSound) {
      augmentedPrompt += `
      ---
      ${options.prompt.audio}
      `;
    }

    augmentedPrompt += `
      ---
      Video generation parameters:
      ${videoParams.join('\n')}
    `;

    const requestPayload: any = {
        model: 'veo-2.0-generate-001',
        prompt: augmentedPrompt,
        config: {
            numberOfVideos: 1,
        }
    };

    if (options.image) {
        requestPayload.image = {
            imageBytes: options.image.base64,
            mimeType: options.image.mimeType,
        };
    }
    
    // FIX: Use the Operation type for the operation variable, as LroOperation and VideosOperation are not exported.
    // FIX: The Operation type is generic. Since the response type for videos is not exported, we use `any` as the type argument.
    let operation: Operation<any> = await makeApiCallWithRetry(() => ai.models.generateVideos(requestPayload));

    while (!operation.done) {
        await delay(10000); // Poll every 10 seconds
        operation = await makeApiCallWithRetry(() => ai.operations.getVideosOperation({ operation }), 5);
    }

    if (operation.error) {
        throw new Error(`Video generation failed: ${operation.error.message}`);
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

    if (!downloadLink) {
        throw new Error("Video generation completed, but no download link was found.");
    }
    
    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!videoResponse.ok) {
        const errorBody = await videoResponse.text();
        throw new Error(`Failed to fetch video from URI. Status: ${videoResponse.statusText}. Body: ${errorBody}`);
    }

    const videoBlob = await videoResponse.blob();
    
    // Convert blob to a data URL to be more robust, especially in new tabs or sandboxed environments.
    // This avoids potential issues with blob URL lifecycle and permissions that can cause ERR_FILE_NOT_FOUND.
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            resolve(reader.result as string);
        };
        reader.onerror = (error) => {
            reject(new Error("Failed to read video blob into data URL: " + error));
        };
        reader.readAsDataURL(videoBlob);
    });
};

export const generateSpeech = async (prompt: string, speechConfig: any): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    // FIX: Add GenerateContentResponse type to fix property access error on unknown type.
    const response: GenerateContentResponse = await makeApiCallWithRetry(() => ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig,
      },
    }));
  
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  
    if (!base64Audio) {
      throw new Error("Audio generation failed. The model did not return any audio data.");
    }
  
    return base64Audio;
  };