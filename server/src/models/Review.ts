import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const reviewSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, maxlength: 120, default: '' },
    comment: { type: String, required: true, trim: true, maxlength: 2000 },
    isVerifiedPurchase: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: true },
  },
  { timestamps: true },
);

reviewSchema.index({ product: 1, createdAt: -1 });
reviewSchema.index({ user: 1, product: 1 }, { unique: true });

export type ReviewSchemaType = InferSchemaType<typeof reviewSchema> & {
  createdAt: Date;
  updatedAt: Date;
};
export type ReviewDoc = mongoose.HydratedDocument<ReviewSchemaType>;
export const Review: Model<ReviewSchemaType> =
  (mongoose.models.Review as Model<ReviewSchemaType>) ??
  mongoose.model<ReviewSchemaType>('Review', reviewSchema);
