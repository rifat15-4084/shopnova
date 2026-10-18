import request from 'supertest';
import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { createApp } from '../app.js';
import { User } from '../models/User.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { Cart } from '../models/Cart.js';
import { Coupon } from '../models/Coupon.js';
import { signAccessToken } from '../services/token.service.js';

const app = createApp();

async function makeUser(role: 'customer' | 'admin' = 'customer') {
  const n = Math.random().toString(36).slice(2, 8);
  const user = await User.create({
    name: `User ${n}`,
    email: `${n}@test.dev`,
    passwordHash: await bcrypt.hash('Password123', 4),
    role,
  });
  const token = signAccessToken({ sub: String(user._id), role, name: user.name });
  return { user, token };
}

async function makeProduct(overrides: Record<string, unknown> = {}) {
  const cat = await Category.create({ name: `Cat ${Math.random().toString(36).slice(2, 6)}` });
  const n = Math.random().toString(36).slice(2, 8);
  return Product.create({
    title: `Product ${n}`,
    slug: `product-${n}`,
    description: `Description for product ${n} long enough to validate.`,
    price: 50,
    category: cat._id,
    stock: 20,
    ...overrides,
  });
}

const ADDRESS = {
  fullName: 'Test Buyer',
  phone: '+8801712345678',
  line1: 'House 1, Road 2',
  city: 'Dhaka',
  region: 'Dhaka',
  upazila: 'Gulshan',
  postalCode: '1212',
  country: 'Bangladesh',
};

describe('COD orders, stock and refunds', () => {
  it('places a COD order, reduces stock atomically and clears the cart', async () => {
    const { user, token } = await makeUser();
    const product = await makeProduct({ price: 50, stock: 10 });

    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: String(product._id), qty: 3 })
      .expect(201);

    const res = await request(app)
      .post('/api/checkout/order')
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentMethod: 'cod', shippingAddress: ADDRESS })
      .expect(201);

    const order = res.body.order;
    expect(order.orderNumber).toMatch(/^SN-/);
    expect(order.status).toBe('pending');
    expect(order.paymentMethod).toBe('cod');
    expect(order.itemsSubtotal).toBe(150);
    // $150 ≥ the $100 free-shipping threshold → no flat rate; tax is 5%
    expect(order.shippingCost).toBe(0);
    expect(order.tax).toBe(7.5);
    expect(order.total).toBe(157.5);

    const after = await Product.findById(product._id);
    expect(after!.stock).toBe(7);

    const cart = await Cart.findOne({ user: user._id });
    expect(cart!.items).toHaveLength(0);
  });

  it('rolls stock back when an item goes out of stock mid-checkout', async () => {
    const { token } = await makeUser();
    const inStock = await makeProduct({ price: 40, stock: 5 });
    const outOfStock = await makeProduct({ price: 40, stock: 0 });

    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: String(inStock._id), qty: 2 })
      .expect(201);
    // Bypass the cart's own guard to simulate a race: put an out-of-stock item in the DB cart
    const user = await User.findOne({ email: { $regex: '@test.dev' } });
    void user;

    // Add second item directly to the cart document (simulating stale client state)
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
    await Cart.updateOne(
      { user: me.body.user.id },
      { $push: { items: { product: outOfStock._id, qty: 1, price: 40 } } },
    );

    const res = await request(app)
      .post('/api/checkout/order')
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentMethod: 'cod', shippingAddress: ADDRESS })
      .expect(400);
    expect(res.body.error.message).toMatch(/stock/i);

    // Stock for the first product must be untouched (compensating rollback)
    const first = await Product.findById(inStock._id);
    expect(first!.stock).toBe(5);
  });

  it('restores stock when the customer cancels a pending order', async () => {
    const { user, token } = await makeUser();
    const product = await makeProduct({ price: 25, stock: 8 });

    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: String(product._id), qty: 4 })
      .expect(201);

    const placed = await request(app)
      .post('/api/checkout/order')
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentMethod: 'cod', shippingAddress: ADDRESS })
      .expect(201);

    const afterPlace = await Product.findById(product._id);
    expect(afterPlace!.stock).toBe(4);

    const cancelled = await request(app)
      .post(`/api/orders/${placed.body.order._id}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Changed my mind' })
      .expect(200);
    expect(cancelled.body.order.status).toBe('cancelled');

    const afterCancel = await Product.findById(product._id);
    expect(afterCancel!.stock).toBe(8);
  });

  it('prevents cancelling a shipped order', async () => {
    const { user, token } = await makeUser();
    const product = await makeProduct({ price: 20, stock: 5 });
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: String(product._id), qty: 1 })
      .expect(201);
    const placed = await request(app)
      .post('/api/checkout/order')
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentMethod: 'cod', shippingAddress: ADDRESS })
      .expect(201);

    const { adminToken } = await (async () => {
      const { token: t } = await makeUser('admin');
      return { adminToken: t };
    })();

    await request(app)
      .patch(`/api/admin/orders/${placed.body.order._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'shipped', trackingNumber: 'BD-123456' })
      .expect(200);

    const cancel = await request(app)
      .post(`/api/orders/${placed.body.order._id}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(400);
    expect(cancel.body.error.message).toMatch(/shipped|no longer/i);
    void user;
  });

  it('validates the Bangladesh phone format on checkout', async () => {
    const { token } = await makeUser();
    const product = await makeProduct();
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: String(product._id), qty: 1 })
      .expect(201);

    const res = await request(app)
      .post('/api/checkout/order')
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentMethod: 'cod', shippingAddress: { ...ADDRESS, phone: '12345' } })
      .expect(400);
    expect(res.body.error.details?.[0]?.message).toMatch(/Bangladeshi phone/i);
  });

  it('only lets owners/admins view an order', async () => {
    const { user, token } = await makeUser();
    const product = await makeProduct();
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: String(product._id), qty: 1 })
      .expect(201);
    const placed = await request(app)
      .post('/api/checkout/order')
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentMethod: 'cod', shippingAddress: ADDRESS })
      .expect(201);

    const { token: otherToken } = await makeUser();
    await request(app)
      .get(`/api/orders/${placed.body.order._id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);

    const { token: adminToken } = await makeUser('admin');
    await request(app)
      .get(`/api/orders/${placed.body.order._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    void user;
  });

  it('admin refund marks the order refunded and records the amount', async () => {
    const { token } = await makeUser();
    const product = await makeProduct({ price: 30, stock: 5 });
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: String(product._id), qty: 1 })
      .expect(201);
    const placed = await request(app)
      .post('/api/checkout/order')
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentMethod: 'cod', shippingAddress: ADDRESS })
      .expect(201);

    // Mark paid first (COD orders are unpaid until delivered)
    const { token: adminToken } = await makeUser('admin');
    await request(app)
      .patch(`/api/admin/orders/${placed.body.order._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'paid' })
      .expect(200);

    const refunded = await request(app)
      .post(`/api/admin/orders/${placed.body.order._id}/refund`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(200);
    expect(refunded.body.order.paymentStatus).toBe('refunded');
    expect(refunded.body.order.refundAmount).toBeGreaterThan(0);
  });

  it('enforces admin-only access to /api/admin', async () => {
    const { token } = await makeUser();
    const res = await request(app).get('/api/admin/stats/overview').set('Authorization', `Bearer ${token}`).expect(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    await request(app).get('/api/admin/stats/overview').expect(401);
  });
});

