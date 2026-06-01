"use client";

import { useState } from "react";

type HeaderProps = {
  isAdmin?: boolean;
};

export default function Header({ isAdmin }: HeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="py-4 border-b" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: "var(--primary)" }}>
          📚 高専管理アプリ
        </h1>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <a href="/dashboard" className="text-[var(--foreground)] hover:text-[var(--primary)] transition-colors">
            ダッシュボード
          </a>
          {isAdmin && (
            <a href="/admin" className="text-[var(--admin)] hover:opacity-80 transition-opacity">管理</a>
          )}
        </nav>

        <div className="md:hidden">
          <button
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
            className="p-2 rounded-lg border shadow-sm"
            style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
          >
            <svg className="w-5 h-5" style={{ color: "var(--muted)" }} viewBox="0 0 20 20" fill="currentColor">
              {open ? (
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M3 5h14a1 1 0 010 2H3a1 1 0 010-2zm0 4h14a1 1 0 010 2H3a1 1 0 010-2zm0 4h14a1 1 0 010 2H3a1 1 0 010-2z" clipRule="evenodd" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3 md:hidden rounded-xl p-3 shadow-sm space-y-2 border"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
          <a href="/dashboard" className="block text-sm font-medium text-[var(--foreground)]">ダッシュボード</a>
          {isAdmin && (
            <a href="/admin" className="block text-sm font-medium" style={{ color: "var(--admin)" }}>管理</a>
          )}
        </div>
      )}
    </header>
  );
}
