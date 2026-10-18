import request from 'supertest';
import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { createApp } from '../app.js';
import { User } from '../models/User.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
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

describe('cart & checkout totals', () => {
  it('adds items, keeps live prices and rejects out-of-stock', async () => {
    const { token } = await makeUser();
    const product = await makeProduct({ price: 40, stock: 2 });

    const added = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: String(product._id), qty: 2 })
      .expect(201);
    expect(added.body.cart.items).toHaveLength(1);
    expect(added.body.cart.subtotal).toBe(80);
    expect(added.body.cart.itemCount).toBe(2);

    // qty is clamped to available stock
    const more = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: String(product._id), qty: 5 })
      .expect(201);
    expect(more.body.cart.items[0].qty).toBe(2);

    const empty = await makeProduct({ stock: 0 });
    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: String(empty._id), qty: 1 })
      .expect(400);
    expect(res.body.error.message).toMatch(/out of stock/i);
  });

  it('recomputes totals server-side: flat shipping under threshold, free above, tax on discounted subtotal', async () => {
    const { token } = await makeUser();
    // $100 threshold, $7.50 flat, 5% tax (defaults from .env.example)
    const product = await makeProduct({ price: 60 });
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: String(product._id), qty: 1 })
      .expect(201);

    const preview1 = await request(app).get('/api/checkout/preview').set('Authorization', `Bearer ${token}`).expect(200);
    expect(preview1.body.preview.itemsSubtotal).toBe(60);
    expect(preview1.body.preview.shippingCost).toBe(7.5); // under $100
    expect(preview1.body.preview.tax).toBe(3); // 5% of 60
    expect(preview1.body.preview.total).toBe(70.5);

    // Add more to cross the free-shipping threshold
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: String(product._id), qty: 1 })
      .expect(201);

    const preview2 = await request(app).get('/api/checkout/preview').set('Authorization', `Bearer ${token}`).expect(200);
    expect(preview2.body.preview.itemsSubtotal).toBe(120);
    expect(preview2.body.preview.shippingCost).toBe(0); // free above $100
    expect(preview2.body.preview.tax).toBe(6);
    expect(preview2.body.preview.total).toBe(126);
  });

  it('applies a percent coupon with a cap and validates expiry/min-order rules', async () => {
    const { token } = await makeUser();
    const product = await makeProduct({ price: 100 });
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: String(product._id), qty: 1 })
      .expect(201);

    await Coupon.create({
      code: 'CAP10',
      type: 'percent',
      value: 25,
      maxDiscount: 15,
      minOrder: 50,
      expiryDate: new Date(Date.now() + 86400_000),
    });

    const ok = await request(app)
      .get('/api/checkout/coupon?code=CAP10')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(ok.body.coupon.discount).toBe(15); // capped

    // Applied to the preview
    const preview = await request(app)
      .get('/api/checkout/preview?couponCode=CAP10')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(preview.body.preview.discount).toBe(15);
    expect(preview.body.preview.itemsSubtotal).toBe(100);
    // $15 discount → $85 subtotal. Shipping is flat ($7.50) because the
    // discounted subtotal is below the $100 free-shipping threshold.
    expect(preview.body.preview.shippingCost).toBe(7.5);
    expect(preview.body.preview.tax).toBe(85 * 0.05);
    expect(preview.body.preview.total).toBe(85 + 85 * 0.05 + 7.5);

    // Expired coupon is rejected
    await Coupon.create({
      code: 'EXPIRED',
      type: 'percent',
      value: 10,
      expiryDate: new Date(Date.now() - 1000),
    });
    const expired = await request(app)
      .get('/api/checkout/coupon?code=EXPIRED')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
    expect(expired.body.error.message).toMatch(/expired/i);

    // Below min-order is rejected
    await Coupon.create({
      code: 'BIGMIN',
      type: 'fixed',
      value: 10,
      minOrder: 500,
      expiryDate: new Date(Date.now() + 86400_000),
    });
    const minRes = await request(app)
      .get('/api/checkout/coupon?code=BIGMIN')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
    expect(minRes.body.error.message).toMatch(/minimum order/i);
  });

  it('merges a guest cart after login without overselling', async () => {
    const { token } = await makeUser();
    const product = await makeProduct({ price: 30, stock: 4 });

    const merged = await request(app)
      .post('/api/auth/merge-cart')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: String(product._id), qty: 10 }] })
      .expect(200);
    expect(merged.body.cart.items[0].qty).toBe(4); // clamped to stock
    expect(merged.body.cart.subtotal).toBe(120);
  });

  it('removes items from the cart', async () => {
    const { token } = await makeUser();
    const product = await makeProduct();
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: String(product._id), qty: 1 })
      .expect(201);

    const removed = await request(app)
      .delete(`/api/cart/items/${product._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(removed.body.cart.items).toHaveLength(0);
  });
});
