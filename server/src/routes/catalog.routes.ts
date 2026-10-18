import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { reviewLimiter } from '../middleware/rateLimit.js';
import { productController, reviewController, categoryController } from '../controllers/product.controller.js';
import {
  productListQuerySchema,
  productCreateSchema,
  productUpdateSchema,
  reviewCreateSchema,
  reviewListQuerySchema,
} from '../validators/product.validators.js';
import { categoryCreateSchema, categoryUpdateSchema } from '../validators/commerce.validators.js';

export const productRouter = Router();

productRouter.get('/', validate({ query: productListQuerySchema }), productController.list);
productRouter.get('/slug/:slug', productController.bySlug);
productRouter.get('/:id', productController.byId);
productRouter.post('/', requireAdmin, validate({ body: productCreateSchema }), productController.create);
productRouter.patch('/:id', requireAdmin, validate({ body: productUpdateSchema }), productController.update);
productRouter.delete('/:id', requireAdmin, productController.remove);

export const reviewRouter = Router({ mergeParams: true });

reviewRouter.get('/', validate({ query: reviewListQuerySchema }), reviewController.list);
reviewRouter.post('/', requireAuth, reviewLimiter, validate({ body: reviewCreateSchema }), reviewController.create);
reviewRouter.delete('/', requireAuth, reviewController.remove);

export const categoryRouter = Router();

categoryRouter.get('/', categoryController.list);
categoryRouter.get('/:slug', categoryController.bySlug);
categoryRouter.post('/', requireAdmin, validate({ body: categoryCreateSchema }), categoryController.create);
categoryRouter.patch('/:id', requireAdmin, validate({ body: categoryUpdateSchema }), categoryController.update);
categoryRouter.delete('/:id', requireAdmin, categoryController.remove);
