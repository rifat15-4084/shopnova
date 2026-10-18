import type { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authService } from '../services/auth.service.js';
import { cartService } from '../services/cart.service.js';
import { setRefreshCookie, clearRefreshCookie, getRefreshCookie } from '../services/cookie.service.js';
import type { AuthedRequest } from '../middleware/auth.js';

export const authController = {
  register: asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    const result = await authService.register({ name, email, password });
    setRefreshCookie(res, result.refreshToken);
    res.status(201).json({
      user: result.user,
      accessToken: result.accessToken,
    });
  }),

  login: asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.login({ email, password }, { ip: req.ip });
    setRefreshCookie(res, result.refreshToken);
    res.json({ user: result.user, accessToken: result.accessToken });
  }),

  refresh: asyncHandler(async (req, res) => {
    const token = getRefreshCookie(req);
    const result = await authService.refresh(token ?? '');
    setRefreshCookie(res, result.refreshToken);
    res.json({ user: result.user, accessToken: result.accessToken });
  }),

  logout: asyncHandler(async (req, res) => {
    await authService.logout(getRefreshCookie(req) ?? '');
    clearRefreshCookie(res);
    res.json({ message: 'Logged out' });
  }),

  logoutAll: asyncHandler(async (req: AuthedRequest, res) => {
    await authService.logoutAll(req.user!.id);
    clearRefreshCookie(res);
    res.json({ message: 'Logged out of all devices' });
  }),

  me: asyncHandler(async (req: AuthedRequest, res) => {
    const user = await authService.me(req.user!.id);
    res.json({ user });
  }),

  updateProfile: asyncHandler(async (req: AuthedRequest, res) => {
    const user = await authService.updateProfile(req.user!.id, req.body);
    res.json({ user });
  }),

  changePassword: asyncHandler(async (req: AuthedRequest, res) => {
    await authService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
    res.json({ message: 'Password updated' });
  }),

  forgotPassword: asyncHandler(async (req, res) => {
    await authService.forgotPassword(req.body.email);
    res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
  }),

  resetPassword: asyncHandler(async (req, res) => {
    await authService.resetPassword(req.body.token, req.body.password);
    res.json({ message: 'Password reset successfully' });
  }),

  mergeCart: asyncHandler(async (req: AuthedRequest, res) => {
    const cart = await cartService.mergeGuestCart(req.user!.id, req.body.items ?? []);
    res.json({ cart });
  }),
};
