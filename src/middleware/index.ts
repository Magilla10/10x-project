import { defineMiddleware } from "astro:middleware";

import { createSupabaseClient } from "../db/supabase.client";

export const onRequest = defineMiddleware(async (context, next) => {
  // Guard middleware initialization so errors during Supabase client
  // creation don't crash the entire middleware loader.
  let supabase;
  try {
    supabase = createSupabaseClient();
  } catch (err) {
    // Log and continue without Supabase; the route can still render.
    console.warn("Unable to initialize Supabase in middleware:", err);
    return next();
  }

  context.locals.supabase = supabase;

  const accessToken = context.cookies.get("sb-access-token")?.value;
  const refreshToken = context.cookies.get("sb-refresh-token")?.value;

  // Development-only debug logs to help inspect cookie presence during local dev.
  if (import.meta.env.MODE === "development") {
    try {
      console.debug("[middleware] sb-access-token present:", Boolean(accessToken));
      console.debug("[middleware] sb-refresh-token present:", Boolean(refreshToken));
    } catch {
      // swallow logging errors
    }
  }

  if (accessToken && refreshToken) {
    try {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        console.warn("Failed to restore Supabase session from cookies", error);
      } else if (data?.user) {
        context.locals.user = data.user;
      }
    } catch (err) {
      console.warn("Error while restoring Supabase session:", err);
    }
  }

  // Protected routes: require authentication
  const protectedRoutes = ["/generate"];
  const isProtectedRoute = protectedRoutes.some((route) => context.url.pathname.startsWith(route));

  if (isProtectedRoute && !context.locals.user) {
    return context.redirect("/login");
  }

  return next();
});
