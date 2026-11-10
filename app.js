const TIPS = [
  "Порада: Caps Lock додає +50% до швидкості хакінгу.",
  "Порада: справжні хакери працюють лише в капюшоні. Навіть влітку.",
  "Порада: якщо не зламується — просто друкуй швидше.",
  "Порада: два хакери на одній клавіатурі зламують удвічі швидше.",
  "Порада: завантажте ще трохи RAM. Безкоштовно. Без SMS.",
  "Порада: кажіть «I'm in» після кожного успішного GET.",
  "Порада: зелений текст на чорному тлі — це 90% безпеки.",
  "Порада: JWT — не пароль, але показувати його друзям теж не варто.",
];

const HACK_LINES = [
  "Ініціалізація кібер-капюшона...",
  "Обхід файрволу [██████████] 100%",
  "Підключення до мейнфрейму через 7 проксі...",
  "Розшифровка паролю: hunter2 ... ok",
];

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

async function hackingIntro() {
  for (const text of HACK_LINES) {
    print(text);
    await sleep(250);
  }
}

function challengesPath() {
  const params = new URLSearchParams();
  for (const [key, value] of new FormData(form)) {
    if (value) params.set(key, value);
  }
  return `/challenges/?${params}`;
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

async function loadChallenges(path = challengesPath()) {
  print(`GET ${path}`);
  try {
    const page = await api(path);
    renderPage(page);
    print(`I'm in. Викрадено задач: ${page.results.length} з ${page.count}.`);
  } catch (error) {
    print(errorText(error), "err");
  }
}

async function loadCategories() {
  try {
    const categories = await api("/categories/", {
      auth: false
    });
    const select = form.elements.category;
    for (const category of categories) {
      select.append(new Option(category.name, category.id));
    }
    print(`Категорій знайдено: ${categories.length}.`);
  } catch (error) {
    print(errorText(error), "err");
  }
}

async function openDetail(id) {
  print(`GET /challenges/${id}/`);
  try {
    const c = await api(`/challenges/${id}/`);
    dialogBody.textContent = [
      `== ${c.title} ==`,
      "",
      c.description,
      "",
      `складність : ${DIFFICULTY[c.difficulty] ?? c.difficulty}`,
      `бали       : ${c.points} XP`,
      `категорія  : ${c.category.name}`,
      `статус     : ${STATUS[c.status] ?? c.status}`,
      `підключення: ${c.connection_info || "—"}`,
      `first blood: ${c.first_blood?.user?.nickname ?? "ще ніхто. Будь першим."}`,
      `створено   : ${new Date(c.created_at).toLocaleString("uk-UA")}`,
    ].join("\n");
    dialog.showModal();
  } catch (error) {
    print(errorText(error), "err");
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

/* ---------- start ---------- */

initNav();
hackingIntro().then(() => {
  showFlash();
  return Promise.all([loadCategories(), loadChallenges()]);
});