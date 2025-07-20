
import React from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import ZoomTest from '@/pages/ZoomTest';
import ZoomDiagnostics from '@/pages/ZoomDiagnostics';
import { ROUTES } from './routeConfig';

export const ZoomRoutes = () => (
  <>
    <Route
      path={ROUTES.ZOOM_TEST}
      element={
        <ProtectedRoute>
          <ZoomTest />
        </ProtectedRoute>
      }
    />
    <Route
      path={ROUTES.ZOOM_DIAGNOSTICS}
      element={
        <ProtectedRoute>
          <ZoomDiagnostics />
        </ProtectedRoute>
      }
    />
  </>
);
