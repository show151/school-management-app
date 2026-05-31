import { Resend } from 'resend';
import { sanitizeInput } from '@/lib/security';
import { markdownToHtml } from './markdown';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@school-management.com';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

type Recipient = { email: string; name?: string | null };

async function sendRawEmail(to: string, subject: string, html: string) {
  try {
    const res = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    if ((res as any).error) {
      console.warn('Resend rejected email:', (res as any).error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error sending email via Resend:', err);
    return false;
  }
}

export async function sendVerificationEmail(
  email: string,
  name: string,
  verificationToken: string
): Promise<boolean> {
  const safeName = sanitizeInput(name);
  const verificationUrl = `${APP_URL}/auth/verify?token=${encodeURIComponent(
    verificationToken
  )}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>メールアドレスの確認</h2>
      <p>${safeName}さん、こんにちは。</p>
      <p>スクール管理アプリへの登録ありがとうございます。以下のリンクをクリックしてメールアドレスを確認してください。</p>
      <p><a href="${verificationUrl}" style="display:inline-block;padding:12px 20px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;">メールアドレスを確認する</a></p>
      <p style="word-break:break-all;color:#666;">${verificationUrl}</p>
    </div>
  `;

  return sendRawEmail(email, 'メールアドレスの確認', html);
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetToken: string
): Promise<boolean> {
  const safeName = sanitizeInput(name);
  const resetUrl = `${APP_URL}/auth/reset-password?token=${encodeURIComponent(resetToken)}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>パスワードリセット</h2>
      <p>${safeName}さん</p>
      <p>パスワードリセットのリクエストを受け付けました。以下のリンクから新しいパスワードを設定してください（リンクは24時間有効です）。</p>
      <p><a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;">パスワードをリセット</a></p>
    </div>
  `;

  return sendRawEmail(email, 'パスワードリセット', html);
}

export async function sendAdminNotificationEmail(
  adminEmail: string,
  userName: string,
  userEmail: string
): Promise<boolean> {
  const safeUserName = sanitizeInput(userName);
  const safeUserEmail = sanitizeInput(userEmail);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>新規ユーザー登録通知</h2>
      <p>新しいユーザーが登録されました。</p>
      <table style="width:100%;border-collapse:collapse;margin-top:12px;">
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600;">ユーザー名</td><td style="padding:8px;border:1px solid #ddd;">${safeUserName}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600;">メール</td><td style="padding:8px;border:1px solid #ddd;">${safeUserEmail}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600;">登録日時</td><td style="padding:8px;border:1px solid #ddd;">${new Date().toLocaleString('ja-JP')}</td></tr>
      </table>
      <p style="margin-top:16px;"><a href="${APP_URL}/admin/users" style="display:inline-block;padding:8px 14px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;">管理画面で確認</a></p>
    </div>
  `;

  return sendRawEmail(adminEmail, '[通知] 新規ユーザーが登録されました', html);
}

export async function sendTaskNotificationEmail(
  email: string,
  name: string,
  taskTitle: string,
  dueDate: Date
): Promise<boolean> {
  const safeName = sanitizeInput(name);
  const safeTaskTitle = sanitizeInput(taskTitle);
  const dueDateStr = dueDate.toLocaleString('ja-JP');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>新しい課題が配布されました</h2>
      <p>${safeName}さん</p>
      <div style="background:#f5f5f5;padding:12px;border-radius:6px;margin:12px 0;">
        <p><strong>課題：</strong>${safeTaskTitle}</p>
        <p><strong>締切：</strong>${dueDateStr}</p>
      </div>
      <p><a href="${APP_URL}/dashboard/tasks" style="display:inline-block;padding:8px 14px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;">ダッシュボードで確認</a></p>
    </div>
  `;

  return sendRawEmail(email, `新しい課題が配布されました: ${safeTaskTitle}`, html);
}

export async function sendTaskReminderEmail(
  email: string,
  name: string,
  title: string,
  subject: string,
  dueDate: Date
): Promise<boolean> {
  const safeName = sanitizeInput(name);
  const safeTitle = sanitizeInput(title);
  const safeSubject = sanitizeInput(subject);
  const dueDateStr = dueDate.toLocaleString('ja-JP');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>課題の締切が近づいています</h2>
      <p>${safeName}さん</p>
      <div style="background:#fff7e6;padding:12px;border-radius:6px;margin:12px 0;border:1px solid #f0e6cc;">
        <p><strong>課題：</strong>${safeTitle}</p>
        <p><strong>科目：</strong>${safeSubject}</p>
        <p><strong>締切：</strong>${dueDateStr}</p>
      </div>
      <p><a href="${APP_URL}/dashboard/tasks" style="display:inline-block;padding:8px 14px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;">確認する</a></p>
    </div>
  `;

  return sendRawEmail(email, `締切リマインダー: ${safeTitle}`, html);
}

export async function sendTestNotificationEmail(
  email: string,
  name: string,
  subjectName: string,
  testDate: Date,
  range: string,
  note?: string
): Promise<boolean> {
  const safeName = sanitizeInput(name);
  const safeSubject = sanitizeInput(subjectName);
  const safeRange = sanitizeInput(range);
  const testDateStr = testDate.toLocaleString('ja-JP');

  const noteHtml = note ? `<div style="background:#fff;padding:12px;border-radius:6px;margin:12px 0;border:1px solid #eee;"><strong>特記事項</strong><div style="margin-top:8px;">${markdownToHtml(note)}</div></div>` : '';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>テスト情報が登録されました</h2>
      <p>${safeName}さん</p>
      <div style="background:#f5f5f5;padding:12px;border-radius:6px;margin:12px 0;">
        <p><strong>教科：</strong>${safeSubject}</p>
        <p><strong>範囲：</strong>${safeRange}</p>
        <p><strong>日時：</strong>${testDateStr}</p>
      </div>
      ${noteHtml}
      <p><a href="${APP_URL}/dashboard" style="display:inline-block;padding:8px 14px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;">ダッシュボードで確認</a></p>
    </div>
  `;

  return sendRawEmail(email, `テストのお知らせ: ${safeSubject}`, html);
}

export async function sendAnnouncementEmail(
  email: string,
  name: string,
  title: string,
  body: string
): Promise<boolean> {
  const safeName = sanitizeInput(name);
  const safeTitle = sanitizeInput(title);
  const bodyHtml = markdownToHtml(body);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>お知らせ</h2>
      <p>${safeName}さん</p>
      <h3>${safeTitle}</h3>
      <div style="background:#f5f5f5;padding:12px;border-radius:6px;margin:12px 0;line-height:1.6;">${bodyHtml}</div>
      <p><a href="${APP_URL}/dashboard" style="display:inline-block;padding:8px 14px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;">ダッシュボードを開く</a></p>
    </div>
  `;

  return sendRawEmail(email, `お知らせ: ${safeTitle}`, html);
}

// Bulk senders return a summary of successes/failures
export async function sendBulkTaskNotificationEmail(recipients: Recipient[], taskTitle: string, dueDate: Date) {
  let success = 0;
  let failed = 0;
  for (const r of recipients) {
    const ok = await sendTaskNotificationEmail(r.email, r.name ?? '', taskTitle, dueDate);
    if (ok) success += 1; else failed += 1;
  }
  return { success, failed };
}

export async function sendBulkTestNotificationEmail(recipients: Recipient[], subjectName: string, testDate: Date, range: string, note?: string) {
  let success = 0;
  let failed = 0;
  for (const r of recipients) {
    const ok = await sendTestNotificationEmail(r.email, r.name ?? '', subjectName, testDate, range, note);
    if (ok) success += 1; else failed += 1;
  }
  return { success, failed };
}

export async function sendBulkAnnouncementEmail(recipients: Recipient[], title: string, body: string) {
  let success = 0;
  let failed = 0;
  for (const r of recipients) {
    const ok = await sendAnnouncementEmail(r.email, r.name ?? '', title, body);
    if (ok) success += 1; else failed += 1;
  }
  return { success, failed };
}
