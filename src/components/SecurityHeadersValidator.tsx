
import React, { useEffect, useState } from 'react';
import { validateSecurityHeaders } from '@/lib/security-headers';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ValidationResult {
  valid: boolean;
  missing: string[];
  present: string[];
}

export const SecurityHeadersValidator: React.FC = () => {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const checkHeaders = async () => {
    setLoading(true);
    try {
      const result = await validateSecurityHeaders();
      setValidation(result);
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHeaders();
  }, []);

  if (loading) {
    return (
      <Alert>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertDescription>Validating security headers...</AlertDescription>
      </Alert>
    );
  }

  if (!validation) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Alert variant={validation.valid ? "default" : "destructive"}>
        {validation.valid ? (
          <CheckCircle className="h-4 w-4" />
        ) : (
          <AlertCircle className="h-4 w-4" />
        )}
        <AlertDescription>
          {validation.valid
            ? "All OWASP security headers are properly configured!"
            : `Missing ${validation.missing.length} required security headers`}
        </AlertDescription>
      </Alert>

      {validation.present.length > 0 && (
        <div className="text-sm">
          <h4 className="font-medium text-green-600 mb-2">Present Headers ({validation.present.length}):</h4>
          <ul className="list-disc list-inside space-y-1 text-green-700">
            {validation.present.map((header) => (
              <li key={header}>{header}</li>
            ))}
          </ul>
        </div>
      )}

      {validation.missing.length > 0 && (
        <div className="text-sm">
          <h4 className="font-medium text-red-600 mb-2">Missing Headers ({validation.missing.length}):</h4>
          <ul className="list-disc list-inside space-y-1 text-red-700">
            {validation.missing.map((header) => (
              <li key={header}>{header}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={checkHeaders}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        disabled={loading}
      >
        Re-check Headers
      </button>
    </div>
  );
};
