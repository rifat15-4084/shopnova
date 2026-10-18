/* eslint-disable no-console */
/**
 * ShopNova seed data.
 *   npm run seed          – upsert demo data
 *   npm run reseed        – drop the database first, then seed
 *
 * Demo accounts:
 *   admin@shopnova.dev   / Admin@12345   (admin)
 *   demo@shopnova.dev    / Demo@12345    (customer)
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { User } from '../models/User.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { Review } from '../models/Review.js';
import { Coupon } from '../models/Coupon.js';
import { Cart } from '../models/Cart.js';
import { slugify } from '../utils/slugify.js';

const img = (seed: string, w = 800, h = 800) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

interface SeedProduct {
  title: string;
  brand: string;
  category: string; // category slug
  price: number;
  compareAtPrice?: number;
  stock: number;
  rating: number;
  reviews: number;
  featured?: boolean;
  tags?: string[];
  description: string;
  variants?: Array<{ name: string; value: string; priceDelta?: number; stock: number }>;
}

const CATEGORIES = [
  { name: 'Electronics', slug: 'electronics', description: 'Gadgets, audio, wearables and smart devices', image: img('cat-electronics') },
  { name: 'Fashion', slug: 'fashion', description: 'Apparel and accessories for every occasion', image: img('cat-fashion') },
  { name: 'Home & Living', slug: 'home', description: 'Furniture, decor and everyday essentials', image: img('cat-home') },
  { name: 'Beauty & Care', slug: 'beauty', description: 'Skincare, grooming and wellness', image: img('cat-beauty') },
  { name: 'Sports & Outdoors', slug: 'sports', description: 'Gear for training, hiking and play', image: img('cat-sports') },
  { name: 'Books & Stationery', slug: 'books', description: 'Notebooks, pens and page-turners', image: img('cat-books') },
  { name: 'Grocery', slug: 'grocery', description: 'Pantry staples and fresh favorites', image: img('cat-grocery') },
  { name: 'Toys & Games', slug: 'toys', description: 'Fun for kids and the whole family', image: img('cat-toys') },
];

const S = (_n: number, t: string, o: Omit<SeedProduct, 'title'>): SeedProduct => ({ title: t, ...o });

const PRODUCTS: SeedProduct[] = [
  // Electronics
  S(1, 'Aurora Wireless Headphones', { brand: 'SoundCore', category: 'electronics', price: 129.99, compareAtPrice: 179.99, stock: 42, rating: 4.7, reviews: 38, featured: true, tags: ['audio', 'wireless', 'bluetooth'], description: 'Immersive over-ear headphones with hybrid ANC, 40-hour battery life and plush memory-foam earcups. Multipoint pairing lets you hop between laptop and phone without missing a beat.', variants: [{ name: 'Color', value: 'Midnight', stock: 18 }, { name: 'Color', value: 'Sand', stock: 14 }, { name: 'Color', value: 'Forest', stock: 10, priceDelta: 10 }] }),
  S(2, 'Pulse Smartwatch', { brand: 'Vireo', category: 'electronics', price: 199.0, compareAtPrice: 249.0, stock: 30, rating: 4.5, reviews: 26, featured: true, tags: ['wearable', 'fitness'], description: 'AMOLED fitness watch with 7-day battery, GPS, SpO₂ and sleep coaching. 100+ sport modes and swim-proof 5ATM build.', variants: [{ name: 'Size', value: '41mm', stock: 12 }, { name: 'Size', value: '45mm', stock: 18, priceDelta: 30 }] }),
  S(3, 'Nimbus Mechanical Keyboard', { brand: 'KeyForge', category: 'electronics', price: 89.5, stock: 25, rating: 4.6, reviews: 19, tags: ['keyboard', 'gaming'], description: 'Hot-swappable 75% mechanical keyboard with gasket mount, PBT double-shot keycaps and per-key RGB. Tri-mode connectivity.', variants: [{ name: 'Switch', value: 'Brown', stock: 10 }, { name: 'Switch', value: 'Red', stock: 9 }, { name: 'Switch', value: 'Blue', stock: 6 }] }),
  S(4, 'Echo Beam Bluetooth Speaker', { brand: 'SoundCore', category: 'electronics', price: 59.99, compareAtPrice: 79.99, stock: 60, rating: 4.4, reviews: 52, tags: ['audio', 'portable'], description: '360° sound in a pocketable shell. IP67 waterproof, 20-hour playtime and stereo pairing.' }),
  S(5, 'Lumen 4K Action Camera', { brand: 'Vireo', category: 'electronics', price: 249.0, stock: 14, rating: 4.3, reviews: 11, tags: ['camera', 'outdoor'], description: 'Shoot buttery 4K/60fps with horizon lock, waterproof to 10 m and magnetic quick-release mounts.' }),
  S(6, 'Drift Noise-Cancelling Earbuds', { brand: 'SoundCore', category: 'electronics', price: 74.0, compareAtPrice: 99.0, stock: 80, rating: 4.5, reviews: 64, featured: true, tags: ['audio', 'earbuds'], description: 'Featherweight earbuds with adaptive ANC, wireless charging case and low-latency game mode.' }),
  S(7, 'Vertex 100W GaN Charger', { brand: 'VoltEdge', category: 'electronics', price: 45.0, stock: 95, rating: 4.8, reviews: 31, tags: ['charging', 'travel'], description: 'Three-port GaN charger that powers a laptop, phone and earbuds at once — pocket sized.' }),
  S(8, 'Halo Smart Bulb (4-Pack)', { brand: 'VoltEdge', category: 'electronics', price: 34.99, compareAtPrice: 44.99, stock: 120, rating: 4.2, reviews: 44, tags: ['smart-home', 'lighting'], description: '16M colours, works with Alexa and Google Home, schedules and scenes from the app.' }),

  // Fashion
  S(1, 'Everyday Oxford Shirt', { brand: 'Meridian', category: 'fashion', price: 39.9, stock: 70, rating: 4.4, reviews: 23, featured: true, tags: ['shirt', 'cotton'], description: 'Breathable 100% long-staple cotton oxford with a tailored-yet-relaxed fit. Machine washable, gets softer every wear.', variants: [{ name: 'Size', value: 'S', stock: 12 }, { name: 'Size', value: 'M', stock: 20 }, { name: 'Size', value: 'L', stock: 22 }, { name: 'Size', value: 'XL', stock: 16 }] }),
  S(2, 'Trail Utility Jacket', { brand: 'Northwind', category: 'fashion', price: 118.0, compareAtPrice: 149.0, stock: 28, rating: 4.6, reviews: 17, tags: ['jacket', 'outdoor'], description: 'Water-resistant shell with four cargo pockets, adjustable hood and a packable design for changing weather.', variants: [{ name: 'Size', value: 'M', stock: 10 }, { name: 'Size', value: 'L', stock: 12 }, { name: 'Size', value: 'XL', stock: 6 }] }),
  S(3, 'Soft Knit Crew Sweater', { brand: 'Meridian', category: 'fashion', price: 54.0, stock: 45, rating: 4.3, reviews: 21, tags: ['sweater', 'knitwear'], description: 'Mid-weight knit crew in a cotton-wool blend. Ribbed cuffs and hem, garment-dyed for depth of colour.', variants: [{ name: 'Size', value: 'S', stock: 10 }, { name: 'Size', value: 'M', stock: 15 }, { name: 'Size', value: 'L', stock: 12 }, { name: 'Size', value: 'XL', stock: 8 }] }),
  S(4, 'Canvas Weekender Bag', { brand: 'Northwind', category: 'fashion', price: 89.0, stock: 22, rating: 4.7, reviews: 14, featured: true, tags: ['bag', 'travel'], description: '18 oz waxed canvas weekender with leather handles, YKK zips and a separate shoe compartment.' }),
  S(5, 'Classic Denim Jeans', { brand: 'Meridian', category: 'fashion', price: 64.0, compareAtPrice: 79.0, stock: 55, rating: 4.2, reviews: 33, tags: ['denim'], description: 'Straight-leg jeans in 12 oz stretch denim. Reinforced seams and a mid-rise waist.', variants: [{ name: 'Size', value: '30', stock: 15 }, { name: 'Size', value: '32', stock: 20 }, { name: 'Size', value: '34', stock: 14 }, { name: 'Size', value: '36', stock: 6 }] }),
  S(6, 'Knit Sneakers', { brand: 'Stride', category: 'fashion', price: 74.5, stock: 48, rating: 4.1, reviews: 27, tags: ['shoes', 'sneakers'], description: 'Breathable knit upper on a lightweight foam sole. Machine washable and feather light.', variants: [{ name: 'Size', value: '40', stock: 12 }, { name: 'Size', value: '41', stock: 14 }, { name: 'Size', value: '42', stock: 12 }, { name: 'Size', value: '43', stock: 10 }] }),
  S(7, 'Linen Summer Dress', { brand: 'Meridian', category: 'fashion', price: 69.0, stock: 33, rating: 4.5, reviews: 12, tags: ['dress', 'linen'], description: 'Airy 100% linen midi dress with a tie waist and side pockets. Made for hot afternoons.', variants: [{ name: 'Size', value: 'S', stock: 11 }, { name: 'Size', value: 'M', stock: 14 }, { name: 'Size', value: 'L', stock: 8 }] }),
  S(8, 'Leather Card Holder', { brand: 'Northwind', category: 'fashion', price: 24.0, stock: 110, rating: 4.6, reviews: 41, tags: ['accessories', 'leather'], description: 'Full-grain leather card holder with four slots and RFID shielding. Ages beautifully.' }),

  // Home & Living
  S(1, 'Ceramic Pour-Over Set', { brand: 'Hearth', category: 'home', price: 48.0, compareAtPrice: 62.0, stock: 36, rating: 4.8, reviews: 29, featured: true, tags: ['kitchen', 'coffee'], description: 'Hand-glazed ceramic dripper, carafe and two cups. The ritual of a great pour-over, simplified.' }),
  S(2, 'Linen Duvet Set', { brand: 'Hearth', category: 'home', price: 129.0, stock: 24, rating: 4.5, reviews: 18, tags: ['bedding', 'linen'], description: 'Stonewashed French linen duvet cover with coconut-shell buttons. Gets softer with every wash.', variants: [{ name: 'Size', value: 'Double', stock: 10 }, { name: 'Size', value: 'Queen', stock: 9 }, { name: 'Size', value: 'King', stock: 5, priceDelta: 30 }] }),
  S(3, 'Arc Floor Lamp', { brand: 'Lumina', category: 'home', price: 94.0, stock: 16, rating: 4.3, reviews: 9, tags: ['lighting', 'decor'], description: 'Slim brass arc lamp with a marble base and dimmable warm LED head.' }),
  S(4, 'Cast Iron Skillet 26cm', { brand: 'Hearth', category: 'home', price: 42.0, stock: 50, rating: 4.7, reviews: 46, tags: ['kitchen', 'cookware'], description: 'Pre-seasoned cast iron that goes from stovetop to oven to campfire. Lasts generations.' }),
  S(5, 'Woven Storage Basket Set', { brand: 'Hearth', category: 'home', price: 38.5, compareAtPrice: 49.0, stock: 40, rating: 4.2, reviews: 22, tags: ['storage', 'decor'], description: 'Set of three seagrass baskets in graduated sizes. Sturdy handles, hand woven.' }),
  S(6, 'Aroma Diffuser', { brand: 'Lumina', category: 'home', price: 29.99, stock: 65, rating: 4.1, reviews: 37, tags: ['wellness'], description: 'Ultrasonic diffuser with 7-colour ambient light, auto shut-off and 8h mist.' }),
  S(7, 'Memory Foam Pillow (2-Pack)', { brand: 'Hearth', category: 'home', price: 44.0, stock: 58, rating: 4.4, reviews: 51, tags: ['bedding'], description: 'Ventilated gel memory foam with a bamboo cover. Sleep cool, wake up straight.' }),
  S(8, 'Marble Serving Board', { brand: 'Hearth', category: 'home', price: 33.0, stock: 30, rating: 4.6, reviews: 15, tags: ['kitchen', 'serving'], description: 'Natural marble board with a gold-tone handle. Each piece is one of a kind.' }),

  // Beauty & Care
  S(1, 'Vitamin C Serum 30ml', { brand: 'GlowLab', category: 'beauty', price: 26.0, compareAtPrice: 34.0, stock: 75, rating: 4.5, reviews: 58, featured: true, tags: ['skincare', 'serum'], description: '15% stabilised vitamin C with hyaluronic acid and vitamin E. Brightens and evens tone in weeks.' }),
  S(2, 'Ceramide Daily Moisturizer', { brand: 'GlowLab', category: 'beauty', price: 22.5, stock: 90, rating: 4.4, reviews: 43, tags: ['skincare'], description: 'Fragrance-free barrier cream with ceramides and squalane. Non-greasy, plays nice under SPF.' }),
  S(3, 'Bamboo Toothbrush Set', { brand: 'PureBristle', category: 'beauty', price: 12.0, stock: 150, rating: 4.3, reviews: 61, tags: ['dental', 'eco'], description: 'Four soft-bristle bamboo toothbrushes in a travel tin. Compostable handles.' }),
  S(4, 'Argan Hair Oil', { brand: 'GlowLab', category: 'beauty', price: 18.0, stock: 68, rating: 4.6, reviews: 35, tags: ['haircare'], description: 'Cold-pressed argan oil that tames frizz and adds shine without weighing hair down.' }),
  S(5, 'Charcoal Face Wash', { brand: 'PureBristle', category: 'beauty', price: 14.5, compareAtPrice: 19.0, stock: 84, rating: 4.1, reviews: 27, tags: ['skincare'], description: 'Gel cleanser with activated charcoal and tea tree. Deep clean, zero tightness.' }),
  S(6, 'Himalayan Bath Salts 1kg', { brand: 'PureBristle', category: 'beauty', price: 16.0, stock: 60, rating: 4.7, reviews: 19, tags: ['bath', 'wellness'], description: 'Mineral-rich pink salts with lavender. Melt away the day.' }),

  // Sports & Outdoors
  S(1, 'Trail Running Shoes', { brand: 'Stride', category: 'sports', price: 110.0, compareAtPrice: 139.0, stock: 34, rating: 4.5, reviews: 25, featured: true, tags: ['running', 'shoes'], description: 'Rock-plate trail runner with sticky rubber lugs and a breathable mesh cage.', variants: [{ name: 'Size', value: '40', stock: 8 }, { name: 'Size', value: '41', stock: 10 }, { name: 'Size', value: '42', stock: 9 }, { name: 'Size', value: '43', stock: 7 }] }),
  S(2, 'Carbon-Frame Water Bottle', { brand: 'VoltEdge', category: 'sports', price: 28.0, stock: 88, rating: 4.4, reviews: 39, tags: ['hydration'], description: 'Insulated 750ml bottle keeps drinks cold for 24h. Leak-proof twist cap.' }),
  S(3, 'Compact Camping Tent (2P)', { brand: 'Northwind', category: 'sports', price: 159.0, stock: 12, rating: 4.6, reviews: 13, tags: ['camping', 'outdoor'], description: 'Freestanding 2-person tent with 3000mm fly, two doors and a 4kg pack weight.' }),
  S(4, 'Adjustable Dumbbell Pair', { brand: 'Stride', category: 'sports', price: 189.0, compareAtPrice: 229.0, stock: 9, rating: 4.7, reviews: 16, tags: ['fitness'], description: 'Space-saving 2.5–24 kg adjustable dumbbells with a smooth dial-lock.' }),
  S(5, 'Yoga Mat 6mm', { brand: 'Stride', category: 'sports', price: 32.0, stock: 72, rating: 4.3, reviews: 47, tags: ['yoga', 'fitness'], description: 'Non-slip TPE mat with alignment lines and a carry strap.' }),
  S(6, 'Insulated Hiking Backpack 35L', { brand: 'Northwind', category: 'sports', price: 96.0, stock: 20, rating: 4.5, reviews: 18, tags: ['hiking', 'backpack'], description: 'Ventilated back panel, rain cover and hip-belt pockets. Hydration sleeve included.' }),

  // Books & Stationery
  S(1, 'Hardcover Dot-Grid Journal', { brand: 'PaperKind', category: 'books', price: 18.0, stock: 130, rating: 4.8, reviews: 72, featured: true, tags: ['notebook', 'stationery'], description: '192 pages of 120 gsm dot-grid paper that refuses to bleed through. Lay-flat binding, ribbon marker.' }),
  S(2, 'Fountain Pen Starter Kit', { brand: 'PaperKind', category: 'books', price: 42.0, compareAtPrice: 55.0, stock: 26, rating: 4.6, reviews: 21, tags: ['pen', 'stationery'], description: 'Medium-nib fountain pen, converter and six inks in a gift box.' }),
  S(3, 'The Art of Focus (Paperback)', { brand: 'Meridian Press', category: 'books', price: 16.5, stock: 54, rating: 4.4, reviews: 33, tags: ['book', 'productivity'], description: 'A practical guide to deep work in a distracted world — 288 pages.' }),
  S(4, 'Origami Paper Pack (500 sheets)', { brand: 'PaperKind', category: 'books', price: 11.0, stock: 96, rating: 4.2, reviews: 14, tags: ['craft'], description: 'Double-sided origami papers in 20 patterns, 15 cm squares.' }),

  // Grocery
  S(1, 'Single-Origin Coffee Beans 1kg', { brand: 'RoastHouse', category: 'grocery', price: 27.0, stock: 64, rating: 4.7, reviews: 55, featured: true, tags: ['coffee', 'beans'], description: 'Washed Ethiopian beans with blueberry and cocoa notes. Roasted weekly, shipped fresh.' }),
  S(2, 'Raw Wildflower Honey 500g', { brand: 'Harvest&Co', category: 'grocery', price: 14.0, stock: 80, rating: 4.8, reviews: 38, tags: ['honey', 'organic'], description: 'Unheated, unfiltered honey from hill-apiary hives. Crystallises naturally — that is the good stuff.' }),
  S(3, 'Cold-Pressed Mustard Oil 1L', { brand: 'Harvest&Co', category: 'grocery', price: 9.5, stock: 120, rating: 4.5, reviews: 29, tags: ['oil', 'pantry'], description: 'Traditional stone-ground mustard oil, pungent and pure.' }),
  S(4, 'Assam Tea Tin 400g', { brand: 'RoastHouse', category: 'grocery', price: 12.5, compareAtPrice: 16.0, stock: 92, rating: 4.4, reviews: 44, tags: ['tea'], description: 'Second-flush Assam with a rich malt body — takes milk beautifully.' }),

  // Toys & Games
  S(1, 'Wooden Building Blocks (100pc)', { brand: 'LittleOak', category: 'toys', price: 46.0, stock: 38, rating: 4.9, reviews: 31, featured: true, tags: ['wooden', 'kids'], description: 'FSC-certified beech blocks in a canvas roll. Open-ended play that lasts decades.' }),
  S(2, 'Strategy Board Game: Tides', { brand: 'TableTopCo', category: 'toys', price: 39.0, stock: 24, rating: 4.6, reviews: 17, tags: ['board-game', 'family'], description: 'Two-to-four player strategy game of tidal trade routes. 45 minutes a round.' }),
  S(3, 'Remote-Control Buggy', { brand: 'LittleOak', category: 'toys', price: 58.0, compareAtPrice: 72.0, stock: 19, rating: 4.2, reviews: 23, tags: ['rc', 'kids'], description: 'All-terrain RC buggy with 30-minute runtime and USB-C charging.' }),
  S(4, 'Plush Teddy Bear 45cm', { brand: 'LittleOak', category: 'toys', price: 24.0, stock: 66, rating: 4.7, reviews: 42, tags: ['plush'], description: 'Ultra-soft recycled-fibre teddy with embroidered features (safe for toddlers).' }),
];

const REVIEW_TEXTS = [
  ['Exceeded my expectations', 'Genuinely impressed with the quality. Feels much more expensive than it is.'],
  ['Great value', 'Does exactly what it promises. Shipping was quick too.'],
  ['Solid everyday use', 'Been using it for a month and it still looks new. Recommended.'],
  ['Good, not perfect', 'Happy overall, though the packaging could be better.'],
  ['My second one', 'Bought one before, buying another says everything.'],
  ['Works as described', 'No complaints. Exactly what I wanted.'],
  ['Beautiful design', 'Gets compliments all the time.'],
  ['Decent for the price', 'Nothing fancy but does the job well.'],
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

async function seed() {
  const drop = process.argv.includes('--drop');
  await connectDB(env.MONGODB_URI);

  if (drop) {
    logger.warn('Dropping all collections…');
    await mongoose.connection.dropDatabase();
  }

  const passwordHashAdmin = await bcrypt.hash('Admin@12345', 10);
  const passwordHashDemo = await bcrypt.hash('Demo@12345', 10);

  const [admin, demo] = await Promise.all([
    User.findOneAndUpdate(
      { email: 'admin@shopnova.dev' },
      {
        $set: {
          name: 'ShopNova Admin',
          email: 'admin@shopnova.dev',
          passwordHash: passwordHashAdmin,
          role: 'admin',
          isActive: true,
        },
        $setOnInsert: {
          addresses: [
            {
              label: 'Office',
              fullName: 'ShopNova Admin',
              phone: '+8801712345678',
              line1: 'House 12, Road 5',
              city: 'Dhaka',
              region: 'Dhaka',
              upazila: 'Gulshan',
              postalCode: '1212',
              country: 'Bangladesh',
              isDefault: true,
            },
          ],
        },
      },
      { upsert: true, new: true },
    ),
    User.findOneAndUpdate(
      { email: 'demo@shopnova.dev' },
      {
        $set: {
          name: 'Demo Customer',
          email: 'demo@shopnova.dev',
          passwordHash: passwordHashDemo,
          role: 'customer',
          isActive: true,
        },
        $setOnInsert: {
          addresses: [
            {
              label: 'Home',
              fullName: 'Demo Customer',
              phone: '+8801812345678',
              line1: 'Flat B4, House 22',
              line2: 'Mirpur 10',
              city: 'Dhaka',
              region: 'Dhaka',
              upazila: 'Mirpur',
              postalCode: '1216',
              country: 'Bangladesh',
              isDefault: true,
            },
          ],
        },
      },
      { upsert: true, new: true },
    ),
  ]);
  logger.info(`Users: admin=${admin!.email}, demo=${demo!.email}`);

  // Extra reviewers for review volume
  const reviewers: any[] = [demo!];
  for (let i = 1; i <= 6; i++) {
    const u = await User.findOneAndUpdate(
      { email: `reviewer${i}@shopnova.dev` },
      {
        $set: {
          name: `Reviewer ${i}`,
          email: `reviewer${i}@shopnova.dev`,
          passwordHash: passwordHashDemo,
          role: 'customer',
          isActive: true,
        },
      },
      { upsert: true, new: true },
    );
    reviewers.push(u);
  }

  const categoryDocs = new Map<string, any>();
  for (const [i, cat] of CATEGORIES.entries()) {
    const slug = cat.slug ?? slugify(cat.name);
    const doc = await Category.findOneAndUpdate(
      { slug },
      { $set: { ...cat, slug, isActive: true, sortOrder: i } },
      { upsert: true, new: true },
    );
    categoryDocs.set(slug, doc);
  }
  logger.info(`Categories: ${categoryDocs.size}`);

  let productCount = 0;
  const productDocs: any[] = [];

  for (const [i, p] of PRODUCTS.entries()) {
    const seedKey = `sn-${slugify(p.title)}`;
    const slug = slugify(p.title);
    const category = categoryDocs.get(p.category);
    if (!category) throw new Error(`Unknown category: ${p.category}`);

    const variants = (p.variants ?? []).map((v, vi) => ({
      name: v.name,
      value: v.value,
      priceDelta: v.priceDelta ?? 0,
      stock: v.stock,
      sku: `VAR-${slug.toUpperCase().slice(0, 8)}-${vi + 1}`,
      image: '',
    }));

    const doc = await Product.findOneAndUpdate(
      { slug },
      {
        $set: {
          title: p.title,
          slug,
          description: p.description,
          brand: p.brand,
          sku: `SKU-${String(i + 1).padStart(4, '0')}`,
          price: p.price,
          compareAtPrice: p.compareAtPrice ?? 0,
          images: [img(seedKey), img(`${seedKey}-2`), img(`${seedKey}-3`)],
          category: category._id,
          stock: p.stock,
          variants,
          ratingAverage: 0,
          ratingCount: 0,
          isFeatured: Boolean(p.featured),
          isActive: true,
          tags: p.tags ?? [],
          weightKg: 0.5,
        },
      },
      { upsert: true, new: true },
    );
    productDocs.push(doc);
    productCount++;
  }
  logger.info(`Products: ${productCount}`);

  // Reviews — deterministic per product so reseeding is stable
  let reviewCount = 0;
  for (const [pi, product] of productDocs.entries()) {
    const meta = PRODUCTS[pi];
    const n = Math.min(meta.reviews, 6);
    for (let r = 0; r < n; r++) {
      const reviewer = reviewers[(pi + r) % reviewers.length];
      const [title, comment] = pick(REVIEW_TEXTS, pi + r);
      const rating = Math.min(5, Math.max(3, Math.round(meta.rating + ((r % 3) - 1) * 0.5)));
      await Review.findOneAndUpdate(
        { user: reviewer._id, product: product._id },
        {
          $set: {
            user: reviewer._id,
            product: product._id,
            rating,
            title,
            comment,
            isApproved: true,
            isVerifiedPurchase: true,
          },
        },
        { upsert: true },
      );
      reviewCount++;
    }
    // Recompute aggregates
    const agg = await Review.aggregate([
      { $match: { product: product._id, isApproved: true } },
      { $group: { _id: '$product', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    await Product.updateOne(
      { _id: product._id },
      {
        $set: {
          ratingAverage: agg[0] ? Math.round(agg[0].avg * 10) / 10 : meta.rating,
          ratingCount: agg[0]?.count ?? meta.reviews,
          soldCount: Math.round(meta.reviews * 3.7),
        },
      },
    );
  }
  logger.info(`Reviews: ${reviewCount}`);

  const in30Days = new Date(Date.now() + 30 * 24 * 3600 * 1000);
  const in90Days = new Date(Date.now() + 90 * 24 * 3600 * 1000);
  const COUPONS = [
    { code: 'WELCOME10', description: '10% off your first order', type: 'percent', value: 10, maxDiscount: 20, minOrder: 0, expiryDate: in90Days, usageLimit: 0, perUserLimit: 1 },
    { code: 'NOVA20', description: 'Flat 20 USD off orders over 150 USD', type: 'fixed', value: 20, minOrder: 150, expiryDate: in30Days, usageLimit: 500, perUserLimit: 2 },
    { code: 'FREESHIP', description: 'Flat $5 off shipping-sized orders', type: 'fixed', value: 5, minOrder: 40, expiryDate: in90Days, usageLimit: 1000, perUserLimit: 5 },
    { code: 'VIP15', description: '15% off for VIP shoppers (max $50)', type: 'percent', value: 15, maxDiscount: 50, minOrder: 100, expiryDate: in90Days, usageLimit: 200, perUserLimit: 3 },
  ];
  for (const c of COUPONS) {
    await Coupon.findOneAndUpdate({ code: c.code }, { $set: { ...c, isActive: true } }, { upsert: true });
  }
  logger.info(`Coupons: ${COUPONS.length}`);

  await Cart.updateMany({}, { $set: { items: [] } });

  console.log(''); console.log('[OK] Seed complete.');
  console.log('   > Admin login : admin@shopnova.dev / Admin@12345');
  console.log('   > Demo login  : demo@shopnova.dev / Demo@12345');
  console.log(`   > Coupons     : ${COUPONS.map((c) => c.code).join(", ")}\n`);

  await disconnectDB();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
