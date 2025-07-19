
import React from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
// ZoomTest page removed in favor of simplified unified sync
import ZoomDiagnostics from '@/pages/ZoomDiagnostics';
import { ROUTES } from './routeConfig';

export const ZoomRoutes = () => (
  <>
    {/* ZoomTest route removed - functionality integrated into SyncCenter */}
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
