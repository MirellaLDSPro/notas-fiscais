import { auth } from "@/auth";

export default auth((req) => {
  if (req.nextUrl.pathname === "/") return;
  if (!req.auth) {
    const url = new URL("/login", req.url);
    url.searchParams.set("from", req.nextUrl.pathname);
    return Response.redirect(url);
  }
});

export const config = {
  matcher: [
    "/((?!api/auth|login|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico)$).*)",
  ],
};
