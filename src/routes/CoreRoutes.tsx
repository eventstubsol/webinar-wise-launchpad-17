
import React from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import Dashboard from '@/pages/Dashboard';
import Settings from '@/pages/Settings';
import { ROUTES } from './routeConfig';

export const CoreRoutes = () => (
  <>
    <Route
      path={ROUTES.DASHBOARD}
      element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      }
    />
    <Route
      path={ROUTES.SETTINGS}
      element={
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      }
    />
  </>
);
