import { prisma } from '@/lib/prisma';

export type AuditActorType = 'user' | 'admin' | 'system';
export type AuditResult = 'success' | 'failure';

export type AuditLogInput = {
  actorType: AuditActorType;
  action: string;
  result: AuditResult;
  actorId?: string | null;
  email?: string | null;
  resource?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: unknown;
};

export async function recordAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorType: input.actorType,
        actorId: input.actorId ?? null,
        email: input.email ?? null,
        action: input.action,
        resource: input.resource ?? null,
        result: input.result,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        details: typeof input.details === 'undefined' ? null : JSON.stringify(input.details),
      },
    });
  } catch (error) {
    console.error('Audit log write failed:', error);
  }
}

export function getRequestMeta(request: Request) {
  const ipHeader = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const ipAddress = ipHeader.split(',')[0]?.trim() || 'unknown';
  const userAgent = request.headers.get('user-agent') || null;
  return { ipAddress, userAgent };
}
