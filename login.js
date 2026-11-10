const loginForm = document.getElementById("login-form");

const LOGIN_LINES = [
  "Підбираю пароль... а, ви ж його знаєте.",
  "Обхід двофакторки... її нема. Зручно.",
  "Перевірка особи через JWT...",
];

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showFieldErrors(loginForm);
  const button = loginForm.querySelector("button");
  button.disabled = true;

  try {
    for (const text of LOGIN_LINES) {
      print(text);
      await sleep(200);
    }
    const data = await api("/auth/token/", {
      method: "POST",
      body: formValues(loginForm),
      auth: false,
    });
    tokens.save(data);
    flash("Access granted. I'm in.");
    location.replace(safeNext(new URLSearchParams(location.search).get("next")));
  } catch (error) {
    showFieldErrors(loginForm, error.data?.fields);
    print(`ACCESS DENIED. ${errorText(error)}`, "err");
    button.disabled = false;
  }
});

initNav();
showFlash();
print("Очікую облікові дані...");