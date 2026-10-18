import { asyncHandler } from '../utils/asyncHandler.js';
import { authService } from '../services/auth.service.js';
import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { ApiError } from '../utils/errors.js';
import { recordAudit } from '../services/audit.service.js';
import { storeImage, uploadMiddleware } from '../services/upload.service.js';
import { adminStatsService } from '../services/admin-stats.service.js';
import { productService, categoryService, reviewService } from '../services/product.service.js';
import { orderService } from '../services/order.service.js';
import { Order } from '../models/Order.js';
import { Coupon } from '../models/Coupon.js';
import { Review } from '../models/Review.js';
import { round2 } from '../utils/crypto.js';
import type { AuthedRequest } from '../middleware/auth.js';

/* ───────────────────────── Account ───────────────────────── */

export const accountController = {
  addresses: asyncHandler(async (req: AuthedRequest, res) => {
    const user = await authService.me(req.user!.id);
    res.json({ addresses: user.addresses });
  }),

  addAddress: asyncHandler(async (req: AuthedRequest, res) => {
    const user = await User.findById(req.user!.id);
    if (!user) throw ApiError.notFound('User not found');
    if (req.body.isDefault) user.addresses.forEach((a: any) => (a.isDefault = false));
    user.addresses.push(req.body);
    await user.save();
    res.status(201).json({ addresses: user.addresses });
  }),

  updateAddress: asyncHandler(async (req: AuthedRequest, res) => {
    const user = await User.findById(req.user!.id);
    if (!user) throw ApiError.notFound('User not found');
    const address = (user.addresses as any[]).find((a: any) => String(a._id) === req.params.id);
    if (!address) throw ApiError.notFound('Address not found');
    if (req.body.isDefault) user.addresses.forEach((a: any) => (a.isDefault = false));
    address.set(req.body);
    await user.save();
    res.json({ addresses: user.addresses });
  }),

  deleteAddress: asyncHandler(async (req: AuthedRequest, res) => {
    const user = await User.findById(req.user!.id);
    if (!user) throw ApiError.notFound('User not found');
    const address = (user.addresses as any[]).find((a: any) => String(a._id) === req.params.id);
    if (!address) throw ApiError.notFound('Address not found');
    address.deleteOne();
    await user.save();
    res.json({ addresses: user.addresses });
  }),

  wishlist: asyncHandler(async (req: AuthedRequest, res) => {
    const user = await User.findById(req.user!.id).populate({
      path: 'wishlist',
      match: { isActive: true },
      select: 'title slug price compareAtPrice images ratingAverage ratingCount stock category',
      populate: { path: 'category', select: 'name slug' },
    });
    res.json({ items: (user?.wishlist as any[]) ?? [] });
  }),

  toggleWishlist: asyncHandler(async (req: AuthedRequest, res) => {
    const productId = req.params.productId;
    const product = await Product.findById(productId);
    if (!product) throw ApiError.notFound('Product not found');
    const user = await User.findById(req.user!.id);
    if (!user) throw ApiError.notFound('User not found');
    const list = (user.wishlist as any[]).map(String);
    const exists = list.includes(productId);
    user.wishlist = (exists
      ? list.filter((id) => id !== productId)
      : [...list, productId]) as unknown as typeof user.wishlist;
    await user.save();
    res.json({ wishlisted: !exists, wishlist: user.wishlist.map(String) });
  }),
};

/* ───────────────────────── Uploads ───────────────────────── */

export const uploadController = {
  images: asyncHandler(async (req: AuthedRequest, res) => {
    const files = (req.files as Express.Multer.File[]) ?? [];
    if (files.length === 0) throw ApiError.badRequest('No files uploaded');
    const results = [];
    for (const file of files) {
      results.push(await storeImage(file));
    }
    res.status(201).json({ images: results });
  }),
};

/* ───────────────────────── Admin ───────────────────────── */

export const adminStatsController = {
  overview: asyncHandler(async (req, res) => {
    const days = Number((req as any).validatedQuery?.days ?? 30);
    const stats = await adminStatsService.overview(days);
    res.set('Cache-Control', 'no-store');
    res.json(stats);
  }),
  productSales: asyncHandler(async (_req, res) => {
    res.json({ sales: await adminStatsService.productSales() });
  }),
  auditLogs: asyncHandler(async (req, res) => {
    const query = (req as any).validatedQuery ?? req.query;
    res.json(await adminStatsService.auditLogs(query));
  }),
};

