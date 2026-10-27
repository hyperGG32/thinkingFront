const API_URL = "http://127.0.0.1:8001/api/v1";

const DIFFICULTY = {
  easy: "script kiddie",
  medium: "h4x0r",
  hard: "1337 elite",
};

const TIPS = [
  "Порада: Caps Lock додає +50% до швидкості хакінгу.",
  "Порада: справжні хакери працюють лише в капюшоні. Навіть влітку.",
  "Порада: якщо не зламується — просто друкуй швидше.",
  "Порада: два хакери на одній клавіатурі зламують удвічі швидше.",
  "Порада: завантажте ще трохи RAM. Безкоштовно. Без SMS.",
  "Порада: кажіть «I'm in» після кожного успішного GET.",
  "Порада: зелений текст на чорному тлі — це 90% безпеки.",
];

const HACK_LINES = [
  "Ініціалізація кібер-капюшона...",
  "Обхід файрволу [██████████] 100%",
  "Підключення до мейнфрейму через 7 проксі...",
  "Розшифровка паролю: hunter2 ... ok",
];

const log = document.getElementById("log");
const list = document.getElementById("challenges");
const count = document.getElementById("count");
const form = document.getElementById("filters");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const dialog = document.getElementById("detail");
const dialogBody = document.getElementById("detail-body");

let prevUrl = null;
let nextUrl = null;

document.getElementById("api-url").textContent = API_URL;

/* ---------- console ---------- */

function print(text, kind = "") {
  const line = document.createElement("span");
  if (kind) line.className = kind;
  line.textContent = `> ${text}\n`;
  log.append(line);
  log.scrollTop = log.scrollHeight;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function hackingIntro() {
  for (const text of HACK_LINES) {
    print(text);
    await sleep(250);
  }
}

/* ---------- API ---------- */

async function request(url) {
  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error(
      `ACCESS DENIED: мейнфрейм не відповідає. Запустіть бекенд на ${API_URL} і перевірте CORS.`
    );
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const fields = data?.fields
      ? " " + Object.entries(data.fields).map(([k, v]) => `${k}: ${v.join(" ")}`).join("; ")
      : "";
    throw new Error(`HTTP ${response.status}: ${data?.error ?? response.statusText}${fields}`);
  }
  return data;
}

function challengesUrl() {
  const params = new URLSearchParams();
  for (const [key, value] of new FormData(form)) {
    if (value) params.set(key, value);
  }
  return `${API_URL}/challenges/?${params}`;
}

/* ---------- render ---------- */

function card(challenge) {
  const item = document.createElement("li");
  item.className = "card";
  item.tabIndex = 0;

  const title = document.createElement("h3");
  title.textContent = challenge.title;

  const meta = document.createElement("p");
  meta.className = "meta";

  const badge = document.createElement("span");
  badge.className = `badge ${challenge.difficulty}`;
  badge.textContent = DIFFICULTY[challenge.difficulty] ?? challenge.difficulty;

  meta.append(
    badge,
    `${challenge.points} XP`,
    document.createElement("br"),
    `категорія: ${challenge.category.name}`,
    document.createElement("br"),
    `автор: ${challenge.author?.nickname ?? "anonymous"} · розв'язків: ${challenge.solves}`
  );

  item.append(title, meta);
  item.addEventListener("click", () => openDetail(challenge.id));
  item.addEventListener("keydown", (event) => {
    if (event.key === "Enter") openDetail(challenge.id);
  });
  return item;
}

function renderPage(page) {
  list.replaceChildren(...page.results.map(card));
  if (page.results.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "Нічого не знайдено. Навіть у даркнеті.";
    list.append(empty);
  }
  count.textContent = `[${page.count}]`;
  prevUrl = page.previous;
  nextUrl = page.next;
  prevBtn.disabled = !prevUrl;
  nextBtn.disabled = !nextUrl;
}

/* ---------- actions ---------- */

async function loadChallenges(url = challengesUrl()) {
  print(`GET ${url}`);
  try {
    const page = await request(url);
    renderPage(page);
    print(`I'm in. Викрадено задач: ${page.results.length} з ${page.count}.`);
  } catch (error) {
    print(error.message, "err");
  }
}

async function loadCategories() {
  try {
    const categories = await request(`${API_URL}/categories/`);
    const select = form.elements.category;
    for (const category of categories) {
      select.append(new Option(category.name, category.id));
    }
    print(`Категорій знайдено: ${categories.length}.`);
  } catch (error) {
    print(error.message, "err");
  }
}

async function openDetail(id) {
  print(`GET ${API_URL}/challenges/${id}/`);
  try {
    const c = await request(`${API_URL}/challenges/${id}/`);
    dialogBody.textContent = [
      `== ${c.title} ==`,
      "",
      c.description,
      "",
      `складність : ${DIFFICULTY[c.difficulty] ?? c.difficulty}`,
      `бали       : ${c.points} XP`,
      `категорія  : ${c.category.name}`,
      `статус     : ${c.status}`,
      `підключення: ${c.connection_info || "—"}`,
      `first blood: ${c.first_blood?.user?.nickname ?? "ще ніхто. Будь першим."}`,
      `створено   : ${new Date(c.created_at).toLocaleString("uk-UA")}`,
    ].join("\n");
    dialog.showModal();
  } catch (error) {
    print(error.message, "err");
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  loadChallenges();
});
prevBtn.addEventListener("click", () => prevUrl && loadChallenges(prevUrl));
nextBtn.addEventListener("click", () => nextUrl && loadChallenges(nextUrl));

/* ---------- tips ---------- */

let tipIndex = 0;
function nextTip() {
  document.getElementById("tip").textContent = TIPS[tipIndex];
  tipIndex = (tipIndex + 1) % TIPS.length;
}
nextTip();
setInterval(nextTip, 5000);

/* ---------- matrix rain ---------- */

function matrixRain() {
  const canvas = document.getElementById("matrix");
  const ctx = canvas.getContext("2d");
  const chars = "アイウエオカキクケコサシスセソ0123456789ABCDEF$#@%&";
  const size = 16;
  let drops = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drops = Array.from({ length: Math.ceil(canvas.width / size) }, () =>
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

/* ---------- start ---------- */

matrixRain();
hackingIntro().then(() => Promise.all([loadCategories(), loadChallenges()]));
