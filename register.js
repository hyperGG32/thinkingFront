const registerForm = document.getElementById("register-form");

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showFieldErrors(registerForm);
  const button = registerForm.querySelector("button");
  button.disabled = true;

  const values = formValues(registerForm);
  try {
    print("Перевіряю, чи ви не з кіберполіції...");
    const user = await api("/auth/register/", {
      method: "POST",
      body: values,
      auth: false
    });
    print(`Агента ${user.username} завербовано.`);

    // одразу логінимо, щоб не вводити пароль двічі
    tokens.save(
      await api("/auth/token/", {
        method: "POST",
        body: {
          username: values.username,
          password: values.password
        },
        auth: false,
      })
    );
    flash(`Ласкаво просимо до легіону, ${user.username}.`);
    location.replace("lair.html");
  } catch (error) {
    showFieldErrors(registerForm, error.data?.fields);
    print(`Вербування провалено. ${errorText(error)}`, "err");
    button.disabled = false;
  }
});

initNav();
showFlash();
print("Заповніть анкету. Поля з * обов'язкові.");