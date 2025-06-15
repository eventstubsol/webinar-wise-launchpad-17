
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 1000; // 1 second base delay

/**
 * Utility: Delay execution
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry API calls with exponential backoff
 */
export async function retryApiCall<T>(apiCall: () => Promise<T>): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt === MAX_RETRIES - 1) {
        throw lastError;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delayMs = BASE_RETRY_DELAY * Math.pow(2, attempt);
      console.log(`API call failed, retrying in ${delayMs}ms. Attempt ${attempt + 1}/${MAX_RETRIES}`);
      await delay(delayMs);
    }
  }

  throw lastError!;
}
