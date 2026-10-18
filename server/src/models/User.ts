import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const addressSchema = new Schema(
  {
    label: { type: String, trim: true, default: 'Home' },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, required: true, trim: true }, // district
    region: { type: String, trim: true }, // division
    upazila: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, default: 'Bangladesh', trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true },
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer', index: true },
    addresses: { type: [addressSchema], default: [] },
    wishlist: { type: [Schema.Types.ObjectId], ref: 'Product', default: [] },
    isActive: { type: Boolean, default: true, index: true },
    refreshTokens: { type: [String], default: [], select: false },
    passwordChangedAt: { type: Date },
    lastLoginAt: { type: Date },
    resetPasswordTokenHash: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc: unknown, ret: Record<string, unknown>) {
        delete (ret as Record<string, unknown>).passwordHash;
        delete (ret as Record<string, unknown>).refreshTokens;
        delete (ret as Record<string, unknown>).resetPasswordTokenHash;
        delete (ret as Record<string, unknown>).__v;
        return ret;
      },
    },
  },
);

userSchema.index({ name: 'text', email: 'text' });

export type UserSchemaType = InferSchemaType<typeof userSchema> & {
  createdAt: Date;
  updatedAt: Date;
};
export type UserDoc = mongoose.HydratedDocument<UserSchemaType>;
export const User: Model<UserSchemaType> =
  (mongoose.models.User as Model<UserSchemaType>) ??
  mongoose.model<UserSchemaType>('User', userSchema);
export { addressSchema };
