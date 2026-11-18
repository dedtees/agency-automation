// Protects /admin with HTTP Basic auth (user "admin", password ADMIN_PASSWORD).
// Placeholder until real login is chosen. With no password set, admin is open
// in development and locked in production.
import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) {
    return process.env.NODE_ENV === "production" ? new NextResponse("Admin disabled: set ADMIN_PASSWORD", { status: 503 }) : NextResponse.next();
  }
  const h = req.headers.get("authorization") ?? "";
  const [scheme, enc] = h.split(" ");
  if (scheme === "Basic" && enc) {
    const [user, pass] = atob(enc).split(":");
    if (user === "admin" && pass === pw) return NextResponse.next();
  }
  return new NextResponse("Authentication required", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="admin"' } });
}

export const config = { matcher: ["/admin/:path*"] };
