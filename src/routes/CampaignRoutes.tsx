
import React from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import EmailTemplates from '@/pages/EmailTemplates';
import Campaigns from '@/pages/Campaigns';
// Segmentation page removed
import Personalization from '@/pages/Personalization';
import { ROUTES } from './routeConfig';

export const CampaignRoutes = () => (
  <>
    <Route
      path={ROUTES.TEMPLATES}
      element={
        <ProtectedRoute>
          <EmailTemplates />
        </ProtectedRoute>
      }
    />
    <Route
      path={ROUTES.CAMPAIGNS}
      element={
        <ProtectedRoute>
          <Campaigns />
        </ProtectedRoute>
      }
    />
    {/* Segmentation route removed */}
    <Route
      path={ROUTES.PERSONALIZATION}
      element={
        <ProtectedRoute>
          <Personalization />
        </ProtectedRoute>
      }
    />
  </>
);
