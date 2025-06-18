
import React from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import Reports from '@/pages/Reports';
import { ROUTES } from './routeConfig';

export const ReportRoutes = () => (
  <>
    <Route
      path={ROUTES.REPORTS}
      element={
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      }
    />
  </>
);
