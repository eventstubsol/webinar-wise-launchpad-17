
const RATE_LIMIT_DELAY = 100;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 1000;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getValidAccessToken(connection: any): Promise<string> {
  // This is a placeholder. In a real application, this function
  // would check token expiry and use the refresh_token to get a new
  // access_token if necessary.
  return connection.access_token;
}

export async function makeZoomApiCall(connection: any, endpoint: string): Promise<any> {
  const accessToken = await getValidAccessToken(connection);
  const response = await fetch(`https://api.zoom.us/v2${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Zoom API Error: ${response.status} ${response.statusText}`, errorBody);
    throw new Error(`Zoom API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function retryApiCall<T>(apiCall: () => Promise<T>): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await apiCall();
      await delay(RATE_LIMIT_DELAY);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === MAX_RETRIES - 1) {
        throw lastError;
      }

      const delayMs = BASE_RETRY_DELAY * Math.pow(2, attempt);
      console.log(`API call failed, retrying in ${delayMs}ms. Attempt ${attempt + 1}/${MAX_RETRIES}`);
      await delay(delayMs);
    }
  }

  throw lastError!;
}
