import { useEffect, useState } from "react";
import { Loader2, LogOut, User2 } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useSupabaseAuthClient } from "@/lib/auth/hooks/useSupabaseAuthClient";
import { clearSessionCookies } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

interface AuthStatusProps {
  className?: string;
}

export function AuthStatus({ className }: AuthStatusProps) {
  const supabase = useSupabaseAuthClient();
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setEmail(user?.email ?? null);
      setIsLoading(false);
    };

    void fetchProfile();
  }, [supabase]);

  const handleLogout = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    clearSessionCookies();
    window.location.href = "/";
  };

  if (isLoading) {
    return (
      <div className={cn("inline-flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Ładowanie...
      </div>
    );
  }

  if (!email) {
    return null;
  }

  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <Avatar>
        <AvatarFallback>
          <User2 className="size-4" aria-hidden="true" />
        </AvatarFallback>
      </Avatar>
      <span className="text-sm text-muted-foreground hidden sm:inline">{email}</span>
      <Button variant="ghost" size="sm" onClick={handleLogout} data-test-id="auth-logout-button">
        <LogOut className="size-4" aria-hidden="true" />
        Wyloguj
      </Button>
    </div>
  );
}
