import type { Session } from "@supabase/supabase-js";

const ACCESS_TOKEN_COOKIE = "sb-access-token";
const REFRESH_TOKEN_COOKIE = "sb-refresh-token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 1 week

export function persistSessionTokens(session: Session) {
  if (typeof document === "undefined") {
    return;
  }

  const accessToken = session.access_token;
  const refreshToken = session.refresh_token;

  if (!accessToken || !refreshToken) {
    return;
  }

  document.cookie = `${ACCESS_TOKEN_COOKIE}=${accessToken}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax; Secure`;
  document.cookie = `${REFRESH_TOKEN_COOKIE}=${refreshToken}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax; Secure`;
}

export function clearSessionCookies() {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${ACCESS_TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
  document.cookie = `${REFRESH_TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
}
