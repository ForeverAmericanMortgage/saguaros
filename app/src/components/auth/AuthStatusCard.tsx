"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase";

const ALLOWED_DOMAIN = "saguaros.com";
const DEFAULT_DEV_ROLE = "admin";

function getEmail(session: Session | null): string {
  return session?.user?.email ?? "";
}

export default function AuthStatusCard() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    const syncRoleCookie = (active: boolean) => {
      if (active) {
        const role = process.env.NODE_ENV === "production" ? "member" : DEFAULT_DEV_ROLE;
        document.cookie = `saguaros_role=${role}; Path=/; Max-Age=604800; SameSite=Lax`;
      } else {
        document.cookie = "saguaros_role=; Path=/; Max-Age=0; SameSite=Lax";
      }
    };

    const enforceDomain = async (nextSession: Session | null) => {
      const email = getEmail(nextSession);
      if (email && !email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`)) {
        setError(`Only @${ALLOWED_DOMAIN} accounts are allowed.`);
        await supabase.auth.signOut();
        syncRoleCookie(false);
        setSession(null);
        return;
      }

      syncRoleCookie(Boolean(nextSession));
      setSession(nextSession);
      setError("");
    };

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      await enforceDomain(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!mounted) return;
      await enforceDomain(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  const email = getEmail(session);

  const signIn = async () => {
    setError("");
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        queryParams: { hd: ALLOWED_DOMAIN },
      },
    });

    if (signInError) {
      setError(signInError.message);
    }
  };

  const signOut = async () => {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
      return;
    }
    document.cookie = "saguaros_role=; Path=/; Max-Age=0; SameSite=Lax";
    setSession(null);
  };

  return (
    <section className="bg-warm-white border border-sand rounded-lg p-5 mb-10">
      <p className="font-display font-bold text-lg mb-2">Authentication</p>

      {loading ? (
        <p className="text-sm text-forest/60">Checking session...</p>
      ) : email ? (
        <div className="space-y-3">
          <p className="text-sm text-forest/70">
            Signed in as <span className="font-semibold text-forest">{email}</span>
          </p>
          <button
            onClick={signOut}
            className="px-4 py-2 border border-forest/25 text-forest font-display font-bold text-sm"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-forest/70">
            Sign in with Google Workspace to access protected Hub routes.
          </p>
          <button
            onClick={signIn}
            className="px-4 py-2 bg-forest text-warm-white font-display font-bold text-sm"
          >
            Sign In with Google
          </button>
        </div>
      )}

      {error && <p className="text-sm text-terracotta mt-3">{error}</p>}
    </section>
  );
}