export const adminProductController = {
  list: asyncHandler(async (req, res) => {
    const query = { ...((req as any).validatedQuery ?? req.query), limit: Number(req.query.limit ?? 20) };
    // Admin listing includes inactive products
    const result = await productService.list({ ...query, inStock: undefined });
    res.json(result);
  }),

  create: asyncHandler(async (req: AuthedRequest, res) => {
    const product = await productService.create(req.body);
    await recordAudit({
      req,
      actorId: req.user!.id,
      actorEmail: req.user!.name,
      action: 'product.create',
      entity: 'Product',
      entityId: String(product._id),
      after: { title: product.title, price: product.price, stock: product.stock },
    });
    res.status(201).json({ product });
  }),

  update: asyncHandler(async (req: AuthedRequest, res) => {
    const before = await productService.byId(req.params.id, { allowInactive: true });
    const product = await productService.update(req.params.id, req.body);
    await recordAudit({
      req,
      actorId: req.user!.id,
      actorEmail: req.user!.name,
      action: 'product.update',
      entity: 'Product',
      entityId: String(product._id),
      before: { title: before.title, price: before.price, stock: before.stock, isActive: before.isActive },
      after: { title: product.title, price: product.price, stock: product.stock, isActive: product.isActive },
    });
    res.json({ product });
  }),

  remove: asyncHandler(async (req: AuthedRequest, res) => {
    await productService.remove(req.params.id);
    await recordAudit({
      req,
      actorId: req.user!.id,
      actorEmail: req.user!.name,
      action: 'product.delete',
      entity: 'Product',
      entityId: req.params.id,
    });
    res.json({ message: 'Product archived' });
  }),

  bulk: asyncHandler(async (req: AuthedRequest, res) => {
    const { action, ids } = req.body as { action: 'activate' | 'deactivate' | 'feature' | 'unfeature' | 'delete'; ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) throw ApiError.badRequest('No products selected');
    const map: Record<string, Record<string, unknown>> = {
      activate: { isActive: true },
      deactivate: { isActive: false },
      feature: { isFeatured: true },
      unfeature: { isFeatured: false },
      delete: { isActive: false },
    };
    const update = map[action];
    if (!update) throw ApiError.badRequest('Unknown bulk action');
    const result = await Product.updateMany({ _id: { $in: ids } }, { $set: update });
    await recordAudit({
      req,
      actorId: req.user!.id,
      actorEmail: req.user!.name,
      action: `product.bulk.${action}`,
      entity: 'Product',
      after: { count: result.modifiedCount, ids },
    });
    res.json({ modified: result.modifiedCount });
  }),
};

export const adminCategoryController = {
  list: asyncHandler(async (_req, res) => {
    res.json({ categories: await categoryService.list(true) });
  }),
  create: asyncHandler(async (req: AuthedRequest, res) => {
    const category = await categoryService.create(req.body);
    await recordAudit({
      req,
      actorId: req.user!.id,
      action: 'category.create',
      entity: 'Category',
      entityId: String(category._id),
      after: { name: category.name },
    });
    res.status(201).json({ category });
  }),
  update: asyncHandler(async (req: AuthedRequest, res) => {
    const category = await categoryService.update(req.params.id, req.body);
    await recordAudit({
      req,
      actorId: req.user!.id,
      action: 'category.update',
      entity: 'Category',
      entityId: req.params.id,
      after: { name: category.name, isActive: category.isActive },
    });
    res.json({ category });
  }),
  remove: asyncHandler(async (req: AuthedRequest, res) => {
    await categoryService.remove(req.params.id);
    await recordAudit({
      req,
      actorId: req.user!.id,
      action: 'category.delete',
      entity: 'Category',
      entityId: req.params.id,
    });
    res.json({ message: 'Category deleted' });
  }),
};

export const adminOrderController = {
  list: asyncHandler(async (req, res) => {
    const query = (req as any).validatedQuery ?? req.query;
    res.json(await adminStatsService.listOrders(query));
  }),

  get: asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id).populate('user', 'name email');
    if (!order) throw ApiError.notFound('Order not found');
    res.json({ order });
  }),

  updateStatus: asyncHandler(async (req: AuthedRequest, res) => {
    const { status, trackingNumber, carrier, note } = req.body;
    const order = await orderService.updateStatus(req.params.id, status, {
      trackingNumber,
      carrier,
      note,
      actorId: req.user!.id,
    });
    await recordAudit({
      req,
      actorId: req.user!.id,
      actorEmail: req.user!.name,
      action: 'order.status',
      entity: 'Order',
      entityId: String(order._id),
      after: { status, trackingNumber },
    });
    res.json({ order });
  }),

  refund: asyncHandler(async (req: AuthedRequest, res) => {
    const order = await orderService.refund(req.params.id, req.user!.id, req.body?.amount);
    await recordAudit({
      req,
      actorId: req.user!.id,
      actorEmail: req.user!.name,
      action: 'order.refund',
      entity: 'Order',
      entityId: String(order._id),
      after: { refundAmount: order.refundAmount, paymentStatus: order.paymentStatus },
    });
    res.json({ order });
  }),

  exportCsv: asyncHandler(async (req, res) => {
    const { items } = await adminStatsService.listOrders({
      status: (req.query.status as string) || undefined,
      q: (req.query.q as string) || undefined,
      limit: 1000,
    });
    const header = [
      'orderNumber',
      'date',
      'customer',
      'phone',
      'city',
      'items',
      'subtotal',
      'shipping',
      'tax',
      'discount',
      'total',
      'currency',
      'paymentMethod',
      'paymentStatus',
      'status',
      'trackingNumber',
    ];
    const rows = items.map((o: any) => [
      o.orderNumber,
      new Date(o.createdAt).toISOString(),
      o.shippingAddress?.fullName ?? '',
      o.shippingAddress?.phone ?? '',
      o.shippingAddress?.city ?? '',
      (o.items ?? []).map((i: any) => `${i.title} x${i.qty}`).join(' | '),
      o.itemsSubtotal,
      o.shippingCost,
      o.tax,
      o.discount,
      o.total,
      o.currency,
      o.paymentMethod,
      o.paymentStatus,
      o.status,
      o.trackingNumber ?? '',
    ]);
    const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [header.join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
    res.send(csv);
  }),
};

