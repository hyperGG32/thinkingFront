const challengeForm = document.getElementById("challenge-form");
const categoryForm = document.getElementById("category-form");
const myList = document.getElementById("my-challenges");
const reviewList = document.getElementById("review-challenges");

let me = null;

/* ---------- render ---------- */

function actionButton(label, onClick, kind = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  if (kind) button.className = kind;
  button.addEventListener("click", async () => {
    button.disabled = true;
    await onClick();
    button.disabled = false;
  });
  return button;
}

function row(challenge, buttons) {
  const item = document.createElement("li");
  item.className = "row";

  const info = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = challenge.title;
  const meta = document.createElement("span");
  meta.className = "meta";
  meta.textContent = ` · ${DIFFICULTY[challenge.difficulty] ?? challenge.difficulty} · ${challenge.points} XP · ${challenge.category.name} · автор: ${challenge.author?.nickname ?? "anonymous"}`;
  const status = document.createElement("span");
  status.className = `status ${challenge.status}`;
  status.textContent = STATUS[challenge.status] ?? challenge.status;
  info.append(title, meta, document.createElement("br"), status);

  const actions = document.createElement("div");
  actions.className = "row-actions";
  actions.append(...buttons);

  item.append(info, actions);
  return item;
}

function renderList(list, counter, challenges, buttonsFor, emptyText) {
  list.replaceChildren(...challenges.map((c) => row(c, buttonsFor(c))));
  if (challenges.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = emptyText;
    list.append(empty);
  }
  document.getElementById(counter).textContent = `[${challenges.length}]`;
}

/* ---------- actions ---------- */

async function setStatus(challenge, status, okText) {
  print(`PATCH /challenges/${challenge.id}/ {"status": "${status}"}`);
  try {
    await api(`/challenges/${challenge.id}/`, {
      method: "PATCH",
      body: {
        status
      }
    });
    print(okText);
    await refreshLists();
  } catch (error) {
    print(errorText(error), "err");
  }
}

async function removeChallenge(challenge) {
  if (!confirm(`Стерти «${challenge.title}»? Це незворотно, як rm -rf /.`)) return;
  print(`DELETE /challenges/${challenge.id}/`);
  try {
    await api(`/challenges/${challenge.id}/`, {
      method: "DELETE"
    });
    print("Експлойт стерто. Доказів немає.");
    await refreshLists();
  } catch (error) {
    print(errorText(error), "err");
  }
}

function myButtons(challenge) {
  const buttons = [];
  if (challenge.status === "draft" || challenge.status === "rejected") {
    buttons.push(
      actionButton("На рев'ю", () =>
        setStatus(challenge, "review", "Відправлено Раді. Чекайте вердикту.")
      )
    );
  }
  buttons.push(actionButton("Стерти", () => removeChallenge(challenge), "danger"));
  return buttons;
}

function reviewButtons(challenge) {
  return [
    actionButton("Схвалити", () =>
      setStatus(challenge, "active", "Схвалено. Експлойт випущено в дику природу.")
    ),
    actionButton(
      "Відхилити",
      () => setStatus(challenge, "rejected", "Відхилено. Автор отримав бан на 5 хвилин (ні)."),
      "danger"
    ),
  ];
}

// у списку задач API не віддає поле status, тому питаємо окремо по кожному статусу
async function challengesByStatus(statuses, extra = "") {
  const pages = await Promise.all(
    statuses.map((status) =>
      api(`/challenges/?status=${status}${extra}`).then((page) =>
        page.results.map((challenge) => ({
          ...challenge,
          status
        }))
      )
    )
  );
  return pages.flat().sort((a, b) => b.id - a.id);
}

async function loadMine() {
  try {
    const mine = await challengesByStatus(Object.keys(STATUS), `&author=${me.id}`);
    renderList(myList, "my-count", mine, myButtons, "Порожньо. Час щось зламати.");
  } catch (error) {
    print(errorText(error), "err");
  }
}

async function loadReview() {
  try {
    const queue = await challengesByStatus(["review"]);
    renderList(reviewList, "review-count", queue, reviewButtons, "Черга порожня. Рада відпочиває.");
  } catch (error) {
    print(errorText(error), "err");
  }
}

function refreshLists() {
  return Promise.all([loadMine(), me.is_staff ? loadReview() : null]);
}

async function loadCategories() {
  try {
    const categories = await api("/categories/", {
      auth: false
    });
    challengeForm.elements.category.replaceChildren(
      ...categories.map((category) => new Option(category.name, category.id))
    );
    if (categories.length === 0) {
      print("Категорій ще немає — попросіть адміна створити хоча б одну.", "warn");
    }
  } catch (error) {
    print(errorText(error), "err");
  }
}

challengeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showFieldErrors(challengeForm);
  const values = formValues(challengeForm);
  print("POST /challenges/");
  try {
    const challenge = await api("/challenges/", {
      method: "POST",
      body: {
        ...values,
        category: Number(values.category),
        points: Number(values.points)
      },
    });
    print(`«${challenge.title}» залито як чернетку. Надішліть її на рев'ю, коли буде готово.`);
    challengeForm.reset();
    await loadMine();
  } catch (error) {
    showFieldErrors(challengeForm, error.data?.fields);
    print(errorText(error), "err");
  }
});

categoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showFieldErrors(categoryForm);
  print("POST /categories/");
  try {
    const category = await api("/categories/", {
      method: "POST",
      body: formValues(categoryForm)
    });
    print(`Категорію «${category.name}» створено.`);
    categoryForm.reset();
    await loadCategories();
  } catch (error) {
    showFieldErrors(categoryForm, error.data?.fields);
    print(errorText(error), "err");
  }
});

/* ---------- start ---------- */

async function start() {
  showFlash();
  initNav();
  me = await loadMe();
  if (!me) {
    print("Не вдалося дізнатися, хто ви. Мейнфрейм мовчить.", "err");
    return;
  }

  document.getElementById("greeting").textContent = `Вітаю, агенте ${me.username}. Рівень допуску: ${
    me.is_staff ? "РАДА АНОНІМУСІВ (admin)" : "рядовий хакер"
  }.`;
  document.getElementById("admin").hidden = !me.is_staff;

  await Promise.all([loadCategories(), refreshLists()]);
}

if (isLoggedIn()) start();