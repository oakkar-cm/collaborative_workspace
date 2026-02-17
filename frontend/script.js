const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

const message = document.getElementById("message");

const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const protectedBtn = document.getElementById("protectedBtn");

let token = localStorage.getItem("token") || "";

/* -------- TAB SWITCH -------- */
loginTab.addEventListener("click", () => {
  loginTab.classList.add("active");
  registerTab.classList.remove("active");
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");
  message.textContent = "";
});

registerTab.addEventListener("click", () => {
  registerTab.classList.add("active");
  loginTab.classList.remove("active");
  registerForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
  message.textContent = "";
});

/* -------- REGISTER -------- */
registerBtn.addEventListener("click", async () => {
  const email = document.getElementById("registerEmail").value;
  const firstName = document.getElementById("registerFirstName").value;
  const lastName = document.getElementById("registerLastName").value;
  const password = document.getElementById("registerPassword").value;

  try {
    const res = await fetch("http://localhost:3000/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, firstName, lastName, password })
    });

    const data = await res.json();
    message.textContent = data.message;
  } catch (err) {
    message.textContent = "Registration failed";
  }
});

/* -------- LOGIN -------- */
loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  try {
    const res = await fetch("http://localhost:3000/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (data.token) {
      token = data.token;
      localStorage.setItem("token", token);
      message.textContent = "Login successful";
    } else {
      message.textContent = data.message;
    }

  } catch (err) {
    message.textContent = "Login failed";
  }
});

/* -------- PROTECTED -------- */
protectedBtn.addEventListener("click", async () => {
  if (!token) {
    message.textContent = "Please login first";
    return;
  }

  const res = await fetch("http://localhost:3000/api/protected", {
    headers: {
      "Authorization": "Bearer " + token
    }
  });

  const data = await res.json();
  message.textContent = data.message;
});
