import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import { randomSuffix } from '../utils/slugify.js';

const couponSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    description: { type: String, default: '' },
    type: { type: String, enum: ['percent', 'fixed'], required: true },
    value: { type: Number, required: true, min: 0 },
    maxDiscount: { type: Number, default: 0 }, // cap for percent coupons (0 = no cap)
    minOrder: { type: Number, default: 0 },
    expiryDate: { type: Date, required: true, index: true },
    usageLimit: { type: Number, default: 0 }, // 0 = unlimited
    usedCount: { type: Number, default: 0, min: 0 },
    perUserLimit: { type: Number, default: 1 },
    applicableProductIds: { type: [Schema.Types.ObjectId], ref: 'Product', default: [] },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

couponSchema.statics.generateCode = function () {
  return `NOVA${randomSuffix(6).toUpperCase()}`;
};

export type CouponSchemaType = InferSchemaType<typeof couponSchema> & {
  createdAt: Date;
  updatedAt: Date;
};
export type CouponDoc = mongoose.HydratedDocument<CouponSchemaType>;
export const Coupon: Model<CouponSchemaType> =
  (mongoose.models.Coupon as Model<CouponSchemaType>) ??
  mongoose.model<CouponSchemaType>('Coupon', couponSchema);
