import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { SimpleTokenEncryption } from "./encryption.ts";

// Types
interface SyncRequest {
  connectionId: string;
  syncMode?: 'full' | 'delta' | 'smart';
  dateRange?: {
    past