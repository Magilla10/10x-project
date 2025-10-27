export function extractRecoveryTokenFromHash(hash: string | null | undefined): string | undefined {
  if (!hash) {
    return undefined;
  }

  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const token = params.get("access_token") ?? params.get("token") ?? params.get("code") ?? params.get("recovery_token");
  return token ?? undefined;
}

export function isPasswordRecoveryUrl(url: URL) {
  if (url.searchParams.get("type") === "recovery") {
    return true;
  }

  if (url.hash.includes("type=recovery")) {
    return true;
  }

  return false;
}
