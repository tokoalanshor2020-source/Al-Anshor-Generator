
import { GoogleGenAI } from "@google/genai";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const makeApiCallWithRetry = async <T>(apiCall: () => Promise<T>, maxRetries = 3): Promise<T> => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await apiCall();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            // Non-retryable errors for validation are slightly different - we expect it to fail for invalid keys
            if (errorMessage.includes("API key not valid") || errorMessage.includes("API_KEY_INVALID")) {
                throw error;
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
                    throw new Error('errorModelOverloaded');
                }
                const delayTime = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
                console.warn(`Transient API error during validation. Retrying in ${delayTime.toFixed(0)}ms...`);
                await delay(delayTime);
            } else {
                // Any other error during validation is treated as a failure.
                throw error;
            }
        }
    }
    throw new Error("API key validation failed after multiple retries due to server issues.");
};

export const validateApiKey = async (apiKey: string): Promise<boolean> => {
  if (!apiKey || !apiKey.trim()) {
    return false;
  }
  try {
    const ai = new GoogleGenAI({ apiKey });
    // Use a lightweight, low-cost model method to validate the key.
    // generateContent with a tiny prompt and disabled thinking is a good option.
    await makeApiCallWithRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'test',
        config: { 
            maxOutputTokens: 1,
            thinkingConfig: { thinkingBudget: 0 } 
        }
    }), 2); // Retry only twice for faster validation feedback
    return true;
  } catch (error) {
    // If makeApiCallWithRetry throws our specific user-friendly errors, we treat it as a temporary server issue
    // but the key itself isn't necessarily "invalid". However, for the purpose of this function, we must return false.
    // The UI should handle displaying the server error. For now, we just log it.
    console.error("API Key validation failed:", error);
    return false;
  }
};