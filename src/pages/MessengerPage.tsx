import { useState, useEffect, useRef, useCallback } from "react";
import { User } from "@/App";
import Icon from "@/components/ui/icon";

interface Props {
  user: User;
  onLogout: () => void;
}

interface Message {
  id: string;
  from_user_id: string;
  to_user_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface ChatPreview {
  user_id: string;
  username: string;
  display_name: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

interface SearchedUser {
  id: string;
  username: string;
  display_name: string;
}

type Tab = "chats" | "profile";

export default function MessengerPage({ user, onLogout }: Props) {
  const [tab, setTab] = useState<Tab>("chats");
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [activeChat, setActiveChat] = useState<ChatPreview | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const URLS = {
    chats: "https://functions.poehali.dev/9587c1a3-4f34-44c4-b0b2-e117e85b5b5f",
    messages: "https://functions.poehali.dev/c61509cd-005c-491a-9b46-91f988a86a7e",
    search: "https://functions.poehali.dev/a0136ac9-96be-4dfe-9113-3d1628218ce0",
  };

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${user.token}`,
  };

  const fetchChats = useCallback(async () => {
    try {
      const res = await fetch(URLS.chats, { headers });
      if (res.ok) {
        const data = await res.json();
        setChats(data.chats || []);
        const unread = (data.chats || []).reduce((acc: number, c: ChatPreview) => acc + (c.unread_count || 0), 0);
        setTotalUnread(unread);
      }
    } catch { /* silent */ }
  }, []);

  const fetchMessages = useCallback(async (otherUserId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`${URLS.messages}?other_user_id=${otherUserId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    fetchChats();
    pollRef.current = setInterval(() => {
      fetchChats();
      if (activeChat) fetchMessages(activeChat.user_id);
    }, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openChat = async (chatUser: SearchedUser | ChatPreview) => {
    const preview: ChatPreview = {
      user_id: chatUser.user_id || (chatUser as SearchedUser).id,
      username: chatUser.username,
      display_name: chatUser.display_name,
      last_message: (chatUser as ChatPreview).last_message || "",
      last_message_at: (chatUser as ChatPreview).last_message_at || "",
      unread_count: 0,
    };
    setActiveChat(preview);
    setSearchQuery("");
    setSearchResults([]);
    await fetchMessages(preview.user_id);
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !activeChat) return;
    const text = messageText.trim();
    setMessageText("");

    const tempMsg: Message = {
      id: `temp_${Date.now()}`,
      from_user_id: user.id,
      to_user_id: activeChat.user_id,
      content: text,
      created_at: new Date().toISOString(),
      is_read: false,
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch(URLS.messages, {
        method: "POST",
        headers,
        body: JSON.stringify({ to_user_id: activeChat.user_id, content: text }),
      });
      if (res.ok) {
        await fetchMessages(activeChat.user_id);
        await fetchChats();
        addNotification(`Сообщение отправлено @${activeChat.username}`);
      }
    } catch { /* silent */ }
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q.trim()) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${URLS.search}?q=${encodeURIComponent(q)}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setSearchResults((data.users || []).filter((u: SearchedUser) => u.id !== user.id));
        }
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const addNotification = (msg: string) => {
    const id = Date.now().toString();
    setNotifications((prev) => [...prev, msg]);
    setTimeout(() => setNotifications((prev) => prev.filter((_, i) => i !== 0)), 3000);
  };

  const formatTime = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Сегодня";
    return d.toLocaleDateString("ru", { day: "numeric", month: "short" });
  };

  const getAvatar = (name: string) =>
    name ? name.charAt(0).toUpperCase() : "?";

  const avatarColors = [
    "bg-violet-500", "bg-blue-500", "bg-emerald-500",
    "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-indigo-500",
  ];
  const getAvatarColor = (str: string) =>
    avatarColors[(str.charCodeAt(0) || 0) % avatarColors.length];

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {notifications.map((n, i) => (
          <div
            key={i}
            className="bg-foreground text-background text-sm px-4 py-3 rounded-xl shadow-lg animate-slide-in-right"
          >
            🔔 {n}
          </div>
        ))}
      </div>

      {/* Left sidebar */}
      <div className={`flex flex-col border-r border-border bg-background w-full lg:w-80 xl:w-96 flex-shrink-0 ${activeChat ? "hidden lg:flex" : "flex"}`}>
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-white text-sm font-bold">С</span>
            </div>
            <span className="font-bold text-base">Семицвет</span>
          </div>
          {totalUnread > 0 && (
            <div className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full notification-dot">
              {totalUnread}
            </div>
          )}
        </div>

        {/* Tab nav */}
        <div className="px-5 pt-4 flex gap-1">
          {([["chats", "Чаты", "MessageSquare"], ["profile", "Профиль", "User"]] as const).map(([t, label, icon]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Icon name={icon} size={15} />
              {label}
            </button>
          ))}
        </div>

        {tab === "chats" && (
          <>
            {/* Search */}
            <div className="px-5 pt-3 pb-2">
              <div className="relative">
                <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Найти по юзернейму..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-secondary border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            {/* Search results */}
            {searchQuery && (
              <div className="px-5 pb-2">
                {searching && (
                  <p className="text-xs text-muted-foreground px-1 py-2">Ищем...</p>
                )}
                {!searching && searchResults.length === 0 && searchQuery.length >= 2 && (
                  <p className="text-xs text-muted-foreground px-1 py-2">Никого не нашли</p>
                )}
                {searchResults.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => openChat(u)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary transition-colors text-left"
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 ${getAvatarColor(u.username)}`}>
                      {getAvatar(u.display_name)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{u.display_name}</p>
                      <p className="text-xs text-muted-foreground">@{u.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Chats list */}
            {!searchQuery && (
              <div className="flex-1 overflow-y-auto px-3 py-2">
                {chats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                    <div className="text-3xl mb-3">💬</div>
                    <p className="text-sm text-muted-foreground">Нет чатов. Найдите кого-нибудь по юзернейму</p>
                  </div>
                ) : (
                  chats.map((chat) => (
                    <button
                      key={chat.user_id}
                      onClick={() => openChat(chat)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-left mb-0.5 ${
                        activeChat?.user_id === chat.user_id
                          ? "bg-primary/10"
                          : "hover:bg-secondary"
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${getAvatarColor(chat.username)}`}>
                        {getAvatar(chat.display_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-sm font-semibold truncate">{chat.display_name}</p>
                          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                            {formatDate(chat.last_message_at)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground truncate">{chat.last_message || "Нет сообщений"}</p>
                          {chat.unread_count > 0 && (
                            <span className="ml-2 bg-primary text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                              {chat.unread_count > 9 ? "9+" : chat.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </>
        )}

        {tab === "profile" && (
          <div className="flex-1 p-6 animate-fade-in">
            <div className="flex flex-col items-center text-center mb-8">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-4 ${getAvatarColor(user.username)}`}>
                {getAvatar(user.displayName)}
              </div>
              <h3 className="text-xl font-bold">{user.displayName}</h3>
              <p className="text-muted-foreground text-sm mt-1">@{user.username}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 bg-secondary rounded-xl">
                <Icon name="User" size={18} className="text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Имя</p>
                  <p className="text-sm font-medium">{user.displayName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-secondary rounded-xl">
                <Icon name="AtSign" size={18} className="text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Юзернейм</p>
                  <p className="text-sm font-medium">@{user.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-secondary rounded-xl">
                <Icon name="MessageSquare" size={18} className="text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Чатов</p>
                  <p className="text-sm font-medium">{chats.length}</p>
                </div>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="w-full mt-8 py-3 rounded-xl border border-destructive/40 text-destructive text-sm font-medium hover:bg-destructive/5 transition-colors flex items-center justify-center gap-2"
            >
              <Icon name="LogOut" size={16} />
              Выйти из аккаунта
            </button>
          </div>
        )}
      </div>

      {/* Chat area */}
      <div className={`flex-1 flex flex-col ${!activeChat ? "hidden lg:flex" : "flex"}`}>
        {!activeChat ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="text-5xl mb-4">💬</div>
            <h3 className="text-xl font-bold mb-2">Выберите чат</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              Откройте диалог слева или найдите нового собеседника по юзернейму
            </p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-5 py-4 border-b border-border flex items-center gap-3 bg-background">
              <button
                onClick={() => setActiveChat(null)}
                className="lg:hidden p-2 rounded-lg hover:bg-secondary transition-colors -ml-1"
              >
                <Icon name="ArrowLeft" size={18} />
              </button>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${getAvatarColor(activeChat.username)}`}>
                {getAvatar(activeChat.display_name)}
              </div>
              <div>
                <p className="font-semibold text-sm">{activeChat.display_name}</p>
                <p className="text-xs text-muted-foreground">@{activeChat.username}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2">
              {loadingMessages && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">Загрузка...</p>
                </div>
              )}
              {!loadingMessages && messages.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="text-4xl mb-3">👋</div>
                  <p className="text-sm text-muted-foreground">Напишите первое сообщение!</p>
                </div>
              )}

              {messages.map((msg, i) => {
                const isMine = msg.from_user_id === user.id;
                const prevMsg = messages[i - 1];
                const showDate =
                  !prevMsg ||
                  new Date(msg.created_at).toDateString() !==
                    new Date(prevMsg.created_at).toDateString();

                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="text-center my-3">
                        <span className="text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                          {formatDate(msg.created_at)}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${isMine ? "justify-end" : "justify-start"} chat-bubble-in`}>
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isMine
                            ? "bg-primary text-white rounded-br-sm"
                            : "bg-secondary text-foreground rounded-bl-sm"
                        }`}
                      >
                        <p>{msg.content}</p>
                        <p className={`text-xs mt-1 ${isMine ? "text-white/60" : "text-muted-foreground"}`}>
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-4 border-t border-border bg-background">
              <div className="flex items-end gap-3 bg-secondary rounded-2xl px-4 py-2">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Написать сообщение..."
                  rows={1}
                  className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none resize-none py-1.5 max-h-32"
                  style={{ minHeight: "36px" }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!messageText.trim()}
                  className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 mb-0.5"
                >
                  <Icon name="Send" size={16} />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 px-1">Enter — отправить, Shift+Enter — новая строка</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}