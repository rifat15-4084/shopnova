import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { createApp } from '../app.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';

const app = createApp();

async function makeCategory(name = 'Test Category') {
  return Category.create({ name: `${name} ${Math.random().toString(36).slice(2, 6)}`, slug: undefined as any });
}

async function makeProduct(overrides: Record<string, unknown> = {}, category?: any) {
  const cat = category ?? (await makeCategory());
  const n = Math.random().toString(36).slice(2, 8);
  return Product.create({
    title: `Product ${n}`,
    slug: `product-${n}`,
    description: `A wonderful test product ${n} with enough characters.`,
    price: 50,
    category: cat._id,
    stock: 10,
    sku: `SKU-${n}`,
    ...overrides,
  });
}

describe('products API', () => {
  it('lists active products with pagination metadata', async () => {
    const cat = await makeCategory();
    await Promise.all([
      makeProduct({ isFeatured: true }, cat),
      makeProduct({ price: 25 }, cat),
      makeProduct({ price: 75, isActive: false }, cat), // inactive must not appear
    ]);

    const res = await request(app).get('/api/products?limit=12').expect(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body).toMatchObject({ page: 1, limit: 12, total: 2, pages: 1, hasNext: false, hasPrev: false });
  });

  it('filters by category slug, price range and featured flag', async () => {
    const cat = await makeCategory('Gadgets');
    await makeProduct({ price: 10 }, cat);
    await makeProduct({ price: 200 }, cat);
    await makeProduct({ price: 15, isFeatured: true }, cat);

    const byCategory = await request(app).get(`/api/products?category=${cat.slug}`).expect(200);
    expect(byCategory.body.total).toBe(3);

    const byPrice = await request(app)
      .get(`/api/products?category=${cat.slug}&minPrice=5&maxPrice=100`)
      .expect(200);
    expect(byPrice.body.total).toBe(2); // 10 and 15 are in range, 200 is not
    expect(byPrice.body.items.map((p: any) => p.price).sort((a: number, b: number) => a - b)).toEqual([10, 15]);

    const featured = await request(app).get(`/api/products?category=${cat.slug}&featured=true`).expect(200);
    expect(featured.body.total).toBe(1);
  });

  it('searches by text', async () => {
    await makeProduct({ title: 'Espresso Machine Deluxe', price: 300 });
    await makeProduct({ title: 'Toaster Oven Mini' });

    const res = await request(app).get('/api/products?q=espresso').expect(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].title).toContain('Espresso');
  });

  it('sorts by price ascending and descending', async () => {
    const cat = await makeCategory();
    await makeProduct({ price: 30 }, cat);
    await makeProduct({ price: 10 }, cat);
    await makeProduct({ price: 20 }, cat);

    const asc = await request(app).get(`/api/products?category=${cat.slug}&sort=price_asc`).expect(200);
    expect(asc.body.items.map((p: any) => p.price)).toEqual([10, 20, 30]);

    const desc = await request(app).get(`/api/products?category=${cat.slug}&sort=price_desc`).expect(200);
    expect(desc.body.items.map((p: any) => p.price)).toEqual([30, 20, 10]);
  });

  it('returns a product by slug with related items', async () => {
    const cat = await makeCategory();
    const product = await makeProduct({}, cat);
    await makeProduct({}, cat);

    const res = await request(app).get(`/api/products/slug/${product.slug}`).expect(200);
    expect(res.body.product.title).toBe(product.title);
    expect(res.body.related.length).toBe(1);
  });

  it('404s on unknown slug', async () => {
    await request(app).get('/api/products/slug/nope-not-here').expect(404);
  });

  it('requires admin for create/update/delete', async () => {
    const product = await makeProduct();
    await request(app).post('/api/products').send({ title: 'X' }).expect(401);
    await request(app).patch(`/api/products/${product._id}`).send({ title: 'Y' }).expect(401);
    await request(app).delete(`/api/products/${product._id}`).expect(401);
  });

  it('creates, updates and soft-deletes a product as admin', async () => {
    const { User } = await import('../models/User.js');
    const bcrypt = (await import('bcryptjs')).default;
    const admin = await User.create({
      name: 'Admin',
      email: `admin-${Math.random().toString(36).slice(2)}@test.dev`,
      passwordHash: await bcrypt.hash('Admin12345', 4),
      role: 'admin',
    });
    const { signAccessToken } = await import('../services/token.service.js');
    const token = signAccessToken({ sub: String(admin._id), role: 'admin', name: admin.name });

    const cat = await makeCategory();
    const created = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Admin Created Widget',
        description: 'Created through the admin API with all required fields.',
        price: 99.99,
        category: String(cat._id),
        stock: 5,
      })
      .expect(201);
    expect(created.body.product.slug).toContain('admin-created-widget');

    const updated = await request(app)
      .patch(`/api/products/${created.body.product._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 79.99, isFeatured: true })
      .expect(200);
    expect(updated.body.product.price).toBe(79.99);
    expect(updated.body.product.isFeatured).toBe(true);

    await request(app)
      .delete(`/api/products/${created.body.product._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const after = await Product.findById(created.body.product._id);
    expect(after!.isActive).toBe(false); // archived, not destroyed
  });
});
