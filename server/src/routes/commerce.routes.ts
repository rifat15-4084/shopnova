import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { checkoutLimiter } from '../middleware/rateLimit.js';
import {
  cartController,
  checkoutController,
  orderController,
} from '../controllers/commerce.controller.js';
import { accountController, uploadController } from '../controllers/admin.controller.js';
import {
  cartItemSchema,
  cartItemUpdateSchema,
  couponApplySchema,
  checkoutSessionSchema,
  placeOrderSchema,
  couponValidateSchema,
  orderListQuerySchema,
} from '../validators/commerce.validators.js';
import { addressInputSchema, updateAddressSchema } from '../validators/auth.validators.js';
import { uploadMiddleware } from '../services/upload.service.js';
import { productRouter, reviewRouter } from './catalog.routes.js';

export const cartRouter = Router();
cartRouter.use(requireAuth);
cartRouter.get('/', cartController.get);
cartRouter.post('/items', validate({ body: cartItemSchema }), cartController.addItem);
cartRouter.patch('/items', validate({ body: cartItemUpdateSchema }), cartController.updateItem);
cartRouter.delete('/items/:productId', cartController.removeItem);
cartRouter.delete('/', cartController.clear);
cartRouter.post('/coupon', validate({ body: couponApplySchema }), cartController.setCoupon);

export const checkoutRouter = Router();
checkoutRouter.get('/config', checkoutController.config);
checkoutRouter.get('/preview', requireAuth, checkoutController.preview);
checkoutRouter.get('/coupon', requireAuth, validate({ query: couponValidateSchema }), checkoutController.validateCoupon);
checkoutRouter.post('/session', requireAuth, checkoutLimiter, validate({ body: checkoutSessionSchema }), checkoutController.createSession);
checkoutRouter.post('/order', requireAuth, checkoutLimiter, validate({ body: placeOrderSchema }), checkoutController.placeOrder);

export const orderRouter = Router();
orderRouter.use(requireAuth);
orderRouter.get('/', validate({ query: orderListQuerySchema }), orderController.mine);
orderRouter.get('/number/:orderNumber', orderController.getByNumber);
orderRouter.get('/:id', orderController.get);
orderRouter.get('/:id/invoice', orderController.invoice);
orderRouter.post('/:id/cancel', orderController.cancel);

export const accountRouter = Router();
accountRouter.use(requireAuth);
accountRouter.get('/addresses', accountController.addresses);
accountRouter.post('/addresses', validate({ body: addressInputSchema }), accountController.addAddress);
accountRouter.patch('/addresses/:id', validate({ body: updateAddressSchema }), accountController.updateAddress);
accountRouter.delete('/addresses/:id', accountController.deleteAddress);
accountRouter.get('/wishlist', accountController.wishlist);
accountRouter.post('/wishlist/:productId/toggle', accountController.toggleWishlist);

export const uploadRouter = Router();
uploadRouter.post(
  '/images',
  requireAuth,
  uploadMiddleware.array('images', 8),
  uploadController.images,
);

export { productRouter, reviewRouter };
