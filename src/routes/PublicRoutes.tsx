
import React from 'react';
import { Route } from 'react-router-dom';
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import VerifyEmail from '@/pages/VerifyEmail';
import Unsubscribe from '@/pages/Unsubscribe';
import { ROUTES } from './routeConfig';

export const PublicRoutes = () => (
  <>
    <Route path={ROUTES.HOME} element={<Landing />} />
    <Route path={ROUTES.LOGIN} element={<Login />} />
    <Route path={ROUTES.REGISTER} element={<Register />} />
    <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
    <Route path={ROUTES.RESET_PASSWORD} element={<ResetPassword />} />
    <Route path={ROUTES.VERIFY_EMAIL} element={<VerifyEmail />} />
    <Route path={ROUTES.UNSUBSCRIBE} element={<Unsubscribe />} />
  </>
);
