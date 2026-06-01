import { NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { validateUrl } from "@/lib/security";

type DailyLinkInput = {
  id?: string;
  label?: string;
  description?: string;
  href?: string;
  sortOrder?: number;
};

function isMissingDailyLinkTableError(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "P2021"
  ) {
    return true;
  }

  return error instanceof Error && error.message.includes("TableDoesNotExist");
}

function normalizeInput(body: DailyLinkInput) {
  const label = body.label?.trim() ?? "";
  const description = body.description?.trim() || null;
  const href = body.href?.trim() ?? "";
  const sortOrder = Number.isFinite(body.sortOrder) ? Number(body.sortOrder) : 0;

  if (!label) return { error: "リンク名を入力してください。" };
  if (!href) return { error: "URLを入力してください。" };
  if (!validateUrl(href)) return { error: "有効なURLまたはアプリリンクを入力してください。" };

  return { data: { label, description, href, sortOrder } };
}

export async function GET(request: Request) {
  try {
    const adminSession = await getAdminSessionFromRequest(request);
    if (!adminSession) {
      return NextResponse.json([]);
    }

    const links = await prisma.dailyLink.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json(links);
  } catch (error) {
    if (isMissingDailyLinkTableError(error)) {
      return NextResponse.json([]);
    }
    console.error("GET /api/admin/daily-links error:", error);
    return NextResponse.json({ error: "リンク一覧の取得に失敗しました。" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const adminSession = await getAdminSessionFromRequest(request);
  if (!adminSession) {
    return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as DailyLinkInput;
    const normalized = normalizeInput(body);
    if ("error" in normalized) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }

    const link = await prisma.dailyLink.create({ data: normalized.data });
    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    if (isMissingDailyLinkTableError(error)) {
      return NextResponse.json(
        { error: "リンク保存用のDBテーブルがまだ作成されていません。マイグレーションを実行してください。" },
        { status: 503 }
      );
    }
    console.error("POST /api/admin/daily-links error:", error);
    return NextResponse.json({ error: "リンクの登録に失敗しました。" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const adminSession = await getAdminSessionFromRequest(request);
  if (!adminSession) {
    return NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as DailyLinkInput;
    if (!body.id) return NextResponse.json({ error: "IDが必要です。" }, { status: 400 });

    const normalized = normalizeInput(body);
    if ("error" in normalized) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }

    const link = await prisma.dailyLink.update({
      where: { id: body.id },
      data: normalized.data,
    });
    return NextResponse.json(link);
  } catch (error) {
    if (isMissingDailyLinkTableError(error)) {
      return NextResponse.json(
        { error: "リンク保存用のDBテーブルがまだ作成されていません。マイグレーションを実行してください。" },
        { status: 503 }
      );
    }
    console.error("PUT /api/admin/daily-links error:", error);
    return NextResponse.json({ error: "リンクの更新に失敗しました。" }, { status: 500 });
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

    await prisma.dailyLink.delete({ where: { id } });
    return NextResponse.json({ message: "削除しました。" });
  } catch (error) {
    if (isMissingDailyLinkTableError(error)) {
      return NextResponse.json(
        { error: "リンク保存用のDBテーブルがまだ作成されていません。マイグレーションを実行してください。" },
        { status: 503 }
      );
    }
    console.error("DELETE /api/admin/daily-links error:", error);
    return NextResponse.json({ error: "リンクの削除に失敗しました。" }, { status: 500 });
  }
}
