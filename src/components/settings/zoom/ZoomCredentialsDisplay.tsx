
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Key, Edit, Trash2, Eye, EyeOff, Shield } from 'lucide-react';
import { ZoomCredentials } from '@/types/zoomCredentials';
import { ZoomCredentialsService } from '@/services/zoom/ZoomCredentialsService';

interface ZoomCredentialsDisplayProps {
  credentials: ZoomCredentials;
  onEdit?: () => void;
  onDeleted?: () => void;
}

export const ZoomCredentialsDisplay: React.FC<ZoomCredentialsDisplayProps> = ({
  credentials,
  onEdit,
  onDeleted,
}) => {
  const [showSecret, setShowSecret] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete these Zoom credentials? This will disconnect your Zoom integration.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const success = await ZoomCredentialsService.deleteCredentials(credentials.id);
      if (success) {
        onDeleted?.();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const maskSecret = (secret: string) => {
    if (secret.length <= 8) return '••••••••';
    return secret.substring(0, 4) + '••••••••' + secret.substring(secret.length - 4);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Zoom OAuth Configuration
            {credentials.is_active && (
              <Badge variant="secondary">Active</Badge>
            )}
          </div>
          <div className="flex gap-2">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {credentials.app_name && (
          <div>
            <label className="text-sm font-medium text-gray-700">App Name</label>
            <p className="text-sm text-gray-900">{credentials.app_name}</p>
          </div>
        )}

        {credentials.description && (
          <div>
            <label className="text-sm font-medium text-gray-700">Description</label>
            <p className="text-sm text-gray-900">{credentials.description}</p>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-gray-700">Account ID</label>
          <p className="text-sm text-gray-900 font-mono">{credentials.account_id}</p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Client ID</label>
          <p className="text-sm text-gray-900 font-mono">{credentials.client_id}</p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Client Secret</label>
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-900 font-mono flex-1">
              {showSecret ? credentials.client_secret : maskSecret(credentials.client_secret)}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSecret(!showSecret)}
            >
              {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Your credentials are stored securely. You can now proceed to connect your Zoom account.
          </AlertDescription>
        </Alert>

        <div className="text-xs text-gray-500">
          <p>Created: {new Date(credentials.created_at).toLocaleDateString()}</p>
          <p>Last updated: {new Date(credentials.updated_at).toLocaleDateString()}</p>
        </div>
      </CardContent>
    </Card>
  );
};
