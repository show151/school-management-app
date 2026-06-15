/**
 * @file audit-log.ts
 * @description アプリケーションの監査ログ（Audit Log）を記録・管理するための機能を提供します。
 * 誰が、いつ、何を行ったか（ログイン、データ変更など）をDBに保存します。
 */
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

/**
 * 監査ログをデータベースに記録します。
 * 失敗してもアプリケーションのメイン処理を止めないよう、エラーはコンソールに出力するのみとしています。
 * @param input - 記録する監査ログの情報（実行者、アクション、結果など）
 */
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

/**
 * リクエストからIPアドレスとUser-Agentを取得します。
 * 監査ログに記録するクライアント情報を抽出するために使用します。
 * @param request - HTTPリクエストオブジェクト
 * @returns IPアドレスとUser-Agentを含むオブジェクト
 */
export function getRequestMeta(request: Request) {
  // プロキシ環境を考慮して x-forwarded-for などを確認
  const ipHeader = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const ipAddress = ipHeader.split(',')[0]?.trim() || 'unknown';
  const userAgent = request.headers.get('user-agent') || null;
  return { ipAddress, userAgent };
}
