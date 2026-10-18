import { Router } from 'express';
import authRouter from './auth.routes.js';
import { productRouter, reviewRouter, categoryRouter } from './catalog.routes.js';
import { cartRouter, checkoutRouter, orderRouter, accountRouter, uploadRouter } from './commerce.routes.js';
import { adminRouter } from './admin.routes.js';
import { webhookController } from '../controllers/commerce.controller.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/products', productRouter);
router.use('/products/:productId/reviews', reviewRouter);
router.use('/categories', categoryRouter);
router.use('/cart', cartRouter);
router.use('/checkout', checkoutRouter);
router.use('/orders', orderRouter);
router.use('/account', accountRouter);
router.use('/uploads', uploadRouter);
router.use('/admin', adminRouter);
router.post('/webhooks/stripe', webhookController.stripe);

export default router;