export const adminCustomerController = {
  list: asyncHandler(async (req, res) => {
    const query = (req as any).validatedQuery ?? req.query;
    res.json(await adminStatsService.listCustomers(query));
  }),

  get: asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select('-refreshTokens');
    if (!user) throw ApiError.notFound('Customer not found');
    const orders = await Order.find({ user: user._id }).sort({ createdAt: -1 }).limit(50);
    const spent = round2(orders.reduce((s, o) => s + (o.status === 'cancelled' ? 0 : Number(o.total)), 0));
    res.json({ customer: { ...(user.toJSON() as any), orderCount: orders.length, totalSpent: spent }, orders });
  }),

  update: asyncHandler(async (req: AuthedRequest, res) => {
    const user = await User.findById(req.params.id);
    if (!user) throw ApiError.notFound('Customer not found');
    if (req.body.role && req.user!.id === String(user._id)) {
      throw ApiError.badRequest('You cannot change your own role');
    }
    user.set(req.body);
    await user.save();
    await recordAudit({
      req,
      actorId: req.user!.id,
      actorEmail: req.user!.name,
      action: 'customer.update',
      entity: 'User',
      entityId: String(user._id),
      after: { isActive: user.isActive, role: user.role },
    });
    res.json({ customer: user.toJSON() });
  }),
};

export const adminCouponController = {
  list: asyncHandler(async (_req, res) => {
    const coupons = await Coupon.find({}).sort({ createdAt: -1 });
    res.json({ coupons });
  }),

  create: asyncHandler(async (req: AuthedRequest, res) => {
    const exists = await Coupon.findOne({ code: req.body.code });
    if (exists) throw ApiError.conflict('A coupon with this code already exists');
    const coupon = await Coupon.create(req.body);
    await recordAudit({
      req,
      actorId: req.user!.id,
      action: 'coupon.create',
      entity: 'Coupon',
      entityId: String(coupon._id),
      after: { code: coupon.code, type: coupon.type, value: coupon.value },
    });
    res.status(201).json({ coupon });
  }),

  update: asyncHandler(async (req: AuthedRequest, res) => {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) throw ApiError.notFound('Coupon not found');
    coupon.set(req.body);
    await coupon.save();
    await recordAudit({
      req,
      actorId: req.user!.id,
      action: 'coupon.update',
      entity: 'Coupon',
      entityId: String(coupon._id),
      after: { code: coupon.code, isActive: coupon.isActive },
    });
    res.json({ coupon });
  }),

  remove: asyncHandler(async (req: AuthedRequest, res) => {
    await Coupon.deleteOne({ _id: req.params.id });
    await recordAudit({
      req,
      actorId: req.user!.id,
      action: 'coupon.delete',
      entity: 'Coupon',
      entityId: req.params.id,
    });
    res.json({ message: 'Coupon deleted' });
  }),
};

export const adminReviewController = {
  list: asyncHandler(async (req, res) => {
    const query = (req as any).validatedQuery ?? req.query;
    res.json(await adminStatsService.reviewModeration(query));
  }),

  moderate: asyncHandler(async (req: AuthedRequest, res) => {
    const review = await Review.findById(req.params.id);
    if (!review) throw ApiError.notFound('Review not found');
    review.isApproved = Boolean(req.body.isApproved);
    await review.save();
    await productService.recalcRating(review.product);
    await recordAudit({
      req,
      actorId: req.user!.id,
      action: review.isApproved ? 'review.approve' : 'review.reject',
      entity: 'Review',
      entityId: String(review._id),
    });
    res.json({ review });
  }),

  remove: asyncHandler(async (req: AuthedRequest, res) => {
    const review = await Review.findById(req.params.id);
    if (!review) throw ApiError.notFound('Review not found');
    const productId = review.product;
    await review.deleteOne();
    await productService.recalcRating(productId);
    await recordAudit({
      req,
      actorId: req.user!.id,
      action: 'review.delete',
      entity: 'Review',
      entityId: req.params.id,
    });
    res.json({ message: 'Review deleted' });
  }),
};

export { reviewService };
