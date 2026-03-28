import { useState } from "react";
import { User } from "@/App";

interface Props {
  onLogin: (user: User) => void;
}

export default function AuthPage({ onLogin }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Заполните все поля");
      return;
    }
    if (username.length < 3) {
      setError("Юзернейм должен быть не короче 3 символов");
      return;
    }
    if (password.length < 4) {
      setError("Пароль должен быть не короче 4 символов");
      return;
    }
    if (mode === "register" && !displayName.trim()) {
      setError("Введите ваше имя");
      return;
    }

    setLoading(true);

    try {
      const BASE = "https://functions.poehali.dev/9687e8e3-2c58-4274-9d6c-b902c118c42c";
      const endpoint = mode === "login" ? `${BASE}/login` : `${BASE}/register`;
      const body: Record<string, string> = { username: username.toLowerCase(), password };
      if (mode === "register") body.display_name = displayName;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Что-то пошло не так");
        return;
      }

      onLogin({
        id: data.user.id,
        username: data.user.username,
        displayName: data.user.display_name,
        token: data.token,
      });
    } catch {
      setError("Ошибка соединения. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex bg-background">
      <div className="hidden lg:flex lg:w-1/2 bg-primary/5 items-center justify-center p-16 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full bg-primary/5 blur-2xl" />
        <div className="relative z-10 text-center animate-fade-in">
          <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center mx-auto mb-8 shadow-lg shadow-primary/20">
            <span className="text-white text-3xl font-bold">С</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight mb-3">Семицвет Chat</h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-xs mx-auto">
            Простое и красивое общение — именно тогда, когда нужно
          </p>
          <div className="mt-12 flex flex-col gap-3 text-left max-w-xs mx-auto">
            {[
              { icon: "💬", text: "Личные переписки по юзернейму" },
              { icon: "🔔", text: "Уведомления о новых сообщениях" },
              { icon: "👤", text: "Удобный профиль" },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 animate-fade-in"
                style={{ animationDelay: `${i * 0.1 + 0.3}s`, opacity: 0 }}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-muted-foreground text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-sm animate-scale-in">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center">
              <span className="text-white font-bold">С</span>
            </div>
            <span className="font-bold text-xl">Семицвет Chat</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1">
            {mode === "login" ? "Добро пожаловать" : "Создать аккаунт"}
          </h2>
          <p className="text-muted-foreground text-sm mb-8">
            {mode === "login"
              ? "Войдите в свой аккаунт"
              : "Займёт меньше минуты"}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === "register" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Имя</label>
                <input
                  type="text"
                  placeholder="Как вас зовут?"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
                  autoFocus
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Юзернейм</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                <input
                  type="text"
                  placeholder="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/\s/g, "").toLowerCase())}
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
                  autoFocus={mode === "login"}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Пароль</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
              />
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/8 px-4 py-3 rounded-xl animate-fade-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-1 shadow-md shadow-primary/20"
            >
              {loading ? "Подождите..." : mode === "login" ? "Войти" : "Зарегистрироваться"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-muted-foreground text-sm">
              {mode === "login" ? "Нет аккаунта? " : "Уже есть аккаунт? "}
            </span>
            <button
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              className="text-primary font-medium text-sm hover:underline"
            >
              {mode === "login" ? "Зарегистрироваться" : "Войти"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}