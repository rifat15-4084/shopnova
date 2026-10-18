import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import { slugify } from '../utils/slugify.js';

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60, unique: true },
    slug: { type: String, required: true, unique: true, index: true, lowercase: true },
    image: { type: String, default: '' },
    description: { type: String, default: '', trim: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

categorySchema.pre('validate', function (next) {
  if (this.isModified('name') && !this.slug) this.slug = slugify(this.name);
  next();
});

export type CategorySchemaType = InferSchemaType<typeof categorySchema> & {
  createdAt: Date;
  updatedAt: Date;
};
export type CategoryDoc = mongoose.HydratedDocument<CategorySchemaType>;
export const Category: Model<CategorySchemaType> =
  (mongoose.models.Category as Model<CategorySchemaType>) ??
  mongoose.model<CategorySchemaType>('Category', categorySchema);
