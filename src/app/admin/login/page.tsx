import { redirect } from 'next/navigation';

export default function AdminLoginPage() {
  // Unified login: redirect admin login entry to the main login page
  redirect('/');
}
