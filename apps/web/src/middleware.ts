export { auth as middleware } from "./auth";

export const config = {
  matcher: ["/watches/:path*", "/webhooks/:path*", "/api/watches/:path*", "/api/webhooks/:path*"],
};
