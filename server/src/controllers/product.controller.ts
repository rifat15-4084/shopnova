import { asyncHandler } from '../utils/asyncHandler.js';
import { productService, reviewService, categoryService } from '../services/product.service.js';
import type { AuthedRequest } from '../middleware/auth.js';

export const productController = {
  list: asyncHandler(async (req, res) => {
    const query = (req as any).validatedQuery ?? req.query;
    const result = await productService.list(query);
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
    res.json(result);
  }),

  bySlug: asyncHandler(async (req, res) => {
    const product = await productService.bySlug(req.params.slug);
    const related = await productService.related(product, 4);
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json({ product, related });
  }),

  byId: asyncHandler(async (req, res) => {
    const product = await productService.byId(req.params.id, { allowInactive: true });
    res.json({ product });
  }),

  create: asyncHandler(async (req, res) => {
    const product = await productService.create(req.body);
    res.status(201).json({ product });
  }),

  update: asyncHandler(async (req, res) => {
    const product = await productService.update(req.params.id, req.body);
    res.json({ product });
  }),

  remove: asyncHandler(async (req, res) => {
    await productService.remove(req.params.id);
    res.json({ message: 'Product archived' });
  }),
};

export const reviewController = {
  list: asyncHandler(async (req, res) => {
    const query = (req as any).validatedQuery ?? req.query;
    const result = await reviewService.listForProduct(req.params.productId, query);
    res.json(result);
  }),

  create: asyncHandler(async (req: AuthedRequest, res) => {
    const review = await reviewService.createOrUpdate(req.user!.id, req.params.productId, req.body);
    res.status(201).json({ review });
  }),

  remove: asyncHandler(async (req: AuthedRequest, res) => {
    await reviewService.remove(req.user!.id, req.params.productId);
    res.json({ message: 'Review deleted' });
  }),
};

export const categoryController = {
  list: asyncHandler(async (_req, res) => {
    const categories = await categoryService.list();
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json({ categories });
  }),
  bySlug: asyncHandler(async (req, res) => {
    const category = await categoryService.bySlug(req.params.slug);
    res.json({ category });
  }),
  create: asyncHandler(async (req, res) => {
    const category = await categoryService.create(req.body);
    res.status(201).json({ category });
  }),
  update: asyncHandler(async (req, res) => {
    const category = await categoryService.update(req.params.id, req.body);
    res.json({ category });
  }),
  remove: asyncHandler(async (req, res) => {
    await categoryService.remove(req.params.id);
    res.json({ message: 'Category deleted' });
  }),
};
