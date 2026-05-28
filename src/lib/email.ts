import { Resend } from 'resend';
import { sanitizeInput } from '@/lib/security';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@school-management.com';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

/**
 * ユーザー登録確認メール送信
 */
export async function sendVerificationEmail(
  email: string,
  name: string,
  verificationToken: string
): Promise<boolean> {
  const verificationUrl = `${APP_URL}/auth/verify?token=${verificationToken}`;

  try {
    const safeName = sanitizeInput(name);
    console.log(`📧 Sending verification email to ${email}...`);
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'メールアドレスの確認',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>メールアドレスの確認</h2>
          <p>${safeName}さん、こんにちは！</p>
          <p>スクール管理アプリへの登録ありがとうございます。</p>
          <p>以下のリンクをクリックして、メールアドレスを確認してください：</p>
          <a href="${verificationUrl}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            メールアドレスを確認する
          </a>
          <p>または、下記のリンクをコピーしてブラウザに貼り付けてください：</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p style="color: #999; font-size: 12px; margin-top: 40px;">
            このメールに心当たりがない場合は、このメールを無視してください。
          </p>
        </div>
      `,
    });

    if (result.error) {
      console.warn('⚠️ Verification email rejected by Resend:', result.error);
      return false;
    }

    console.log(`✅ Verification email sent successfully:`, result);
    return true;
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    return false;
  }
}

/**
 * パスワードリセットメール送信
 */
export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetToken: string
): Promise<boolean> {
  const resetUrl = `${APP_URL}/auth/reset-password?token=${resetToken}`;

  try {
    const safeName = sanitizeInput(name);
    console.log(`📧 Sending password reset email to ${email}...`);
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'パスワードリセット',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>パスワードリセット</h2>
          <p>${safeName}さん</p>
          <p>パスワードをリセットするためのリクエストを受け取りました。</p>
          <p>以下のリンクをクリックして、新しいパスワードを設定してください：</p>
          <a href="${resetUrl}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            パスワードをリセット
          </a>
          <p style="color: #d32f2f; margin: 20px 0;">
            <strong>注意：</strong> このリンクは24時間有効です。期限を過ぎた場合は、パスワードリセット画面から再度リクエストしてください。
          </p>
          <p>パスワードをリセットしていない場合は、このメールを無視してください。</p>
          <p style="color: #999; font-size: 12px; margin-top: 40px;">
            このメールは自動送信です。返信しないでください。
          </p>
        </div>
      `,
    });

    if (result.error) {
      console.warn('⚠️ Password reset email rejected by Resend:', result.error);
      return false;
    }

    console.log(`✅ Password reset email sent successfully:`, result);
    return true;
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    return false;
  }
}

/**
 * 管理者に新規ユーザー登録通知メール送信
 */
