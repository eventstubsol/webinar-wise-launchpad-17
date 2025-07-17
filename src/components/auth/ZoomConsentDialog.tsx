import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Shield, CheckCircle, ExternalLink, Info } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface ZoomConsentScope {
  name: string;
  description: string;
}

interface ZoomConsentInfo {
  summary: string;
  scopes: ZoomConsentScope[];
  privacyUrl: string;
  termsUrl: string;
}

interface ZoomConsentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConsent: () => void;
  isLoading?: boolean;
}

export function ZoomConsentDialog({ isOpen, onClose, onConsent, isLoading = false }: ZoomConsentDialogProps) {
  const [consentInfo, setConsentInfo] = useState<ZoomConsentInfo | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchConsentInfo();
    }
  }, [isOpen]);

  const fetchConsentInfo = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_RENDER_BACKEND_URL || 'http://localhost:3001'}/api/auth/zoom/consent-info`);
      if (!response.ok) throw new Error('Failed to fetch consent info');
      const data = await response.json();
      setConsentInfo(data);
    } catch (error) {
      console.error('Error fetching consent info:', error);
      // Fallback to default consent info
      setConsentInfo({
        summary: "Webinar Wise will access your Zoom account information and webinar data to provide analytics and insights.",
        scopes: [
          { name: "Basic Profile", description: "View your Zoom profile information" },
          { name: "Webinar Access", description: "Access your webinar data and analytics" }
        ],
        privacyUrl: "/privacy",
        termsUrl: "/terms"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = () => {
    if (consentInfo) {
      const detailsWindow = window.open('', '_blank', 'width=600,height=700,scrollbars=yes');
      if (detailsWindow) {
        detailsWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Zoom Permissions Details - Webinar Wise</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background: #f9fafb;
              }
              h1 {
                color: #1f2937;
                font-size: 24px;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 2px solid #e5e7eb;
              }
              .scope {
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 12px;
              }
              .scope-name {
                font-weight: 600;
                color: #374151;
                margin-bottom: 4px;
              }
              .scope-description {
                color: #6b7280;
                font-size: 14px;
              }
              .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                font-size: 14px;
                color: #6b7280;
              }
              a {
                color: #3b82f6;
                text-decoration: none;
              }
              a:hover {
                text-decoration: underline;
              }
            </style>
          </head>
          <body>
            <h1>Zoom Permissions Details</h1>
            <p>Webinar Wise requests the following permissions to provide you with comprehensive webinar analytics:</p>
            ${consentInfo.scopes.map(scope => `
              <div class="scope">
                <div class="scope-name">${scope.name}</div>
                <div class="scope-description">${scope.description}</div>
              </div>
            `).join('')}
            <div class="footer">
              <p>For more information, please review our:</p>
              <p>
                <a href="${consentInfo.privacyUrl}" target="_blank">Privacy Policy</a> | 
                <a href="${consentInfo.termsUrl}" target="_blank">Terms of Service</a>
              </p>
              <p>You can revoke these permissions at any time from your Zoom account settings.</p>
            </div>
          </body>
          </html>
        `);
        detailsWindow.document.close();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <DialogTitle>Connect Your Zoom Account</DialogTitle>
          </div>
          <DialogDescription asChild>
            <div className="mt-3">
              {loading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : consentInfo ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900">
                      {consentInfo.summary}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Secure OAuth 2.0 connection</span>
                    </div>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={handleViewDetails}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Info className="h-4 w-4 mr-1" />
                      View details
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>

                  <div className="text-xs text-gray-500 mt-3">
                    By connecting your account, you agree to our{' '}
                    <a href={consentInfo.termsUrl} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href={consentInfo.privacyUrl} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                      Privacy Policy
                    </a>.
                  </div>
                </div>
              ) : (
                <p className="text-red-600">Failed to load consent information. Please try again.</p>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end space-x-3 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={onConsent}
            disabled={loading || isLoading || !consentInfo}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Connecting...
              </>
            ) : (
              'Connect with Zoom'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
