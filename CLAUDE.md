@AGENTS.md
# Coding Guidelines for Next.js (App Router) & Prisma Project

You are an expert full-stack developer assisting with a Next.js (App Router) and Prisma project. Follow these strict architectural and coding patterns to ensure up-to-date, secure, and error-free implementation.

---

## 1. Next.js App Router Architecture

### Client vs. Server Components
* **Default to Server Components:** All components in the `app` directory are Server Components by default. Keep them as Server Components to fetch data directly from Prisma or access cookies securely.
* **Use Client Components Judiciously:** Add the `"use client"` directive at the very top of the file **only** when using React hooks (`useState`, `useEffect`, `useActionState`, etc.), browser APIs, or event listeners (`onClick`, `onSubmit`).
* **Granular Client Components:** Move interactive elements into smaller, dedicated client components rather than marking an entire page or layout as `"use client"`.

### Route Handlers (API Routes)
* Implement APIs inside `app/api/[route]/route.ts`.
* Use the standard web `Request` and `NextResponse` objects.
* Export named functions corresponding to HTTP methods: `GET`, `POST`, `PUT`, `DELETE`, etc.
* **Example Structure:**
  ```typescript
  import { NextResponse } from 'next/server';

  export async function POST(request: Request) {
    try {
      const data = await request.json();
      return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (error) {
      return NextResponse.json({ error: 'Invalid Request' }, { status: 400 });
    }
  }
2. Authentication & Security Patterns
JWT & Middleware (Token-Based Auth)
HttpOnly Cookies: Always store JWTs in cookies with options: httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', and appropriate maxAge.

Middleware Verification: Use middleware.ts in the root for route protection. Inside Middleware (Edge Runtime), use the jose library via jwtVerify instead of jsonwebtoken, as standard Node.js crypto modules are not supported in Edge.

Session Expiry Handling: Explicitly catch expired token errors (ERR_JWT_EXPIRED in jose) in the middleware, clear the cookie (maxAge: 0), and redirect to the login page immediately.

Password Hashing
Always hash passwords using bcrypt (with a salt round of 10) during user registration.

Never expose raw or hashed passwords in client-side payloads or API responses.

3. Database Operations with Prisma
Database Client Instance
Never instantiate new PrismaClient() directly inside routes or components.

Always import the unified prisma instance from @/lib/prisma to prevent exhaustive pool connections caused by Next.js Hot Module Replacement (HMR).

Secure Data Access
Ensure that every Prisma query (findMany, create, update, delete) filters data by the authenticated user's ID (userId) to prevent multi-tenant data leaks.

4. UI & Styling (Tailwind CSS)
Use modern utility-first classes provided by Tailwind CSS.

Maintain accessible form layouts with clear aria attributes or standard HTML label associations.

Prioritize clean visual hierarchies for dashboards (e.g., sidebars, cards, grid systems).