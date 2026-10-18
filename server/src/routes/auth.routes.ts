import { Router } from 'express';
import { authLimiter } from '../middleware/rateLimit.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authController } from '../controllers/auth.controller.js';
import {
  registerSchema,
  loginSchema,
  forgotSchema,
  resetSchema,
  changePasswordSchema,
  updateProfileSchema,
  mergeCartSchema,
} from '../validators/auth.validators.js';

const router = Router();

router.post('/register', authLimiter, validate({ body: registerSchema }), authController.register);
router.post('/login', authLimiter, validate({ body: loginSchema }), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/logout-all', requireAuth, authController.logoutAll);
router.get('/me', requireAuth, authController.me);
router.patch('/me', requireAuth, validate({ body: updateProfileSchema }), authController.updateProfile);
router.post('/change-password', requireAuth, authLimiter, validate({ body: changePasswordSchema }), authController.changePassword);
router.post('/forgot-password', authLimiter, validate({ body: forgotSchema }), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate({ body: resetSchema }), authController.resetPassword);
router.post('/merge-cart', requireAuth, validate({ body: mergeCartSchema }), authController.mergeCart);

export default router;
