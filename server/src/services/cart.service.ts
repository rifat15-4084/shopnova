import type { Types } from 'mongoose';
import { Cart } from '../models/Cart.js';
import { Product, type ProductDoc } from '../models/Product.js';
import { ApiError } from '../utils/errors.js';
import { round2 } from '../utils/crypto.js';

export interface CartItemInput {
  productId: string;
  variantId?: string | null;
  qty: number;
}

export interface ResolvedCartItem {
  productId: string;
  variantId: string | null;
  variantLabel: string;
  title: string;
  slug: string;
  image: string;
  sku: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  availableStock: number;
}

export interface CartSummary {
  items: ResolvedCartItem[];
  subtotal: number;
  itemCount: number;
  couponCode: string | null;
}

function findVariant(product: ProductDoc, variantId: string) {
  const v = (product.variants ?? []).find((x) => String(x._id) === variantId);
  if (!v) throw ApiError.badRequest(`"${product.title}" has no such variant`);
  return v;
}

/** Resolve a cart's items against live product data (prices & stock always re-read from DB). */
export async function resolveCart(userId: string): Promise<CartSummary> {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    return { items: [], subtotal: 0, itemCount: 0, couponCode: null };
  }

  const productIds = cart.items.map((i) => i.product);
  const products = await Product.find({ _id: { $in: productIds } });
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const items: ResolvedCartItem[] = [];
  let stale = false;

  for (const item of cart.items as any[]) {
    const product = byId.get(String(item.product));
    if (!product || !product.isActive) {
      stale = true;
      continue;
    }
    let unitPrice = product.price;
    let availableStock = product.stock ?? 0;
    let variantLabel = '';
    let image = product.images?.[0] ?? '';
    let sku = product.sku ?? '';

    if (item.variantId) {
      const variant = findVariant(product, String(item.variantId));
      unitPrice = round2(product.price + (variant.priceDelta ?? 0));
      availableStock = variant.stock ?? 0;
      variantLabel = `${variant.name}: ${variant.value}`;
      if (variant.image) image = variant.image;
      if (variant.sku) sku = variant.sku;
    }

    // Clamp qty to available stock, keep the cart honest
    const qty = Math.max(1, Math.min(item.qty, Math.max(availableStock, 1), 999));

    items.push({
      productId: String(product._id),
      variantId: item.variantId ?? null,
      variantLabel,
      title: product.title,
      slug: product.slug,
      image,
      sku,
      qty,
      unitPrice,
      lineTotal: round2(unitPrice * qty),
      availableStock,
    });
  }

  if (stale) {
    cart.items = items.map((i) => ({
      product: i.productId as unknown as Types.ObjectId,
      variantId: i.variantId,
      variantLabel: i.variantLabel,
      qty: i.qty,
      price: i.unitPrice,
    })) as any;
    await cart.save();
  }

  const subtotal = round2(items.reduce((sum, i) => sum + i.lineTotal, 0));
  const itemCount = items.reduce((sum, i) => sum + i.qty, 0);

  return { items, subtotal, itemCount, couponCode: cart.couponCode ?? null };
}

export const cartService = {
  resolve: resolveCart,

  async addItem(userId: string, input: CartItemInput) {
    const product = await Product.findOne({ _id: input.productId, isActive: true });
    if (!product) throw ApiError.notFound('Product not found');

    let unitPrice = product.price;
    let stock = product.stock ?? 0;
    let variantLabel = '';
    if (input.variantId) {
      const variant = findVariant(product, input.variantId);
      unitPrice = round2(product.price + (variant.priceDelta ?? 0));
      stock = variant.stock ?? 0;
      variantLabel = `${variant.name}: ${variant.value}`;
    }
    if (stock < 1) throw ApiError.badRequest('This item is out of stock');

    const cart = (await Cart.findOne({ user: userId })) ?? new Cart({ user: userId, items: [] });
    const existing = (cart.items as any[]).find(
      (i) => String(i.product) === String(product._id) && (i.variantId ?? null) === (input.variantId ?? null),
    );
    const newQty = Math.min((existing?.qty ?? 0) + input.qty, stock, 999);
    if (existing) {
      existing.qty = newQty;
      existing.price = unitPrice;
    } else {
      cart.items.push({
        product: product._id,
        variantId: input.variantId ?? null,
        variantLabel,
        qty: Math.min(input.qty, stock),
        price: unitPrice,
      } as any);
    }
    await cart.save();
    return resolveCart(userId);
  },

  async updateItem(userId: string, input: CartItemInput) {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) throw ApiError.notFound('Cart not found');
    const item = (cart.items as any[]).find(
      (i) => String(i.product) === String(input.productId) && (i.variantId ?? null) === (input.variantId ?? null),
    );
    if (!item) throw ApiError.notFound('Item not in cart');

    if (input.qty <= 0) {
      cart.items = (cart.items as any[]).filter(
        (i) => !(String(i.product) === String(input.productId) && (i.variantId ?? null) === (input.variantId ?? null)),
      ) as any;
    } else {
      const product = await Product.findById(item.product);
      if (!product) throw ApiError.notFound('Product not found');
      let stock = product.stock ?? 0;
      if (item.variantId) stock = findVariant(product, String(item.variantId)).stock ?? 0;
      item.qty = Math.min(input.qty, stock, 999);
      if (item.qty < 1) throw ApiError.badRequest('Not enough stock for this item');
    }
    await cart.save();
    return resolveCart(userId);
  },

  async removeItem(userId: string, productId: string, variantId: string | null) {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) throw ApiError.notFound('Cart not found');
    cart.items = (cart.items as any[]).filter(
      (i) => !(String(i.product) === String(productId) && (i.variantId ?? null) === variantId),
    ) as any;
    await cart.save();
    return resolveCart(userId);
  },

  async clear(userId: string) {
    await Cart.updateOne({ user: userId }, { $set: { items: [], couponCode: null } });
    return resolveCart(userId);
  },

  async setCoupon(userId: string, code: string | null) {
    await Cart.updateOne(
      { user: userId },
      { $set: { couponCode: code ? code.toUpperCase().trim() : null } },
      { upsert: true },
    );
    return resolveCart(userId);
  },

  /** Merge a guest cart (localStorage shape) into the user's server cart. */
  async mergeGuestCart(userId: string, guestItems: Array<{ productId: string; variantId?: string | null; qty: number }>) {
    const cart = (await Cart.findOne({ user: userId })) ?? new Cart({ user: userId, items: [] });
    for (const guest of guestItems ?? []) {
      try {
        const product = await Product.findOne({ _id: guest.productId, isActive: true });
        if (!product) continue;
        let stock = product.stock ?? 0;
        let unitPrice = product.price;
        let variantLabel = '';
        if (guest.variantId) {
          const variant = findVariant(product, guest.variantId);
          stock = variant.stock ?? 0;
          unitPrice = round2(product.price + (variant.priceDelta ?? 0));
          variantLabel = `${variant.name}: ${variant.value}`;
        }
        if (stock < 1) continue;
        const existing = (cart.items as any[]).find(
          (i) => String(i.product) === String(product._id) && (i.variantId ?? null) === (guest.variantId ?? null),
        );
        if (existing) {
          existing.qty = Math.min(existing.qty + guest.qty, stock, 999);
        } else {
          cart.items.push({
            product: product._id,
            variantId: guest.variantId ?? null,
            variantLabel,
            qty: Math.min(guest.qty, stock),
            price: unitPrice,
          } as any);
        }
      } catch {
        // skip invalid guest items
      }
    }
    await cart.save();
    return resolveCart(userId);
  },
};
