import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';
import { Review } from '../models/Review.js';
import { Coupon } from '../models/Coupon.js';
import { round2 } from '../utils/crypto.js';

function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

export const adminStatsService = {
  async overview(days = 30) {
    const now = new Date();
    const start = daysAgo(days);
    const prevStart = daysAgo(days * 2);

    const [current, previous, revenueByDay, ordersByStatus, topProducts, lowStock, recentOrders, totals] =
      await Promise.all([
        Order.aggregate([
          { $match: { createdAt: { $gte: start }, status: { $ne: 'cancelled' } } },
          { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
        ]),
        Order.aggregate([
          { $match: { createdAt: { $gte: prevStart, $lt: start }, status: { $ne: 'cancelled' } } },
          { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
        ]),
        Order.aggregate([
          { $match: { createdAt: { $gte: start }, status: { $ne: 'cancelled' } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              revenue: { $sum: '$total' },
              orders: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
        Order.aggregate([
          { $match: { createdAt: { $gte: start }, status: { $nin: ['cancelled', 'refunded'] } } },
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.product',
              title: { $first: '$items.title' },
              image: { $first: '$items.image' },
              qty: { $sum: '$items.qty' },
              revenue: { $sum: '$items.lineTotal' },
            },
          },
          { $sort: { qty: -1 } },
          { $limit: 5 },
        ]),
        Product.find({ isActive: true, stock: { $lte: 5 } })
          .select('title slug images stock price')
          .sort({ stock: 1 })
          .limit(8),
        Order.find({}).sort({ createdAt: -1 }).limit(8).populate('user', 'name email'),
        Promise.all([User.countDocuments({}), Order.countDocuments({}), Product.countDocuments({ isActive: true })]),
      ]);

    const cur = current[0] ?? { revenue: 0, orders: 0 };
    const prev = previous[0] ?? { revenue: 0, orders: 0 };
    const customers = totals[0] ?? 0;
    const revenue = round2(cur.revenue);
    const orders = cur.orders;
    const aov = orders > 0 ? round2(cur.revenue / orders) : 0;

    const pct = (a: number, b: number) => (b === 0 ? (a > 0 ? 100 : 0) : round2(((a - b) / b) * 100));

    return {
      kpis: {
        revenue,
        revenueChangePct: pct(revenue, round2(prev.revenue)),
        orders,
        ordersChangePct: pct(orders, prev.orders),
        customers,
        customersChangePct: 0,
        aov,
        aovChangePct: pct(aov, prev.orders > 0 ? round2(prev.revenue / prev.orders) : 0),
      },
      periodDays: days,
      revenueByDay: revenueByDay.map((d) => ({ date: d._id, revenue: round2(d.revenue), orders: d.orders })),
      ordersByStatus: ordersByStatus.map((s) => ({ status: s._id, count: s.count })),
      topProducts: topProducts.map((p) => ({
        productId: String(p._id),
        title: p.title,
        image: p.image,
        qty: p.qty,
        revenue: round2(p.revenue),
      })),
      lowStock: lowStock.map((p) => ({
        productId: String(p._id),
        title: p.title,
        slug: p.slug,
        image: p.images?.[0] ?? '',
        stock: p.stock,
        price: p.price,
      })),
      recentOrders: recentOrders.map((o) => ({
        id: String(o._id),
        orderNumber: o.orderNumber,
        total: o.total,
        status: o.status,
        createdAt: o.createdAt,
        customer: (o.user as any)?.name ?? 'Unknown',
      })),
      now,
    };
  },

  async listOrders(query: {
    page?: number;
    limit?: number;
    status?: string;
    q?: string;
    from?: string;
    to?: string;
  }) {
    const { normalizePagination, paginate } = await import('../utils/pagination.js');
    const { page, limit, skip } = normalizePagination(query, 50);
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.q) {
      const safe = query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { orderNumber: { $regex: safe, $options: 'i' } },
        { 'shippingAddress.fullName': { $regex: safe, $options: 'i' } },
        { 'shippingAddress.phone': { $regex: safe, $options: 'i' } },
      ];
    }
    if (query.from || query.to) {
      filter.createdAt = {};
      if (query.from) (filter.createdAt as any).$gte = new Date(query.from);
      if (query.to) {
        const to = new Date(query.to);
        to.setHours(23, 59, 59, 999);
        (filter.createdAt as any).$lte = to;
      }
    }
    const [items, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('user', 'name email'),
      Order.countDocuments(filter),
    ]);
    return paginate(items, total, page, limit);
  },

  async listCustomers(query: { page?: number; limit?: number; q?: string; role?: string }) {
    const { normalizePagination, paginate } = await import('../utils/pagination.js');
    const { page, limit, skip } = normalizePagination(query, 50);
    const filter: Record<string, unknown> = {};
    if (query.role) filter.role = query.role;
    if (query.q) {
      const safe = query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [{ name: { $regex: safe, $options: 'i' } }, { email: { $regex: safe, $options: 'i' } }];
    }
    const [items, total, orderCounts] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
      Order.aggregate([
        { $group: { _id: '$user', orders: { $sum: 1 }, spent: { $sum: '$total' } } },
        { $project: { orders: 1, spent: { $round: ['$spent', 2] } } },
      ]),
    ]);
    const statsByUser = new Map(orderCounts.map((s) => [String(s._id), s]));
    const enriched = items.map((u) => {
      const stats = statsByUser.get(String(u._id)) ?? { orders: 0, spent: 0 };
      const json = u.toJSON() as Record<string, unknown>;
      return { ...json, orderCount: stats.orders, totalSpent: stats.spent };
    });
    return paginate(enriched, total, page, limit);
  },

  async auditLogs(query: { page?: number; limit?: number; action?: string }) {
    const { normalizePagination, paginate } = await import('../utils/pagination.js');
    const { AuditLog } = await import('../models/AuditLog.js');
    const { page, limit, skip } = normalizePagination(query, 50);
    const filter: Record<string, unknown> = {};
    if (query.action) filter.action = query.action;
    const [items, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      AuditLog.countDocuments(filter),
    ]);
    return paginate(items, total, page, limit);
  },

  async productSales() {
    return Order.aggregate([
      { $match: { status: { $nin: ['cancelled', 'refunded'] } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          title: { $first: '$items.title' },
          qty: { $sum: '$items.qty' },
          revenue: { $sum: '$items.lineTotal' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 20 },
    ]);
  },

  async couponUsage() {
    return Coupon.find({}).sort({ usedCount: -1 }).limit(20);
  },

  async reviewModeration(query: { page?: number; limit?: number; pending?: boolean }) {
    const { normalizePagination, paginate } = await import('../utils/pagination.js');
    const { page, limit, skip } = normalizePagination(query, 50);
    const filter: Record<string, unknown> = {};
    if (query.pending) filter.isApproved = false;
    const [items, total] = await Promise.all([
      Review.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email')
        .populate('product', 'title slug'),
      Review.countDocuments(filter),
    ]);
    return paginate(items, total, page, limit);
  },
};
