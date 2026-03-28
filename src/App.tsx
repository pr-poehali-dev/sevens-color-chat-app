import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import AuthPage from "@/pages/AuthPage";
import MessengerPage from "@/pages/MessengerPage";

export interface User {
  id: string;
  username: string;
  displayName: string;
  token: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("semitsvet_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) { console.error(e); }
    }
    setLoading(false);
  }, []);

  const handleLogin = (u: User) => {
    localStorage.setItem("semitsvet_user", JSON.stringify(u));
    setUser(u);
  };

  const handleLogout = () => {
    localStorage.removeItem("semitsvet_user");
    setUser(null);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center">
            <span className="text-white text-lg font-bold">С</span>
          </div>
          <span className="text-muted-foreground text-sm">Загрузка...</span>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {!user ? (
        <AuthPage onLogin={handleLogin} />
      ) : (
        <MessengerPage user={user} onLogout={handleLogout} />
      )}
    </TooltipProvider>
  );
}