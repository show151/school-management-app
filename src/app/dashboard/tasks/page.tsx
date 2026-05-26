import { redirect } from "next/navigation";

export default function DashboardTasksRedirectPage() {
  redirect("/admin/tasks");
}
