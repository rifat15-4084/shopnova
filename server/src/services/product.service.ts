import { Types } from 'mongoose';
import { Product, type ProductDoc } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { Review } from '../models/Review.js';
import { ApiError } from '../utils/errors.js';
import { slugify, randomSuffix } from '../utils/slugify.js';
import { normalizePagination, paginate, type PaginationResult } from '../utils/pagination.js';

export interface ProductListQuery {
  page?: number;
  limit?: number;
  q?: string;
  category?: string; // slug or id
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStock?: boolean;
  featured?: boolean;
  sort?: 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'popular' | 'rating';
}

const SORT_MAP: Record<string, Record<string, number>> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  popular: { soldCount: -1, createdAt: -1 },
  rating: { ratingAverage: -1, ratingCount: -1 },
};

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base);
  let candidate = `${slug}-${randomSuffix(4)}`;
  let exists = await Product.findOne({ slug: candidate });
  if (!exists) return candidate;
  candidate = `${slug}-${randomSuffix(6)}`;
  exists = await Product.findOne({ slug: candidate });
  return exists ? `${slug}-${randomSuffix(8)}` : candidate;
}

export const productService = {
  async list(query: ProductListQuery): Promise<PaginationResult<ProductDoc>> {
    const { page, limit, skip } = normalizePagination(query, 48);
    const filter: Record<string, unknown> = { isActive: true };

    if (query.q && query.q.trim()) {
      const safe = query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { title: { $regex: safe, $options: 'i' } },
        { brand: { $regex: safe, $options: 'i' } },
        { tags: { $regex: safe, $options: 'i' } },
      ];
    }
    if (query.category) {
      if (Types.ObjectId.isValid(query.category)) {
        filter.category = new Types.ObjectId(query.category);
      } else {
        const cat = await Category.findOne({ slug: query.category.toLowerCase() });
        if (!cat) return paginate([], 0, page, limit);
        filter.category = cat._id;
      }
    }
    if (query.brand) filter.brand = { $regex: `^${query.brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' };
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      filter.price = {};
      if (query.minPrice !== undefined) (filter.price as any).$gte = query.minPrice;
      if (query.maxPrice !== undefined) (filter.price as any).$lte = query.maxPrice;
    }
    if (query.minRating) filter.ratingAverage = { $gte: query.minRating };
    if (query.inStock) {
      filter.$or = [...((filter.$or as any[]) ?? []), { stock: { $gt: 0 } }];
      if (!(filter.$or as any[]).some((f) => 'stock' in f)) {
        // ensure the in-stock condition also applies when there is no text search
        filter.$or = [{ stock: { $gt: 0 } }];
      }
    }
    if (query.featured) filter.isFeatured = true;

    const sort = (SORT_MAP[query.sort ?? 'newest'] ?? SORT_MAP.newest) as Record<string, 1 | -1>;
    const [items, total] = await Promise.all([
      Product.find(filter).sort(sort).skip(skip).limit(limit).populate('category', 'name slug image'),
      Product.countDocuments(filter),
    ]);
    return paginate(items, total, page, limit);
  },

  async bySlug(slug: string): Promise<ProductDoc> {
    const product = await Product.findOne({ slug: slug.toLowerCase(), isActive: true }).populate(
      'category',
      'name slug image',
    );
    if (!product) throw ApiError.notFound('Product not found');
    return product;
  },

  async byId(id: string, opts: { allowInactive?: boolean } = {}): Promise<ProductDoc> {
    if (!Types.ObjectId.isValid(id)) throw ApiError.notFound('Product not found');
    const product = await Product.findById(id).populate('category', 'name slug image');
    if (!product || (!opts.allowInactive && !product.isActive)) throw ApiError.notFound('Product not found');
    return product;
  },

  async related(product: ProductDoc, limit = 4): Promise<ProductDoc[]> {
    return Product.find({
      _id: { $ne: product._id },
      category: product.category,
      isActive: true,
    })
      .sort({ soldCount: -1, ratingAverage: -1 })
      .limit(limit);
  },

  async create(input: Record<string, unknown>): Promise<ProductDoc> {
    const title = String(input.title ?? '').trim();
    const slug = (input.slug as string) ? slugify(String(input.slug)) : await uniqueSlug(title);
    return Product.create({ ...input, title, slug });
  },

  async update(id: string, input: Record<string, unknown>): Promise<ProductDoc> {
    const product = await this.byId(id, { allowInactive: true });
    if (input.title && input.title !== product.title && !input.slug) {
      input.slug = await uniqueSlug(String(input.title));
    } else if (input.slug) {
      input.slug = slugify(String(input.slug));
    }
    product.set(input);
    await product.save();
    return product;
  },

  async remove(id: string): Promise<void> {
    const product = await Product.findById(id);
    if (!product) throw ApiError.notFound('Product not found');
    // Soft delete keeps historical orders valid
    product.isActive = false;
    await product.save();
  },

  /** Recalculate rating aggregates for a product from its approved reviews. */
  async recalcRating(productId: string | Types.ObjectId): Promise<void> {
    const [agg] = await Review.aggregate([
      { $match: { product: new Types.ObjectId(String(productId)), isApproved: true } },
      { $group: { _id: '$product', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    await Product.updateOne(
      { _id: productId },
      {
        $set: {
          ratingAverage: agg ? Math.round(agg.avg * 10) / 10 : 0,
          ratingCount: agg ? agg.count : 0,
        },
      },
    );
  },
};

export const reviewService = {
  async listForProduct(productId: string, query: { page?: number; limit?: number }) {
    const { page, limit, skip } = normalizePagination(query, 20);
    const filter = { product: productId, isApproved: true };
    const [items, total] = await Promise.all([
      Review.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name'),
      Review.countDocuments(filter),
    ]);
    return paginate(items, total, page, limit);
  },

  async createOrUpdate(
    userId: string,
    productId: string,
    input: { rating: number; comment: string; title?: string },
  ) {
    if (!Types.ObjectId.isValid(productId)) throw ApiError.notFound('Product not found');
    const product = await Product.findById(productId);
    if (!product || !product.isActive) throw ApiError.notFound('Product not found');

    const review = await Review.findOne({ user: userId, product: productId });
    if (review) {
      review.rating = input.rating;
      review.comment = input.comment;
      review.title = input.title ?? review.title;
      await review.save();
    } else {
      await Review.create({
        user: userId,
        product: productId,
        rating: input.rating,
        comment: input.comment,
        title: input.title ?? '',
      });
    }
    await productService.recalcRating(productId);
    return Review.findOne({ user: userId, product: productId }).populate('user', 'name');
  },

  async remove(userId: string, productId: string): Promise<void> {
    await Review.deleteOne({ user: userId, product: productId });
    await productService.recalcRating(productId);
  },
};

export const categoryService = {
  async list(includeInactive = false) {
    const filter = includeInactive ? {} : { isActive: true };
    return Category.find(filter).sort({ sortOrder: 1, name: 1 });
  },
  async bySlug(slug: string) {
    const cat = await Category.findOne({ slug: slug.toLowerCase() });
    if (!cat) throw ApiError.notFound('Category not found');
    return cat;
  },
  async create(input: { name: string; image?: string; description?: string; sortOrder?: number }) {
    const slug = await (async () => {
      const base = slugify(input.name);
      let candidate = base;
      let i = 1;
      while (await Category.findOne({ slug: candidate })) candidate = `${base}-${i++}`;
      return candidate;
    })();
    return Category.create({ ...input, slug });
  },
  async update(id: string, input: Record<string, unknown>) {
    const cat = await Category.findById(id);
    if (!cat) throw ApiError.notFound('Category not found');
    if (input.name && input.name !== cat.name) input.slug = slugify(String(input.name));
    cat.set(input);
    await cat.save();
    return cat;
  },
  async remove(id: string) {
    const inUse = await Product.countDocuments({ category: id, isActive: true });
    if (inUse > 0) {
      throw ApiError.badRequest(`Cannot delete: ${inUse} product(s) still use this category`);
    }
    await Category.deleteOne({ _id: id });
  },
};
