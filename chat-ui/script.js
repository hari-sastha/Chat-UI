/*
  Frontend-only chat UI
  - Renders chat list from mock JSON
  - Switches active chat
  - Sends messages (Enter), newline (Shift+Enter)
  - Auto-expands textarea
  - Dark/light theme toggle
  - Simulates incoming messages + typing indicator
*/

const state = {
  theme: "light",
  activeChatId: null,
  isMobile: window.matchMedia("(max-width: 899px)").matches,
  chats: [],
  timers: {
    typing: null,
    incoming: null,
  },
};

const $ = (sel) => document.querySelector(sel);

const el = {
  app: $("#app"),
  sidebar: $("#sidebar"),
  panel: $("#panel"),
  chatList: $("#chatList"),
  chatSearch: $("#chatSearch"),

  meAvatar: $("#meAvatar"),
  meStatus: $("#meStatus"),

  themeToggle: $("#themeToggle"),
  backToList: $("#backToList"),

  activeAvatar: $("#activeAvatar"),
  activeName: $("#activeName"),
  activePresence: $("#activePresence"),
  activeStatusText: $("#activeStatusText"),

  messages: $("#messages"),
  messagesInner: $("#messagesInner"),
  typingIndicator: $("#typingIndicator"),
  typingText: $("#typingText"),

  messageInput: $("#messageInput"),
  sendBtn: $("#sendBtn"),
};

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatTime(date) {
  const d = new Date(date);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function nowISO() {
  return new Date().toISOString();
}

function safeText(s) {
  return String(s ?? "");
}

function scrollMessagesToBottom({ smooth = true } = {}) {
  const target = el.messages;
  if (!target) return;

  target.scrollTo({
    top: target.scrollHeight,
    behavior: smooth ? "smooth" : "auto",
  });
}

function setTheme(theme) {
  state.theme = theme;
  el.app.dataset.theme = theme;

  // Update toggle icon
  const icon = el.themeToggle.querySelector(".icon");
  icon.textContent = theme === "dark" ? "☀" : "☾";

  try {
    localStorage.setItem("chatui:theme", theme);
  } catch {
    // ignore
  }
}

function hydrateTheme() {
  let theme = "light";
  try {
    theme = localStorage.getItem("chatui:theme") || "light";
  } catch {
    // ignore
  }

  setTheme(theme === "dark" ? "dark" : "light");
}

function setMobileView(view) {
  // view: "list" | "chat"
  el.app.dataset.view = view;
}

function getActiveChat() {
  return state.chats.find((c) => c.id === state.activeChatId) || null;
}

function buildMockData() {
  // Mock avatars live under assets/avatars
  const avatars = {
    me: "assets/avatars/me.svg",
    a: "assets/avatars/a.svg",
    b: "assets/avatars/b.svg",
    c: "assets/avatars/c.svg",
    d: "assets/avatars/d.svg",
  };

  const base = Date.now();

  return {
    me: {
      id: "me",
      name: "You",
      avatar: avatars.me,
    },
    chats: [
      {
        id: "chat_1",
        user: {
          name: "Maya",
          avatar: avatars.a,
          online: true,
        },
        unread: 2,
        messages: [
          {
            id: "m1",
            from: "them",
            text: "Did you see the latest designs?",
            at: new Date(base - 1000 * 60 * 42).toISOString(),
            status: "seen",
          },
          {
            id: "m2",
            from: "me",
            text: "Yep—super clean. I like the spacing and the subtle gradients.",
            at: new Date(base - 1000 * 60 * 40).toISOString(),
            status: "seen",
          },
          {
            id: "m3",
            from: "them",
            text: "Nice. Can you ship the UI today?",
            at: new Date(base - 1000 * 60 * 35).toISOString(),
            status: "delivered",
          },
        ],
      },
      {
        id: "chat_2",
        user: {
          name: "Arjun",
          avatar: avatars.b,
          online: false,
        },
        unread: 0,
        messages: [
          {
            id: "m1",
            from: "them",
            text: "Quick sync at 3?",
            at: new Date(base - 1000 * 60 * 120).toISOString(),
            status: "delivered",
          },
          {
            id: "m2",
            from: "me",
            text: "Works for me.",
            at: new Date(base - 1000 * 60 * 118).toISOString(),
            status: "delivered",
          },
        ],
      },
      {
        id: "chat_3",
        user: {
          name: "Priya",
          avatar: avatars.c,
          online: true,
        },
        unread: 5,
        messages: [
          {
            id: "m1",
            from: "them",
            text: "I’m testing the mobile layout now.",
            at: new Date(base - 1000 * 60 * 15).toISOString(),
            status: "delivered",
          },
          {
            id: "m2",
            from: "them",
            text: "Sidebar collapse feels great 👍",
            at: new Date(base - 1000 * 60 * 14).toISOString(),
            status: "delivered",
          },
        ],
      },
      {
        id: "chat_4",
        user: {
          name: "Diego",
          avatar: avatars.d,
          online: false,
        },
        unread: 0,
        messages: [
          {
            id: "m1",
            from: "me",
            text: "Sent you the spec. Let me know if anything’s unclear.",
            at: new Date(base - 1000 * 60 * 300).toISOString(),
            status: "seen",
          },
        ],
      },
    ],
  };
}

function chatLastMessage(chat) {
  const last = chat.messages[chat.messages.length - 1];
  return last || null;
}

function renderChatList(filter = "") {
  const q = filter.trim().toLowerCase();

  const html = state.chats
    .filter((chat) => {
      if (!q) return true;
      const name = chat.user.name.toLowerCase();
      const last = chatLastMessage(chat);
      const preview = last ? last.text.toLowerCase() : "";
      return name.includes(q) || preview.includes(q);
    })
    .map((chat) => {
      const last = chatLastMessage(chat);
      const isActive = chat.id === state.activeChatId;
      const time = last ? formatTime(last.at) : "";
      const preview = last ? safeText(last.text) : "No messages yet";
      const unread = chat.unread || 0;

      return `
        <div class="chatItem ${isActive ? "is-active" : ""}" role="listitem" data-chat-id="${chat.id}" tabindex="0">
          <img class="avatar" src="${chat.user.avatar}" alt="${chat.user.name}" />
          <div class="chatItem__meta">
            <div class="chatItem__top">
              <div class="chatItem__name">${chat.user.name}</div>
              <div class="chatItem__time">${time}</div>
            </div>
            <div class="chatItem__bottom">
              <div class="chatItem__preview">${preview}</div>
              ${unread > 0 ? `<div class="badge" aria-label="${unread} unread">${unread}</div>` : ""}
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  el.chatList.innerHTML = html || `<div style="padding:12px;color:var(--muted);">No chats found</div>`;
}

function messageTicks(status) {
  if (status === "seen") {
    return `<span class="ticks is-seen" aria-label="Seen">✓✓</span>`;
  }
  if (status === "delivered") {
    return `<span class="ticks is-delivered" aria-label="Delivered">✓✓</span>`;
  }
  return `<span class="ticks" aria-label="Sent">✓</span>`;
}

function renderMessages(chat) {
  if (!chat) {
    el.messagesInner.innerHTML = "";
    return;
  }

  const html = chat.messages
    .map((m) => {
      const isMe = m.from === "me";
      const time = formatTime(m.at);

      return `
        <div class="msgRow ${isMe ? "is-me" : ""}">
          <div class="bubble" role="article" aria-label="Message">
            <div class="bubble__text">${escapeHtml(safeText(m.text))}</div>
            <div class="bubble__meta">
              <span>${time}</span>
              ${isMe ? messageTicks(m.status) : ""}
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  el.messagesInner.innerHTML = html;
  scrollMessagesToBottom({ smooth: false });
}

function escapeHtml(text) {
  // Prevent accidental HTML injection from mock data / input
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function setActiveChat(chatId, { focusComposer = false } = {}) {
  const chat = state.chats.find((c) => c.id === chatId);
  if (!chat) return;

  state.activeChatId = chatId;

  // Clear unread count on open
  chat.unread = 0;

  // Header
  el.activeAvatar.src = chat.user.avatar;
  el.activeName.textContent = chat.user.name;
  el.activePresence.classList.toggle("is-online", !!chat.user.online);
  el.activeStatusText.textContent = chat.user.online ? "Online" : "Offline";

  renderChatList(el.chatSearch.value);
  renderMessages(chat);

  if (state.isMobile) setMobileView("chat");
  if (focusComposer) el.messageInput.focus();

  scheduleIncomingSimulation();
}

function autoExpandTextarea(textarea) {
  textarea.style.height = "auto";
  const next = Math.min(textarea.scrollHeight, 140);
  textarea.style.height = `${next}px`;
}

function sendMessage() {
  const chat = getActiveChat();
  if (!chat) return;

  const raw = el.messageInput.value;
  const text = raw.replace(/\s+$/g, "");
  if (!text) return;

  const msg = {
    id: `me_${Math.random().toString(16).slice(2)}`,
    from: "me",
    text,
    at: nowISO(),
    status: "delivered",
  };

  chat.messages.push(msg);
  el.messageInput.value = "";
  autoExpandTextarea(el.messageInput);

  renderChatList(el.chatSearch.value);
  renderMessages(chat);
  scrollMessagesToBottom({ smooth: true });

  // UI-only: upgrade ticks to seen shortly after sending
  window.setTimeout(() => {
    msg.status = "seen";
    renderMessages(chat);
  }, 900);

  scheduleIncomingSimulation();
}

function showTyping(name) {
  el.typingText.textContent = `${name} is typing…`;
  el.typingIndicator.hidden = false;
  scrollMessagesToBottom({ smooth: true });
}

function hideTyping() {
  el.typingIndicator.hidden = true;
}

function clearTimers() {
  if (state.timers.typing) window.clearTimeout(state.timers.typing);
  if (state.timers.incoming) window.clearTimeout(state.timers.incoming);
  state.timers.typing = null;
  state.timers.incoming = null;
}

function scheduleIncomingSimulation() {
  clearTimers();

  const chat = getActiveChat();
  if (!chat) return;

  // Simulate response only if last message is from me
  const last = chatLastMessage(chat);
  if (!last || last.from !== "me") return;

  // Typing indicator
  state.timers.typing = window.setTimeout(() => {
    showTyping(chat.user.name);
  }, 550);

  // Incoming message
  state.timers.incoming = window.setTimeout(() => {
    hideTyping();

    const replies = [
      "Nice — that works.",
      "Cool, thanks!",
      "Got it. I’ll take a look.",
      "Perfect. Let’s ship it.",
      "Sounds good 👍",
    ];

    const incoming = {
      id: `them_${Math.random().toString(16).slice(2)}`,
      from: "them",
      text: replies[Math.floor(Math.random() * replies.length)],
      at: nowISO(),
      status: "delivered",
    };

    chat.messages.push(incoming);
    renderChatList(el.chatSearch.value);
    renderMessages(chat);
    scrollMessagesToBottom({ smooth: true });
  }, 1600);
}

function bindEvents() {
  el.themeToggle.addEventListener("click", () => {
    setTheme(state.theme === "dark" ? "light" : "dark");
  });

  el.backToList.addEventListener("click", () => {
    setMobileView("list");
  });

  el.chatSearch.addEventListener("input", (e) => {
    renderChatList(e.target.value);
  });

  el.chatList.addEventListener("click", (e) => {
    const item = e.target.closest("[data-chat-id]");
    if (!item) return;
    setActiveChat(item.dataset.chatId, { focusComposer: false });
  });

  el.chatList.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const item = e.target.closest("[data-chat-id]");
    if (!item) return;
    setActiveChat(item.dataset.chatId, { focusComposer: false });
  });

  el.messageInput.addEventListener("input", () => {
    autoExpandTextarea(el.messageInput);
  });

  el.messageInput.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;

    // Shift+Enter => newline
    if (e.shiftKey) return;

    // Enter => send
    e.preventDefault();
    sendMessage();
  });

  el.sendBtn.addEventListener("click", () => sendMessage());

  // Keep state.isMobile in sync
  const mq = window.matchMedia("(max-width: 899px)");
  mq.addEventListener("change", (ev) => {
    state.isMobile = ev.matches;
    if (state.isMobile) {
      // Default to list on mobile
      setMobileView("list");
    } else {
      // Both panes visible on desktop
      delete el.app.dataset.view;
    }
  });
}

function init() {
  hydrateTheme();

  const mock = buildMockData();
  state.chats = mock.chats;

  // Me avatar
  el.meAvatar.src = mock.me.avatar;

  // Mobile initial view
  if (state.isMobile) setMobileView("list");

  renderChatList();

  // Default active chat
  setActiveChat(state.chats[0].id);

  // On mobile, opening default chat should show list first; user taps a chat to open.
  if (state.isMobile) setMobileView("list");

  bindEvents();

  // Initial textarea sizing
  autoExpandTextarea(el.messageInput);
}

init();
