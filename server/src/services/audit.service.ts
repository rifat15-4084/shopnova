import type { Request } from 'express';
import { AuditLog } from '../models/AuditLog.js';
import { logger } from '../config/logger.js';

export async function recordAudit(input: {
  req?: Request;
  actorId: string;
  actorEmail?: string;
  action: string;
  entity: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
}): Promise<void> {
  try {
    await AuditLog.create({
      actor: input.actorId,
      actorEmail: input.actorEmail ?? '',
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? '',
      before: input.before as any,
      after: input.after as any,
      ip: input.req?.ip ?? '',
      userAgent: String(input.req?.headers?.['user-agent'] ?? '').slice(0, 300),
    });
  } catch (err) {
    logger.error({ err }, 'Failed to write audit log');
  }
}
