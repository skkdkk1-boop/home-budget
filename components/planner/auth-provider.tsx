"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

import {
  getSupabaseBrowserClient,
  hasSupabaseBrowserConfig,
} from "@/lib/supabase-browser";

interface PlannerAuthContextValue {
  isReady: boolean;
  isConfigured: boolean;
  session: Session | null;
  user: User | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const PlannerAuthContext = createContext<PlannerAuthContextValue | null>(null);

export function PlannerAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const isConfigured = hasSupabaseBrowserConfig();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setIsReady(true);
      return;
    }

    let isMounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return;
      }

      setSession(data.session ?? null);
      setIsReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) {
        return;
      }

      setSession(nextSession);
      setIsReady(true);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<PlannerAuthContextValue>(
    () => ({
      isReady,
      isConfigured,
      session,
      user: session?.user ?? null,
      async signInWithGoogle() {
        const supabase = getSupabaseBrowserClient();

        if (!supabase) {
          throw new Error("Supabase 인증 설정이 아직 연결되지 않았어요.");
        }

        const redirectTo =
          typeof window === "undefined"
            ? undefined
            : window.location.href.split("#")[0] ?? window.location.origin;

        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo,
          },
        });

        if (error) {
          throw error;
        }
      },
      async signOut() {
        const supabase = getSupabaseBrowserClient();

        if (!supabase) {
          return;
        }

        const { error } = await supabase.auth.signOut();

        if (error) {
          throw error;
        }
      },
    }),
    [isConfigured, isReady, session],
  );

  return (
    <PlannerAuthContext.Provider value={value}>
      {children}
    </PlannerAuthContext.Provider>
  );
}

export function usePlannerAuth() {
  const context = useContext(PlannerAuthContext);

  if (!context) {
    throw new Error("usePlannerAuth must be used within a PlannerAuthProvider");
  }

  return context;
}
