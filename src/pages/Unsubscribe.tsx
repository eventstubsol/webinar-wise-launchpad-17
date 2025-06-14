import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Toaster, toast } from 'sonner';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface Preferences {
  marketing?: boolean;
  product_updates?: boolean;
  newsletters?: boolean;
}

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<Preferences>({});
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const t = searchParams.get('token');
    if (t) {
      setToken(t);
    } else {
      setError('No management token provided.');
      setLoading(false);
    }
  }, [searchParams]);

  const fetchPreferences = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke(`manage-email-preferences?token=${token}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      setPreferences(data.preferences || {});
      setEmail(data.email || '');
    } catch (e: any) {
      setError(e.message || 'Failed to load preferences.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const handlePreferenceChange = (key: keyof Preferences, checked: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: checked }));
  };

  const handleSave = async () => {
    if (!token) return;
    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke(`manage-email-preferences?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences }),
      });
      
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      toast.success('Your preferences have been updated.');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save preferences.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleUnsubscribeAll = () => {
      setPreferences({
          marketing: false,
          product_updates: false,
          newsletters: false,
      });
      setTimeout(handleSave, 100);
  }

  if (loading) {
    return <div className="h-screen flex items-center justify-center"><LoadingSpinner /></div>;
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Toaster />
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Manage Your Email Preferences</CardTitle>
            <CardDescription>
              You are managing preferences for <strong>{email}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="marketing" checked={!!preferences.marketing} onCheckedChange={(c) => handlePreferenceChange('marketing', !!c)} />
                <Label htmlFor="marketing" className="flex flex-col">
                  <span>Marketing & Promotions</span>
                  <span className="text-xs text-muted-foreground">Receive promotional offers and news.</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="product_updates" checked={!!preferences.product_updates} onCheckedChange={(c) => handlePreferenceChange('product_updates', !!c)} />
                <Label htmlFor="product_updates" className="flex flex-col">
                  <span>Product Updates</span>
                  <span className="text-xs text-muted-foreground">Get notified about new features and improvements.</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="newsletters" checked={!!preferences.newsletters} onCheckedChange={(c) => handlePreferenceChange('newsletters', !!c)} />
                <Label htmlFor="newsletters" className="flex flex-col">
                  <span>Newsletters</span>
                  <span className="text-xs text-muted-foreground">Receive our regular newsletters.</span>
                </Label>
              </div>
            </div>
            <div className="flex justify-between items-center pt-4 border-t">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <LoadingSpinner size="sm" /> : 'Save Preferences'}
              </Button>
               <Button variant="link" className="text-red-600" onClick={handleUnsubscribeAll}>
                Unsubscribe from all
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Unsubscribe;