describe('stripe webhook idempotency', () => {
  it('marks the order paid, reduces stock and is safe to replay', async () => {
    const { user, token } = await makeUser();
    const product = await makeProduct({ price: 60, stock: 9 });
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: String(product._id), qty: 2 })
      .expect(201);

    // Create an order the way the Stripe flow does (pending, with session id)
    const order = await Order.create({
      orderNumber: `SN-TEST-${Math.random().toString(36).slice(2, 8)}`,
      user: user._id,
      items: [
        {
          product: product._id,
          title: product.title,
          slug: product.slug,
          price: 60,
          qty: 2,
          lineTotal: 120,
        },
      ],
      shippingAddress: ADDRESS,
      paymentMethod: 'stripe',
      paymentStatus: 'unpaid',
      stripeSessionId: `cs_test_${Math.random().toString(36).slice(2, 10)}`,
      itemsSubtotal: 120,
      shippingCost: 0,
      tax: 6,
      discount: 0,
      total: 126,
      currency: 'usd',
      status: 'pending',
      timeline: [{ status: 'pending', note: 'Order created', at: new Date() }],
    });

    const snapshot = await Order.findById(order._id);
    expect(snapshot!.paymentStatus).toBe('unpaid');

    // FIRST delivery: the handler pays the order, reserves stock, clears the cart
    const { handleCheckoutCompleted } = await import('../controllers/commerce.controller.js');
    await handleCheckoutCompleted({ metadata: { orderId: String(order._id) }, id: order.stripeSessionId });

    const afterFirst = await Product.findById(product._id);
    expect(afterFirst!.stock).toBe(7); // 9 - 2, reduced exactly once

    const cartAfter = await Cart.findOne({ user: user._id });
    expect(cartAfter!.items).toHaveLength(0);

    // REPLAYED deliveries must NOT reduce stock, re-charge, or duplicate timeline entries
    await handleCheckoutCompleted({ metadata: { orderId: String(order._id) }, id: order.stripeSessionId });
    await handleCheckoutCompleted({ metadata: { orderId: String(order._id) }, id: order.stripeSessionId });

    const after = await Product.findById(product._id);
    expect(after!.stock).toBe(7); // unchanged

    const reloaded = await Order.findById(order._id);
    expect(reloaded!.paymentStatus).toBe('paid');
    expect(reloaded!.status).toBe('paid');
    expect(reloaded!.timeline.filter((t: any) => t.status === 'paid')).toHaveLength(1);
  });
});
