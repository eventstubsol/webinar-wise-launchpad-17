
import React from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import EmailTemplates from '@/pages/EmailTemplates';
import Campaigns from '@/pages/Campaigns';
import Segmentation from '@/pages/Segmentation';
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
    <Route
      path={ROUTES.SEGMENTATION}
      element={
        <ProtectedRoute>
          <Segmentation />
        </ProtectedRoute>
      }
    />
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
