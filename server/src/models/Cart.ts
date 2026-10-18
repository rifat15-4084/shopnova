import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const cartItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: String, default: null },
    variantLabel: { type: String, default: '' },
    qty: { type: Number, required: true, min: 1, max: 999 },
    price: { type: Number, required: true, min: 0 }, // snapshot at add-time (revalidated on read)
  },
  { _id: false },
);

const cartSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [cartItemSchema], default: [] },
    couponCode: { type: String, default: null, uppercase: true, trim: true },
  },
  { timestamps: true },
);

cartSchema.index({ user: 1 }, { unique: true });

export type CartSchemaType = InferSchemaType<typeof cartSchema> & {
  createdAt: Date;
  updatedAt: Date;
};
export type CartDoc = mongoose.HydratedDocument<CartSchemaType>;
export const Cart: Model<CartSchemaType> =
  (mongoose.models.Cart as Model<CartSchemaType>) ?? mongoose.model<CartSchemaType>('Cart', cartSchema);
