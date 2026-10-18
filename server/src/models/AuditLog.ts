import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const auditLogSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actorEmail: { type: String, default: '' },
    action: { type: String, required: true, index: true }, // e.g. "product.update"
    entity: { type: String, required: true, index: true }, // e.g. "Product"
    entityId: { type: String, default: '' },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ createdAt: -1 });

export type AuditLogSchemaType = InferSchemaType<typeof auditLogSchema> & { createdAt: Date };
export type AuditLogDoc = mongoose.HydratedDocument<AuditLogSchemaType>;
export const AuditLog: Model<AuditLogSchemaType> =
  (mongoose.models.AuditLog as Model<AuditLogSchemaType>) ??
  mongoose.model<AuditLogSchemaType>('AuditLog', auditLogSchema);
