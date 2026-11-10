const API_URL = "http://127.0.0.1:8001/api/v1";

const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";
const FLASH_KEY = "flash";

const DIFFICULTY = {
  easy: "script kiddie",
  medium: "h4x0r",
  hard: "1337 elite",
};

const STATUS = {
  draft: "чернетка (тссс)",
  review: "на перевірці в Ради",
  active: "у дикій природі",
  rejected: "забанено Радою",
};

/* ---------- console ---------- */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function print(text, kind = "") {
  const log = document.getElementById("log");
  if (!log) return;
  const line = document.createElement("span");
  if (kind) line.className = kind;
  line.textContent = `> ${text}\n`;
  log.append(line);
  log.scrollTop = log.scrollHeight;
}

// повідомлення, яке треба показати вже на наступній сторінці (після редіректу)
function flash(text) {
  sessionStorage.setItem(FLASH_KEY, text);
}

function showFlash() {
  const text = sessionStorage.getItem(FLASH_KEY);
  if (text) {
    sessionStorage.removeItem(FLASH_KEY);
    print(text, "warn");
  }
}

/* ---------- tokens ---------- */

const tokens = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  save({
    access,
    refresh
  }) {
    if (access) localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

// залогінений = є refresh-токен; access може вже протухнути, його оновить api()
const isLoggedIn = () => Boolean(tokens.refresh);

/* ---------- API ---------- */

class ApiError extends Error {
  constructor(status, data) {
    super(data?.error ?? `HTTP ${status}`);
    this.status = status;
    this.data = data;
  }
}

function errorText(error) {
  const fields = error.data?.fields ?
    " " +
    Object.entries(error.data.fields)
    .map(([key, value]) => `${key}: ${[].concat(value).join(" ")}`)
    .join("; ") :
    "";
  return error.status ? `HTTP ${error.status}: ${error.message}${fields}` : error.message;
}

let refreshing = null;

// один спільний refresh, навіть якщо кілька запитів отримали 401 одночасно
function refreshAccess() {
  refreshing ??= (async () => {
    print("Access-токен протух. Регенерую через refresh-токен...", "warn");
    const response = await fetch(`${API_URL}/auth/token/refresh/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        refresh: tokens.refresh
      }),
    });
    if (!response.ok) throw new ApiError(response.status, null);
    tokens.save(await response.json());
    print("I'm in. Знову. Логінитись не довелось.", "warn");
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

let authRequired = false;

function sessionLost() {
  tokens.clear();
  if (authRequired) {
    flash("Refresh-токен теж протух. Сесію знищено, увійдіть знову.");
    location.replace(loginUrl());
  } else {
    print("Сесія протухла. Ви знову анонім (у поганому сенсі).", "err");
    renderNav(null);
  }
}

async function api(path, {
  method = "GET",
  body,
  auth = true
} = {}) {
  const url = path.startsWith("http") ? path : API_URL + path;

  const send = async () => {
    const headers = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (auth && tokens.access) headers.Authorization = `Bearer ${tokens.access}`;
    try {
      return await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiError(0, {
        error: `ACCESS DENIED: мейнфрейм не відповідає. Запустіть бекенд на ${API_URL} і перевірте CORS.`,
      });
    }
  };

  let response = await send();
  if (response.status === 401 && auth && tokens.refresh) {
    try {
      await refreshAccess();
    } catch {
      sessionLost();
    }
    response = await send();
  }

  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, data);
  return data;
}

/* ---------- auth flow ---------- */

function currentPage() {
  return (location.pathname.split("/").pop() || "index.html") + location.search;
}

function loginUrl(next = currentPage()) {
  return `login.html?next=${encodeURIComponent(next)}`;
}

// лише сторінки цього ж сайту, щоб ?next= не можна було використати для редіректу на чужий сайт
function safeNext(value) {
  return /^[a-z-]+\.html(\?[\w=&%.-]*)?$/.test(value ?? "") ? value : "lair.html";
}

function requireAuth() {
  if (!isLoggedIn()) {
    flash("Бункер лише для своїх. Спершу увійдіть.");
    location.replace(loginUrl());
    return false;
  }
  authRequired = true;
  return true;
}

function redirectIfLoggedIn() {
  if (!isLoggedIn()) return false;
  location.replace(safeNext(new URLSearchParams(location.search).get("next")));
  return true;
}

let mePromise = null;

function loadMe() {
  mePromise ??= isLoggedIn() ? api("/auth/me/").catch(() => null) : Promise.resolve(null);
  return mePromise;
}

function logout() {
  tokens.clear();
  flash("rm -rf ~/.tokens — сліди стерто. Ви вийшли.");
  location.href = "index.html";
}

/* ---------- nav ---------- */

function navLink(href, text) {
  const link = document.createElement("a");
  link.href = href;
  link.textContent = text;
  if (currentPage().startsWith(href)) link.setAttribute("aria-current", "page");
  return link;
}

function renderNav(me) {
  const nav = document.getElementById("nav");
  if (!nav) return;

  const pages = document.createElement("div");
  pages.className = "nav-pages";
  pages.append(navLink("index.html", "[ задачі ]"), navLink("lair.html", "[ бункер ]"));

  const account = document.createElement("div");
  account.className = "nav-account";
  if (me) {
    const user = document.createElement("span");
    user.className = "user-tag";
    user.textContent = `root@${me.username}${me.is_staff ? " #admin" : ""}`;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Вийти (стерти сліди)";
    button.addEventListener("click", logout);
    account.append(user, button);
  } else {
    account.append(navLink("login.html", "Увійти"), navLink("register.html", "Приєднатися"));
  }

  nav.replaceChildren(pages, account);
}

async function initNav() {
  renderNav(isLoggedIn() ? {
    username: "...",
    is_staff: false
  } : null);
  const me = await loadMe();
  renderNav(isLoggedIn() ? (me ?? {
    username: "???",
    is_staff: false
  }) : null);
}

/* ---------- forms ---------- */

function formValues(form) {
  return Object.fromEntries(new FormData(form));
}

// помилки з {"fields": {...}} показуються під відповідним полем форми
function showFieldErrors(form, fields = {}) {
  for (const slot of form.querySelectorAll("[data-error-for]")) {
    slot.textContent = [].concat(fields?.[slot.dataset.errorFor] ?? []).join(" ");
  }
}

/* ---------- matrix rain ---------- */

function matrixRain() {
  const canvas = document.getElementById("matrix");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const chars = "アイウエオカキクケコサシスセソ0123456789ABCDEF$#@%&";
  const size = 16;
  let drops = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drops = Array.from({
        length: Math.ceil(canvas.width / size)
      }, () =>
      Math.floor((Math.random() * canvas.height) / size)
    );
  }

  function draw() {
    ctx.fillStyle = "rgba(2, 6, 2, 0.08)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#33ff66";
    ctx.font = `${size}px monospace`;
    drops.forEach((y, x) => {
      ctx.fillText(chars[Math.floor(Math.random() * chars.length)], x * size, y * size);
      drops[x] = y * size > canvas.height && Math.random() > 0.975 ? 0 : y + 1;
    });
  }

  resize();
  window.addEventListener("resize", resize);
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    setInterval(draw, 50);
  }
}

document.addEventListener("DOMContentLoaded", matrixRain);