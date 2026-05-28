import React from 'react';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { redirect } from 'next/navigation';
import { getRequiredEnv } from '@/lib/env';
import { prisma } from '@/lib/prisma';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get('admin_token')?.value;

  if (!adminToken) {
    return redirect('/');
  }

  try {
    const secret = new TextEncoder().encode(getRequiredEnv('JWT_SECRET'));
    const { payload } = await jwtVerify(adminToken, secret);
    const email = (payload as any).email as string | undefined;
    if (!email) return redirect('/');

    // Confirm admin exists in DB (or matches env fallback)
    const dbUser = await prisma.user.findUnique({ where: { email } });
    const isEnvAdmin = process.env.ADMIN_EMAIL === email && process.env.ADMIN_PASSWORD;
    if (!dbUser && !isEnvAdmin) return redirect('/');
    if (dbUser && !dbUser.isAdmin) return redirect('/');
  } catch (err) {
    return redirect('/');
  }

  return <>{children}</>;
}
