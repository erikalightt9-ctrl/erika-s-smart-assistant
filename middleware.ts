import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/features/:path*",
    "/timekeeping/:path*",
    "/billing/:path*",
    "/documents/:path*",
    "/contributions/:path*",
    "/admin/:path*",
    "/settings/:path*",
    "/users/:path*",
    "/knowledge/:path*",
    "/departments/:path*",
    "/assistant/:path*",
    "/document-assistant/:path*",
    "/sign/:path*",
  ],
};
