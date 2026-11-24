import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { API_URL } from "./config";
import { api, ApiError, setUnauthorizedHandler } from "./api";

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role: string;
  mustChangePassword?: boolean;
}

interface AuthState {
  status: "loading" | "signedIn" | "signedOut";
  user: SessionUser | null;
  refresh: () => Promise<SessionUser | null>;
  signInWithPassword: (email: string, password: string) => Promise<SessionUser>;
  sendOtp: (phone: string) => Promise<void>;
  signInWithOtp: (phone: string, otp: string) => Promise<SessionUser>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);
const ORIGIN = new URL(API_URL).origin;

async function csrfToken() {
  const { csrfToken } = await api.get<{ csrfToken: string }>("/api/auth/csrf");
  return csrfToken;
}

async function readSession(): Promise<SessionUser | null> {
  const session = await api.get<{ user?: SessionUser } | null>("/api/auth/session");
  const user = session?.user;
  return user && user.id ? user : null;
}

/** NextAuth v4 credentials sign-in, exactly as the website's signIn(..., {redirect:false}). */
async function credentialsSignIn(fields: Record<string, string>) {
  const token = await csrfToken();
  const response = await fetch(`${API_URL}/api/auth/callback/credentials`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Origin: ORIGIN,
    },
    body: new URLSearchParams({
      ...fields,
      csrfToken: token,
      callbackUrl: API_URL,
      json: "true",
    }).toString(),
  });
  let url = "";
  try {
    url = ((await response.json()) as { url?: string }).url || "";
  } catch {
    /* non-JSON body */
  }
  const error = url ? new URL(url).searchParams.get("error") : null;
  if (error) {
    throw new ApiError(
      error === "CredentialsSignin" ? "Incorrect email or password." : decodeURIComponent(error),
      401,
    );
  }
  if (!response.ok) throw new ApiError("Sign-in failed. Please try again.", response.status);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthState["status"]>("loading");
  const [user, setUser] = useState<SessionUser | null>(null);

  const apply = useCallback((next: SessionUser | null) => {
    setUser(next);
    setStatus(next ? "signedIn" : "signedOut");
    return next;
  }, []);

  const refresh = useCallback(async () => {
    try {
      return apply(await readSession());
    } catch (error) {
      // Offline at launch: keep the user out rather than show stale data.
      if ((error as ApiError).status === 0) setStatus((s) => (s === "loading" ? "signedOut" : s));
      return null;
    }
  }, [apply]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      refresh();
    });
    return () => setUnauthorizedHandler(null);
  }, [refresh]);

  const afterSignIn = useCallback(async () => {
    const next = await readSession();
    if (!next) throw new ApiError("Sign-in didn't complete. Please try again.", 401);
    queryClient.clear();
    return apply(next)!;
  }, [apply, queryClient]);

  const value = useMemo<AuthState>(
    () => ({
      status,
      user,
      refresh,
      async signInWithPassword(email, password) {
        await credentialsSignIn({ email: email.trim().toLowerCase(), password });
        return afterSignIn();
      },
      async sendOtp(phone) {
        await api.post("/api/auth/send-otp", { phone });
      },
      async signInWithOtp(phone, otp) {
        await credentialsSignIn({ phone, otp: otp.trim() });
        return afterSignIn();
      },
      async signOut() {
        try {
          const token = await csrfToken();
          await fetch(`${API_URL}/api/auth/signout`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/x-www-form-urlencoded", Origin: ORIGIN },
            body: new URLSearchParams({ csrfToken: token, json: "true", callbackUrl: API_URL }).toString(),
          });
        } catch {
          /* still clear locally */
        }
        queryClient.clear();
        apply(null);
      },
    }),
    [status, user, refresh, afterSignIn, apply, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
