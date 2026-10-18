import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  adminStatsController,
  adminProductController,
  adminCategoryController,
  adminOrderController,
  adminCustomerController,
  adminCouponController,
  adminReviewController,
} from '../controllers/admin.controller.js';
import {
  productCreateSchema,
  productUpdateSchema,
} from '../validators/product.validators.js';
import {
  orderStatusSchema,
  refundSchema,
  adminOrderListQuerySchema,
  adminCustomerListQuerySchema,
  couponCreateSchema,
  couponUpdateSchema,
  categoryCreateSchema,
  categoryUpdateSchema,
  customerUpdateSchema,
  statsQuerySchema,
  reviewModerationSchema,
} from '../validators/admin.validators.js';

export const adminRouter = Router();
adminRouter.use(requireAdmin);

/* Stats */
adminRouter.get('/stats/overview', validate({ query: statsQuerySchema }), adminStatsController.overview);
adminRouter.get('/stats/product-sales', adminStatsController.productSales);
adminRouter.get('/audit', adminStatsController.auditLogs);

/* Products */
adminRouter.get('/products', adminProductController.list);
adminRouter.post('/products', validate({ body: productCreateSchema }), adminProductController.create);
adminRouter.patch('/products/bulk', adminProductController.bulk);
adminRouter.get('/products/:id', adminProductController.list);
adminRouter.patch('/products/:id', validate({ body: productUpdateSchema }), adminProductController.update);
adminRouter.delete('/products/:id', adminProductController.remove);

/* Categories */
adminRouter.get('/categories', adminCategoryController.list);
adminRouter.post('/categories', validate({ body: categoryCreateSchema }), adminCategoryController.create);
adminRouter.patch('/categories/:id', validate({ body: categoryUpdateSchema }), adminCategoryController.update);
adminRouter.delete('/categories/:id', adminCategoryController.remove);

/* Orders */
adminRouter.get('/orders', validate({ query: adminOrderListQuerySchema }), adminOrderController.list);
adminRouter.get('/orders/export', adminOrderController.exportCsv);
adminRouter.get('/orders/:id', adminOrderController.get);
adminRouter.patch('/orders/:id/status', validate({ body: orderStatusSchema }), adminOrderController.updateStatus);
adminRouter.post('/orders/:id/refund', validate({ body: refundSchema }), adminOrderController.refund);

/* Customers */
adminRouter.get('/customers', validate({ query: adminCustomerListQuerySchema }), adminCustomerController.list);
adminRouter.get('/customers/:id', adminCustomerController.get);
adminRouter.patch('/customers/:id', validate({ body: customerUpdateSchema }), adminCustomerController.update);

/* Coupons */
adminRouter.get('/coupons', adminCouponController.list);
adminRouter.post('/coupons', validate({ body: couponCreateSchema }), adminCouponController.create);
adminRouter.patch('/coupons/:id', validate({ body: couponUpdateSchema }), adminCouponController.update);
adminRouter.delete('/coupons/:id', adminCouponController.remove);

/* Reviews moderation */
adminRouter.get('/reviews', adminReviewController.list);
adminRouter.patch('/reviews/:id', validate({ body: reviewModerationSchema }), adminReviewController.moderate);
adminRouter.delete('/reviews/:id', adminReviewController.remove);
