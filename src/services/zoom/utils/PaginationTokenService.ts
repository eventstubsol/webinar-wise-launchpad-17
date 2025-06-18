
/**
 * Pagination token management service for Zoom API compliance
 * Handles secure token generation, validation, and 15-minute expiration
 */

import { supabase } from '@/integrations/supabase/client';
import { createHash, randomBytes } from 'crypto';

export interface PaginationTokenData {
  webinarId?: string;
  userId: string;
  queryParams: Record<string, any>;
  currentPage?: number;
  totalRecords?: number;
}

export interface TokenValidationResult {
  isValid: boolean;
  data?: PaginationTokenData;
  error?: string;
}

export class PaginationTokenService {
  private static readonly TOKEN_EXPIRY_MINUTES = 15;
  private static readonly TOKEN_PREFIX = 'zpt_'; // Zoom Pagination Token

  /**
   * Generate a secure pagination token with 15-minute expiration
   */
  static async generateToken(data: PaginationTokenData): Promise<string> {
    try {
      // Generate secure random token
      const randomPart = randomBytes(32).toString('hex');
      const timestamp = Date.now().toString(36);
      const token = `${this.TOKEN_PREFIX}${timestamp}_${randomPart}`;

      // Create data hash for validation
      const dataHash = this.createDataHash(data.queryParams);

      // Calculate expiration time (15 minutes from now)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.TOKEN_EXPIRY_MINUTES);

      // Store token in database
      const { error } = await supabase
        .from('pagination_tokens')
        .insert({
          token,
          data_hash: dataHash,
          webinar_id: data.webinarId || null,
          user_id: data.userId,
          query_params: data.queryParams,
          expires_at: expiresAt.toISOString()
        });

      if (error) {
        console.error('Failed to store pagination token:', error);
        throw new Error('Failed to generate pagination token');
      }

      console.log(`✅ PAGINATION TOKEN GENERATED: ${token} (expires in ${this.TOKEN_EXPIRY_MINUTES} minutes)`);
      return token;
    } catch (error) {
      console.error('Error generating pagination token:', error);
      throw new Error('Token generation failed');
    }
  }

  /**
   * Validate a pagination token and retrieve associated data
   */
  static async validateToken(token: string): Promise<TokenValidationResult> {
    try {
      if (!token || !token.startsWith(this.TOKEN_PREFIX)) {
        return {
          isValid: false,
          error: 'Invalid token format'
        };
      }

      // Fetch token from database
      const { data: tokenData, error } = await supabase
        .from('pagination_tokens')
        .select('*')
        .eq('token', token)
        .single();

      if (error || !tokenData) {
        return {
          isValid: false,
          error: 'Token not found or expired'
        };
      }

      // Check if token has expired
      const now = new Date();
      const expiresAt = new Date(tokenData.expires_at);
      
      if (now > expiresAt) {
        // Clean up expired token
        await this.deleteToken(token);
        return {
          isValid: false,
          error: 'Token has expired'
        };
      }

      // Update last accessed time
      await supabase
        .from('pagination_tokens')
        .update({ last_accessed_at: new Date().toISOString() })
        .eq('token', token);

      return {
        isValid: true,
        data: {
          webinarId: tokenData.webinar_id,
          userId: tokenData.user_id,
          queryParams: tokenData.query_params as Record<string, any>
        }
      };
    } catch (error) {
      console.error('Error validating pagination token:', error);
      return {
        isValid: false,
        error: 'Token validation failed'
      };
    }
  }

  /**
   * Delete a specific pagination token
   */
  static async deleteToken(token: string): Promise<void> {
    try {
      await supabase
        .from('pagination_tokens')
        .delete()
        .eq('token', token);
    } catch (error) {
      console.error('Error deleting pagination token:', error);
    }
  }

  /**
   * Clean up expired tokens (can be called periodically)
   */
  static async cleanupExpiredTokens(): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('cleanup_expired_pagination_tokens');

      if (error) {
        console.error('Error cleaning up expired tokens:', error);
        return 0;
      }

      const deletedCount = data || 0;
      if (deletedCount > 0) {
        console.log(`🧹 CLEANUP: Removed ${deletedCount} expired pagination tokens`);
      }

      return deletedCount;
    } catch (error) {
      console.error('Error in cleanup operation:', error);
      return 0;
    }
  }

  /**
   * Create a hash of query parameters for validation
   */
  private static createDataHash(queryParams: Record<string, any>): string {
    const sortedParams = Object.keys(queryParams)
      .sort()
      .reduce((result, key) => {
        result[key] = queryParams[key];
        return result;
      }, {} as Record<string, any>);

    return createHash('sha256')
      .update(JSON.stringify(sortedParams))
      .digest('hex');
  }

  /**
   * Generate next page token for pagination continuation
   */
  static async generateNextPageToken(
    currentToken: string | null,
    nextPageParams: Record<string, any>,
    userId: string,
    webinarId?: string
  ): Promise<string | null> {
    try {
      // If we have more data, generate next token
      if (nextPageParams && Object.keys(nextPageParams).length > 0) {
        return await this.generateToken({
          webinarId,
          userId,
          queryParams: nextPageParams
        });
      }

      // No more pages, clean up current token if exists
      if (currentToken) {
        await this.deleteToken(currentToken);
      }

      return null;
    } catch (error) {
      console.error('Error generating next page token:', error);
      return null;
    }
  }

  /**
   * Check if a token is close to expiration (within 2 minutes)
   */
  static async isTokenNearExpiration(token: string): Promise<boolean> {
    try {
      const { data: tokenData } = await supabase
        .from('pagination_tokens')
        .select('expires_at')
        .eq('token', token)
        .single();

      if (!tokenData) return true;

      const now = new Date();
      const expiresAt = new Date(tokenData.expires_at);
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();
      const twoMinutesInMs = 2 * 60 * 1000;

      return timeUntilExpiry <= twoMinutesInMs;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true;
    }
  }
}
