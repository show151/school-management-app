import { NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { sendTestNotificationEmail } from "@/lib/email";

export async function GET(request: Request) {
  try {
    const adminSession = await getAdminSessionFromRequest(request);
    if (!adminSession) {
      return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });
    }

    const tests = await prisma.test.findMany({
      orderBy: { testDate: "asc" },
    });

    return NextResponse.json(tests);
  } catch (error) {
    console.error('GET /api/admin/tests error:', error);
    return NextResponse.json({ error: 'テスト一覧の取得に失敗しました。' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const adminSession = await getAdminSessionFromRequest(request);
  if (!adminSession) {
    return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });
  }

  try {
    const { subject, period, range, testDate } = (await request.json()) as {
      subject?: string;
      period?: number;
      range?: string;
      testDate?: string;
    };

    if (!subject?.trim() || !period || !range?.trim() || !testDate) {
      return NextResponse.json(
        { error: "教科、時限、範囲、テスト日時を入力してください。" },
        { status: 400 }
      );
    }

    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, emailVerified: true },
    });

    if (users.length === 0) {
      return NextResponse.json(
        { error: "テストを配布するユーザーがまだ登録されていません。" },
        { status: 400 }
      );
    }

    const testDateObj = new Date(testDate);

    // テスト情報を全ユーザーに作成
    await prisma.test.createMany({
      data: users.map((user: { id: string }) => ({
        userId: user.id,
        subject: subject.trim(),
        period,
        range: range.trim(),
        testDate: testDateObj,
      })),
    });

    // 📧 すべてのユーザーにテスト情報通知メール送信
    for (const user of users) {
      if (user.emailVerified) {
        // メール送信を非同期で実行（エラーでも処理を続行）
        sendTestNotificationEmail(user.email, user.name, subject.trim(), testDateObj, range.trim()).catch(
          (err) => {
            console.error(`Failed to send test notification to ${user.email}:`, err);
          }
        );
      }
    }

    return NextResponse.json(
      {
        message: "テスト情報を登録しました。",
        subject,
        testDate: testDateObj,
        assignedCount: users.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Test creation error:", error);
    return NextResponse.json({ error: "テスト情報の登録に失敗しました。" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const adminSession = await getAdminSessionFromRequest(request);
  if (!adminSession) {
    return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });
  }

  try {
    const { id } = (await request.json()) as { id?: string };
    if (!id) return NextResponse.json({ error: "IDが必要です。" }, { status: 400 });

    await prisma.test.delete({ where: { id } });
    return NextResponse.json({ message: "テスト情報を削除しました。" });
  } catch {
    return NextResponse.json({ error: "テスト情報の削除に失敗しました。" }, { status: 500 });
  }
}
