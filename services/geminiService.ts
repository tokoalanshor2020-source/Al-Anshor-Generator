
import { GoogleGenAI, Operation, Modality, GenerateContentResponse } from "@google/genai";
import type { GeneratorOptions } from '../types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const makeApiCallWithRetry = async <T>(apiCall: () => Promise<T>, maxRetries = 3): Promise<T> => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await apiCall();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            // Non-retryable errors
            if (errorMessage.includes("API key not valid") || errorMessage.includes("API_KEY_INVALID")) {
                throw error; // Let the top-level handler trigger re-authentication
            }
            if (errorMessage.includes("billing account") || errorMessage.includes("billed user")) {
                 throw new Error('errorBillingRequired');
            }

            // Retryable errors
            const isRetryable = errorMessage.includes('429') || 
                                errorMessage.includes('RESOURCE_EXHAUSTED') ||
                                errorMessage.includes('UNAVAILABLE') ||
                                errorMessage.includes('overloaded') ||
                                errorMessage.includes('500');

            if (isRetryable) {
                if (attempt === maxRetries - 1) {
                    // After all retries, throw a user-friendly error
                    throw new Error('errorModelOverloaded');
                }
                const delayTime = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
                console.warn(`Transient API error. Retrying in ${delayTime.toFixed(0)}ms... (Attempt ${attempt + 1}/${maxRetries})`);
                await delay(delayTime);
            } else {
                // Unexpected error, throw it
                throw error;
            }
        }
    }
    throw new Error("The model is temporarily unavailable after multiple retries. Please try again later.");
};

export const generateVideo = async ({ options, apiKey }: { options: GeneratorOptions; apiKey: string }): Promise<string> => {
    if (!apiKey) throw new Error("API key is not provided.");
    const ai = new GoogleGenAI({ apiKey });

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
    
    const videoResponse = await fetch(`${downloadLink}&key=${apiKey}`);
    if (!videoResponse.ok) {
        const errorBody = await videoResponse.text();
        throw new Error(`Failed to fetch video from URI. Status: ${videoResponse.statusText}. Body: ${errorBody}`);
    }

    const videoBlob = await videoResponse.blob();
    
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

export const generateSpeech = async (prompt: string, speechConfig: any, apiKey: string): Promise<string> => {
    if (!apiKey) throw new Error("API key is not provided.");
    const ai = new GoogleGenAI({ apiKey });

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