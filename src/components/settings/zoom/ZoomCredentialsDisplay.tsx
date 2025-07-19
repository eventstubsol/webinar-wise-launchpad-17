
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Edit, Trash2, CheckCircle, Key } from 'lucide-react';
import { ZoomCredentials } from '@/types/zoomCredentials';
import { useZoomCredentials } from '@/hooks/useZoomCredentials';

interface ZoomCredentialsDisplayProps {
  credentials: ZoomCredentials;
  onEdit: () => void;
  onDeleted: () => void;
}

export const ZoomCredentialsDisplay: React.FC<ZoomCredentialsDisplayProps> = ({
  credentials,
  onEdit,
  onDeleted
}) => {
  const { deleteCredentials, isDeleting } = useZoomCredentials();
  const [showSecrets, setShowSecrets] = useState(false);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete these credentials? This will disconnect your Zoom integration.')) {
      await deleteCredentials(credentials.id);
      onDeleted();
    }
  };

  const maskSecret = (secret: string) => {
    if (!secret) return '';
    if (secret.length <= 8) return '*'.repeat(secret.length);
    return secret.slice(0, 4) + '*'.repeat(secret.length - 8) + secret.slice(-4);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Zoom Server-to-Server OAuth App
          </div>
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Configured
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Your Zoom credentials are configured and ready for use. You can now validate your connection.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Account ID</label>
              <div className="mt-1 p-2 bg-gray-50 rounded border text-sm">
                {showSecrets ? credentials.account_id : maskSecret(credentials.account_id)}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Client ID</label>
              <div className="mt-1 p-2 bg-gray-50 rounded border text-sm">
                {showSecrets ? credentials.client_id : maskSecret(credentials.client_id)}
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Client Secret</label>
            <div className="mt-1 p-2 bg-gray-50 rounded border text-sm">
              {showSecrets ? credentials.client_secret : maskSecret(credentials.client_secret)}
            </div>
          </div>

          {credentials.app_name && (
            <div>
              <label className="text-sm font-medium text-gray-700">App Name</label>
              <div className="mt-1 p-2 bg-gray-50 rounded border text-sm">
                {credentials.app_name}
              </div>
            </div>
          )}

          {credentials.description && (
            <div>
              <label className="text-sm font-medium text-gray-700">Description</label>
              <div className="mt-1 p-2 bg-gray-50 rounded border text-sm">
                {credentials.description}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSecrets(!showSecrets)}
          >
            {showSecrets ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Hide Secrets
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Show Secrets
              </>
            )}
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>

        <Alert>
          <AlertDescription>
            <strong>Created:</strong> {new Date(credentials.created_at).toLocaleDateString()} • 
            <strong> Last Updated:</strong> {new Date(credentials.updated_at).toLocaleDateString()}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