export async function sendAdminNotificationEmail(
  adminEmail: string,
  userName: string,
  userEmail: string
): Promise<boolean> {
  try {
    const safeUserName = sanitizeInput(userName);
    const safeUserEmail = sanitizeInput(userEmail);
    console.log(`📧 Sending admin notification email to ${adminEmail}...`);
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: adminEmail,
      subject: '[通知] 新規ユーザーが登録されました',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>新規ユーザー登録通知</h2>
          <p>新しいユーザーが登録されました。</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background-color: #f5f5f5;">
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">ユーザー名</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${safeUserName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">メールアドレス</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${safeUserEmail}</td>
            </tr>
            <tr style="background-color: #f5f5f5;">
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">登録日時</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${new Date().toLocaleString('ja-JP')}</td>
            </tr>
          </table>
          <p>
            <a href="${APP_URL}/admin/users" style="display: inline-block; background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">
              管理画面でユーザー一覧を確認
            </a>
          </p>
        </div>
      `,
    });

    if (result.error) {
      console.warn('⚠️ Admin notification email rejected by Resend:', result.error);
      return false;
    }

    console.log(`✅ Admin notification email sent successfully:`, result);
    return true;
  } catch (error) {
    console.error('❌ Error sending admin notification email:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    return false;
  }
}

/**
 * タスク通知メール送信
 */
export async function sendTaskNotificationEmail(
  email: string,
  name: string,
  taskTitle: string,
  dueDate: Date
): Promise<boolean> {
  const dueDateStr = dueDate.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  try {
    const safeName = sanitizeInput(name);
    const safeTaskTitle = sanitizeInput(taskTitle);
    console.log(`📧 Sending task notification email to ${email}...`);
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `新しい課題が配布されました: ${safeTaskTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>新しい課題が配布されました</h2>
          <p>${safeName}さん</p>
          <p>新しい課題が配布されました。以下の詳細をご確認ください。</p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <p><strong>課題：</strong> ${safeTaskTitle}</p>
            <p><strong>締切日：</strong> ${dueDateStr}</p>
          </div>
          <p>
            <a href="${APP_URL}/dashboard/tasks" style="display: inline-block; background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">
              ダッシュボードで確認
            </a>
          </p>
          <p style="color: #d32f2f; margin: 20px 0;">
            <strong>注意：</strong> 締切を過ぎないようにご注意ください。
          </p>
        </div>
      `,
    });

    if (result.error) {
      console.warn('⚠️ Task notification email rejected by Resend:', result.error);
      return false;
    }

    console.log(`✅ Task notification email sent successfully:`, result);
    return true;
  } catch (error) {
    console.error('❌ Error sending task notification email:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    return false;
  }
}

/**
 * テスト通知メール送信
 */
export async function sendTestNotificationEmail(
  email: string,
  name: string,
  subject: string,
  testDate: Date,
  range: string
): Promise<boolean> {
  const testDateStr = testDate.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  try {
    const safeName = sanitizeInput(name);
    const safeSubject = sanitizeInput(subject);
    const safeRange = sanitizeInput(range);
    console.log(`📧 Sending test notification email to ${email}...`);
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `新しいテストが追加されました: ${safeSubject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>新しいテストが追加されました</h2>
          <p>${safeName}さん</p>
          <p>新しいテスト情報が追加されました。以下の詳細をご確認ください。</p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <p><strong>教科：</strong> ${safeSubject}</p>
            <p><strong>範囲：</strong> ${safeRange}</p>
            <p><strong>テスト日時：</strong> ${testDateStr}</p>
          </div>
          <p>
            <a href="${APP_URL}/dashboard/tasks" style="display: inline-block; background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">
              ダッシュボードで確認
            </a>
          </p>
          <p style="color: #d32f2f; margin: 20px 0;">
            <strong>注意：</strong> テスト対策をしっかり行いましょう。
          </p>
        </div>
      `,
    });

    if (result.error) {
      console.warn('⚠️ Test notification email rejected by Resend:', result.error);
      return false;
    }

    console.log(`✅ Test notification email sent successfully:`, result);
    return true;
  } catch (error) {
    console.error('❌ Error sending test notification email:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    return false;
  }
}

/**
 * ユーザーへのお知らせメール送信
 */
export async function sendAnnouncementEmail(
  email: string,
  name: string,
  title: string,
  body: string
): Promise<boolean> {
  try {
    const safeName = sanitizeInput(name);
    const safeTitle = sanitizeInput(title);
    const safeBody = sanitizeInput(body);
    console.log(`📧 Sending announcement email to ${email}...`);
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `お知らせ: ${safeTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>お知らせ</h2>
          <p>${safeName}さん</p>
          <h3>${safeTitle}</h3>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 6px; margin: 20px 0; line-height: 1.6;">
            ${safeBody.replace(/\n/g, '<br>')}
          </div>
          <p>詳細はダッシュボードでご確認ください。</p>
          <p>
            <a href="${APP_URL}/dashboard" style="display: inline-block; background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">
              ダッシュボードを開く
            </a>
          </p>
        </div>
      `,
    });

    if (result.error) {
      console.warn('⚠️ Announcement email rejected by Resend:', result.error);
      return false;
    }

    console.log(`✅ Announcement email sent successfully:`, result);
    return true;
  } catch (error) {
    console.error('❌ Error sending announcement email:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    return false;
  }
}

/**
 * 複数ユーザーへのタスク通知メール一括送信
 */
export async function sendBulkTaskNotificationEmail(
  recipients: Array<{ email: string; name: string }>,
  taskTitle: string,
  dueDate: Date
): Promise<{ success: number; failed: number; errors: string[] }> {
  const dueDateStr = dueDate.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  let successCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  console.log(`📧 Sending task notification to ${recipients.length} users...`);

  for (const recipient of recipients) {
    const success = await sendTaskNotificationEmail(
      recipient.email,
      recipient.name,
      taskTitle,
      dueDate
    );
    if (success) {
      successCount++;
    } else {
      failedCount++;
      errors.push(`${recipient.email}: Failed to send`);
    }
  }

  console.log(
    `✅ Task notification complete: ${successCount} succeeded, ${failedCount} failed`
  );
  return { success: successCount, failed: failedCount, errors };
}

/**
 * 複数ユーザーへのテスト通知メール一括送信
 */
export async function sendBulkTestNotificationEmail(
  recipients: Array<{ email: string; name: string }>,
  subject: string,
  testDate: Date,
  range: string
): Promise<{ success: number; failed: number; errors: string[] }> {
  let successCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  console.log(`📧 Sending test notification to ${recipients.length} users...`);

  for (const recipient of recipients) {
    const success = await sendTestNotificationEmail(
      recipient.email,
      recipient.name,
      subject,
      testDate,
      range
    );
    if (success) {
      successCount++;
    } else {
      failedCount++;
      errors.push(`${recipient.email}: Failed to send`);
    }
  }

  console.log(
    `✅ Test notification complete: ${successCount} succeeded, ${failedCount} failed`
  );
  return { success: successCount, failed: failedCount, errors };
}

/**
 * 複数ユーザーへのお知らせメール一括送信
 */
export async function sendBulkAnnouncementEmail(
  recipients: Array<{ email: string; name: string }>,
  title: string,
  body: string
): Promise<{ success: number; failed: number; errors: string[] }> {
  let successCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  console.log(`📧 Sending announcement to ${recipients.length} users...`);

  for (const recipient of recipients) {
    const success = await sendAnnouncementEmail(
      recipient.email,
      recipient.name,
      title,
      body
    );
    if (success) {
      successCount++;
    } else {
      failedCount++;
      errors.push(`${recipient.email}: Failed to send`);
    }
  }

  console.log(
    `✅ Announcement complete: ${successCount} succeeded, ${failedCount} failed`
  );
  return { success: successCount, failed: failedCount, errors };
}

/**
 * 課題締め切り1日前リマインダーメール送信
 */
export async function sendTaskReminderEmail(
  email: string,
  name: string,
  taskTitle: string,
  subject: string,
  dueDate: Date
): Promise<boolean> {
  const dueDateStr = dueDate.toLocaleDateString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });

  try {
    const safeName = sanitizeInput(name);
    const safeTitle = sanitizeInput(taskTitle);
    const safeSubject = sanitizeInput(subject);
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `【締め切り明日】${safeSubject}：${safeTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #c2410c;">⚠️ 課題の締め切りは明日です</h2>
          <p>${safeName}さん</p>
          <p>以下の課題の締め切りが<strong>明日（${dueDateStr}）</strong>に迫っています。</p>
          <div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 16px; border-radius: 6px; margin: 20px 0;">
            <p style="margin:0"><strong>教科：</strong> ${safeSubject}</p>
            <p style="margin:8px 0 0"><strong>課題：</strong> ${safeTitle}</p>
            <p style="margin:8px 0 0"><strong>締切日：</strong> ${dueDateStr}</p>
          </div>
          <p>
            <a href="${APP_URL}/dashboard" style="display: inline-block; background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">
              ダッシュボードで確認
            </a>
          </p>
        </div>
      `,
    });

    if (result.error) {
      console.warn('⚠️ Task reminder email rejected by Resend:', result.error);
      return false;
    }

    console.log(`✅ Task reminder sent to ${email}:`, result);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send task reminder to ${email}:`, error);
    return false;
  }
}
