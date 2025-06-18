
import React from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import CRMIntegrations from '@/pages/CRMIntegrations';
import Integrations from '@/pages/Integrations';
import { ROUTES } from './routeConfig';

export const IntegrationRoutes = () => (
  <>
    <Route
      path={ROUTES.CRM}
      element={
        <ProtectedRoute>
          <CRMIntegrations />
        </ProtectedRoute>
      }
    />
    <Route
      path={ROUTES.INTEGRATIONS}
      element={
        <ProtectedRoute>
          <Integrations />
        </ProtectedRoute>
      }
    />
  </>
);
