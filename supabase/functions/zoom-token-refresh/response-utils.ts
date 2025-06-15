
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export class ResponseUtils {
  static createCorsResponse() {
    return new Response(null, { headers: CORS_HEADERS });
  }

  static createErrorResponse(message: string, status: number) {
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  static createSuccessResponse(data: any, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}
