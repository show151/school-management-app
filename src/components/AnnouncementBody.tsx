"use client";

import { markdownToHtml } from "@/lib/markdown";

type AnnouncementBodyProps = {
  body: string;
  muted?: boolean;
  className?: string;
};

export function AnnouncementBody({ body, muted = false, className = "" }: AnnouncementBodyProps) {
  return (
    <div
      className={`announcement-body min-w-0 max-w-full overflow-hidden text-sm [overflow-wrap:anywhere] [&_*]:max-w-full [&_a]:break-all [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 ${className}`}
      style={{ color: muted ? "var(--muted)" : "var(--foreground)" }}
      dangerouslySetInnerHTML={{ __html: markdownToHtml(body) }}
    />
  );
}
