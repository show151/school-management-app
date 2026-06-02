type SendEmailType = "task" | "test" | "testSchedule" | "announcement" | "announcementUpdate" | "taskDueDateUpdate" | "testScheduleUpdate";

type SendEmailPayload = {
  taskTitle?: string;
  dueDate?: string;
  subject?: string;
  testDate?: string;
  range?: string;
  note?: string;
  title?: string;
  body?: string;
  scheduleTitle?: string;
  scheduleId?: string;
  startDate?: string;
  endDate?: string;
};

export async function sendAdminEmail(options: {
  type: SendEmailType;
  selectedUserIds: string[];
  studentNumberFrom: string;
  studentNumberTo: string;
  payload: SendEmailPayload;
}): Promise<{ ok: boolean; error?: string }> {
  const hasRange = Boolean(options.studentNumberFrom || options.studentNumberTo);
  const hasSelection = options.selectedUserIds.length > 0;

  const res = await fetch("/api/admin/send-email", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: options.type,
      userIds: hasRange || hasSelection ? options.selectedUserIds : ["ALL"],
      studentNumberFrom: options.studentNumberFrom ? Number(options.studentNumberFrom) : undefined,
      studentNumberTo: options.studentNumberTo ? Number(options.studentNumberTo) : undefined,
      payload: options.payload,
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unknown error" }));
    return { ok: false, error: error.error as string | undefined };
  }

  return { ok: true };
}
