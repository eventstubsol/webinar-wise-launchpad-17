
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export class ResponseUtils {
  static createErrorResponse(message: string, status: number) {
    return new Response(
      JSON.stringify({ error: message }),
      { 
        status, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  static createSuccessResponse(data: any) {
    return new Response(
      JSON.stringify(data),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  static createCorsResponse() {
    return new Response(null, { headers: corsHeaders });
  }
}
