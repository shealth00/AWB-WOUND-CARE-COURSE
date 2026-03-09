const MEMBER_TOKEN_KEY = "awb-member-token";

export function getMemberToken(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem(MEMBER_TOKEN_KEY) ?? "";
}

export function setMemberToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }
  if (token) {
    window.localStorage.setItem(MEMBER_TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(MEMBER_TOKEN_KEY);
  }
}

export function clearMemberToken(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(MEMBER_TOKEN_KEY);
}

export function isMemberAuthenticated(): boolean {
  return Boolean(getMemberToken());
}
