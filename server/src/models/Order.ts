import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

export const ORDER_STATUSES = [
  'pending',
  'paid',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const orderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    title: { type: String, required: true },
    slug: { type: String, default: '' },
    image: { type: String, default: '' },
    sku: { type: String, default: '' },
    variantId: { type: String, default: null },
    variantLabel: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 }, // unit price snapshot
    qty: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const shippingAddressSchema = new Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    line2: { type: String, default: '' },
    city: { type: String, required: true }, // district
    region: { type: String, default: '' }, // division
    upazila: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    country: { type: String, default: 'Bangladesh' },
  },
  { _id: false },
);

const timelineSchema = new Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    note: { type: String, default: '' },
    at: { type: Date, default: Date.now },
    by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [orderItemSchema], required: true },
    shippingAddress: { type: shippingAddressSchema, required: true },

    paymentMethod: {
      type: String,
      enum: ['stripe', 'cod', 'bkash'],
      required: true,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded', 'partially_refunded', 'failed'],
      default: 'unpaid',
      index: true,
    },
    stripeSessionId: { type: String, default: null, index: { unique: true, sparse: true } },
    stripePaymentIntentId: { type: String, default: null },
    paidAt: { type: Date },

    itemsSubtotal: { type: Number, required: true, min: 0 },
    shippingCost: { type: Number, required: true, min: 0 },
    tax: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'usd' },

    couponCode: { type: String, default: null, uppercase: true },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending', index: true },
    trackingNumber: { type: String, default: '' },
    carrier: { type: String, default: '' },
    timeline: { type: [timelineSchema], default: [] },

    stockReversed: { type: Boolean, default: false },
    refundAmount: { type: Number, default: 0 },
    adminNotes: { type: String, default: '' },
    cancelReason: { type: String, default: '' },
    invoiceNote: { type: String, default: '' },
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

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });

export type OrderSchemaType = InferSchemaType<typeof orderSchema> & {
  createdAt: Date;
  updatedAt: Date;
};
export type OrderDoc = mongoose.HydratedDocument<OrderSchemaType>;
export const Order: Model<OrderSchemaType> =
  (mongoose.models.Order as Model<OrderSchemaType>) ?? mongoose.model<OrderSchemaType>('Order', orderSchema);
