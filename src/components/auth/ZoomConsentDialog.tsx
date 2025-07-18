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
  detailedScopes?: ZoomConsentScope[];
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchConsentInfo();
    }
  }, [isOpen]);

  const fetchConsentInfo = async () => {
    try {
      const backendUrl = import.meta.env.VITE_RENDER_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/auth/zoom/consent-info`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch consent info');
      }
      
      const data = await response.json();
      setConsentInfo(data);
    } catch (error) {
      console.error('Error fetching consent info:', error);
      // Fallback to default consent info
      setConsentInfo({
        summary: "Connect your Zoom account to access webinar analytics and insights.",
        scopes: [
          { name: "Basic Profile", description: "View your name, email, and profile picture" },
          { name: "Webinar Access", description: "Read your webinar data and reports" }
        ],
        detailedScopes: [
          { name: "user:read", description: "Read your basic Zoom profile information" },
          { name: "webinar:read", description: "View your webinars" },
          { name: "webinar:read:admin", description: "Access all webinars in your account" },
          { name: "report:read:admin", description: "Generate detailed reports" },
          { name: "recording:read", description: "Access webinar recordings" }
        ],
        privacyUrl: "/privacy",
        termsUrl: "/terms"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = () => {
    if (consentInfo?.detailedScopes) {
      const detailsWindow = window.open('', '_blank', 'width=700,height=800,scrollbars=yes');
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
                color: #1a1a1a;
                max-width: 800px;
                margin: 0 auto;
                padding: 40px 20px;
                background: #f8f9fa;
              }
              .header {
                text-align: center;
                margin-bottom: 40px;
              }
              h1 {
                color: #2D8CFF;
                font-size: 28px;
                margin-bottom: 10px;
              }
              .subtitle {
                color: #666;
                font-size: 16px;
              }
              .scope-section {
                background: white;
                border-radius: 12px;
                padding: 24px;
                margin-bottom: 20px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
              }
              .scope {
                padding: 16px 0;
                border-bottom: 1px solid #e5e7eb;
              }
              .scope:last-child {
                border-bottom: none;
              }
              .scope-name {
                font-weight: 600;
                color: #2D8CFF;
                margin-bottom: 6px;
                font-size: 16px;
                font-family: monospace;
              }
              .scope-description {
                color: #4b5563;
                font-size: 15px;
                line-height: 1.5;
              }
              .info-box {
                background: #EBF5FF;
                border: 1px solid #2D8CFF;
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 24px;
              }
              .info-box h3 {
                color: #2D8CFF;
                margin-top: 0;
                margin-bottom: 8px;
                font-size: 18px;
              }
              .info-box p {
                margin: 0;
                color: #374151;
              }
              .footer {
                margin-top: 40px;
                padding-top: 24px;
                border-top: 1px solid #e5e7eb;
                text-align: center;
                color: #6b7280;
                font-size: 14px;
              }
              a {
                color: #2D8CFF;
                text-decoration: none;
              }
              a:hover {
                text-decoration: underline;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Zoom Permissions Details</h1>
              <p class="subtitle">Webinar Wise requests the following permissions to provide comprehensive analytics</p>
            </div>
            
            <div class="info-box">
              <h3>Why do we need these permissions?</h3>
              <p>To provide you with detailed webinar analytics, engagement insights, and AI-powered recommendations, we need access to your Zoom webinar data. All data is processed securely and never shared with third parties.</p>
            </div>
            
            <div class="scope-section">
              <h2 style="margin-top: 0; color: #1f2937;">Requested Permissions</h2>
              ${consentInfo.detailedScopes.map(scope => `
                <div class="scope">
                  <div class="scope-name">${scope.name}</div>
                  <div class="scope-description">${scope.description}</div>
                </div>
              `).join('')}
            </div>
            
            <div class="scope-section">
              <h2 style="margin-top: 0; color: #1f2937;">Data Security</h2>
              <ul style="color: #4b5563;">
                <li>Your Zoom credentials are never stored by Webinar Wise</li>
                <li>OAuth tokens are encrypted and stored securely</li>
                <li>You can revoke access at any time from your Zoom account settings</li>
                <li>All data transmission is encrypted using HTTPS</li>
              </ul>
            </div>
            
            <div class="footer">
              <p>For more information, please review our:</p>
              <p style="margin-top: 12px;">
                <a href="${consentInfo.privacyUrl}" target="_blank">Privacy Policy</a> | 
                <a href="${consentInfo.termsUrl}" target="_blank">Terms of Service</a> |
                <a href="https://zoom.us/account/apps" target="_blank">Manage Zoom Apps</a>
              </p>
              <p style="margin-top: 16px; font-size: 12px;">
                © 2024 Webinar Wise. All rights reserved.
              </p>
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
                  {/* Concise Summary */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900 font-medium">
                      {consentInfo.summary}
                    </p>
                  </div>

                  {/* Simple Scope List */}
                  <div className="space-y-2">
                    {consentInfo.scopes.map((scope, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-sm font-medium text-gray-900">{scope.name}:</span>
                          <span className="text-sm text-gray-600 ml-1">{scope.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Security and Details */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Shield className="h-4 w-4 text-green-500" />
                      <span>Secure OAuth connection</span>
                    </div>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={handleViewDetails}
                      className="text-blue-600 hover:text-blue-700 p-0"
                    >
                      <Info className="h-4 w-4 mr-1" />
                      View details
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>

                  <div className="text-xs text-gray-500 pt-2">
                    By connecting, you agree to our{' '}
                    <a href={consentInfo.termsUrl} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                      Terms
                    </a>{' '}
                    and{' '}
                    <a href={consentInfo.privacyUrl} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                      Privacy Policy
                    </a>
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
            className="bg-[#2D8CFF] hover:bg-[#0066CC]"
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
