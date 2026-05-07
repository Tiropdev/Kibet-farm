import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({ user: null, session: null, loading: true, signOut: async () => {} });

// Shared single-user farm account. Auth UI is hidden; the app auto-signs-in.
const FARM_EMAIL = "farm@kapsabet-highlands.local";
const FARM_PASSWORD = "kapsabet-highlands-farm-shared-2026";

async function ensureFarmSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return session;
  const signIn = await supabase.auth.signInWithPassword({ email: FARM_EMAIL, password: FARM_PASSWORD });
  if (signIn.data.session) return signIn.data.session;
  // First run: create the shared account
  await supabase.auth.signUp({
    email: FARM_EMAIL,
    password: FARM_PASSWORD,
    options: { data: { full_name: "Kibet Farm Yard" } },
  });
  const retry = await supabase.auth.signInWithPassword({ email: FARM_EMAIL, password: FARM_PASSWORD });
  return retry.data.session;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    ensureFarmSession()
      .then((s) => {
        setSession(s ?? null);
        setUser(s?.user ?? null);
      })
      .finally(() => setLoading(false));
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    // No-op in single-user mode; immediately re-authenticate.
    await supabase.auth.signOut();
    const s = await ensureFarmSession();
    setSession(s ?? null);
    setUser(s?.user ?? null);
  };

  return <Ctx.Provider value={{ user, session, loading, signOut }}>{children}</Ctx.Provider>;
};

export const useAuth = () => useContext(Ctx);