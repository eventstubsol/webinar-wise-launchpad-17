
import React from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import Webinars from '@/pages/Webinars';
import SyncCenter from '@/pages/SyncCenter';
import CSVUpload from '@/pages/CSVUpload';
import { ROUTES } from './routeConfig';

export const DataRoutes = () => (
  <>
    <Route
      path={ROUTES.WEBINARS}
      element={
        <ProtectedRoute>
          <Webinars />
        </ProtectedRoute>
      }
    />
    <Route
      path={ROUTES.SYNC_CENTER}
      element={
        <ProtectedRoute>
          <SyncCenter />
        </ProtectedRoute>
      }
    />
    <Route
      path={ROUTES.CSV_UPLOAD}
      element={
        <ProtectedRoute>
          <CSVUpload />
        </ProtectedRoute>
      }
    />
  </>
);
