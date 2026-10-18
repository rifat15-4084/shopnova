import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const variantSchema = new Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. "Size" or "Color"
    value: { type: String, required: true, trim: true }, // e.g. "XL" or "Midnight"
    priceDelta: { type: Number, default: 0 },
    stock: { type: Number, default: 0, min: 0 },
    sku: { type: String, trim: true },
    image: { type: String, default: '' },
  },
  { _id: true },
);

const productSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true, index: true, lowercase: true },
    description: { type: String, required: true, trim: true },
    brand: { type: String, trim: true, index: true, default: 'ShopNova' },
    sku: { type: String, trim: true, index: true },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0, default: 0 },
    images: { type: [String], default: [] },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    stock: { type: Number, default: 0, min: 0 },
    variants: { type: [variantSchema], default: [] },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    soldCount: { type: Number, default: 0, min: 0 },
    isFeatured: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    tags: { type: [String], default: [] },
    weightKg: { type: Number, default: 0.5 },
    meta: {
      title: { type: String, default: '' },
      description: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc: unknown, ret: Record<string, unknown>) {
        delete (ret as Record<string, unknown>).__v;
        return ret;
      },
    },
  },
);

productSchema.index({ title: 'text', description: 'text', brand: 'text', tags: 'text' });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ ratingAverage: -1 });
productSchema.index({ soldCount: -1 });
productSchema.index({ isActive: 1, isFeatured: 1, createdAt: -1 });

/** Total stock across base + variants */
productSchema.virtual('totalStock').get(function (this: InferSchemaType<typeof productSchema>) {
  const variantStock = (this.variants ?? []).reduce((sum, v) => sum + (v.stock ?? 0), 0);
  return (this.stock ?? 0) + variantStock;
});

productSchema.set('toJSON', { virtuals: true });

export type ProductSchemaType = InferSchemaType<typeof productSchema> & {
  createdAt: Date;
  updatedAt: Date;
  totalStock: number;
};
export type ProductDoc = mongoose.HydratedDocument<ProductSchemaType>;
export const Product: Model<ProductSchemaType> =
  (mongoose.models.Product as Model<ProductSchemaType>) ??
  mongoose.model<ProductSchemaType>('Product', productSchema);
