document.addEventListener("DOMContentLoaded", () => {
  // --- Gestion des formulaires principaux ---
  function showForm(type) {
    document.querySelectorAll('.form').forEach(f => f.classList.remove('active'));
    const resetForm = document.getElementById('resetForm');
    if (resetForm) resetForm.style.display = "none";
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    const forgotLink = document.getElementById('forgotLink');

    if (type === 'login') {
      document.getElementById('loginForm').classList.add('active');
      document.querySelectorAll('.tab')[0].classList.add('active');
      if (forgotLink) forgotLink.style.display = "inline";
    } else if (type === 'register') {
      document.getElementById('registerForm').classList.add('active');
      document.querySelectorAll('.tab')[1].classList.add('active');
      if (forgotLink) forgotLink.style.display = "inline";
    } else if (type === 'reset') {
      if (resetForm) resetForm.style.display = "block";
      if (forgotLink) forgotLink.style.display = "none";
    }
  }

  // --- Endpoints PHP (hébergeur) ---
  const LOGIN_URL = "login.php";
  const REGISTER_URL = "register.php";
  const RESET_URL = "reset.php";

  async function sendRequest(url, data) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      return await res.json();
    } catch (err) {
      console.error("Erreur serveur:", err);
      return { success: false, message: "Erreur serveur." };
    }
  }

  // --- Notification + redirection ---
  function showSuccessAndRedirectFDJ(message, target = "app.html") {
    const container = document.createElement("div");
    Object.assign(container.style, {
      position: "fixed",
      top: "-100px",
      left: "50%",
      transform: "translateX(-50%)",
      padding: "20px 40px",
      background: "linear-gradient(135deg, #0066cc, #ffcc00)",
      color: "#fff",
      fontSize: "1.3em",
      fontWeight: "bold",
      borderRadius: "12px",
      boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
      zIndex: "9999",
      transition: "top 0.6s ease, opacity 0.6s ease",
      opacity: "0"
    });
    container.textContent = message;
    document.body.appendChild(container);

    setTimeout(() => { container.style.top = "30px"; container.style.opacity = "1"; }, 10);
    setTimeout(() => {
      container.style.top = "-100px"; 
      container.style.opacity = "0";
      setTimeout(() => {
        const token = localStorage.getItem("userToken") || "";
        window.location.href = target + "?token=" + encodeURIComponent(token);
      }, 600);
    }, 1500);
  }

  // --- Connexion ---
  async function login(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const result = await sendRequest(LOGIN_URL, { email, password });
    if (result.success) {
      localStorage.setItem("userToken", result.token);
      localStorage.setItem("userEmail", result.email);
      // Nettoie le flag expiredRedirect en cas de reconnexion
      sessionStorage.removeItem("expiredRedirect");
      showSuccessAndRedirectFDJ("Connexion réussie !");
    } else alert(result.message || "Échec de la connexion.");
  }

  // --- Inscription ---
  async function register(e) {
  e.preventDefault();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const dob = document.getElementById('regDob').value;
  const age = new Date().getFullYear() - new Date(dob).getFullYear();
  if (age < 18) return alert("Vous devez avoir au moins 18 ans pour vous inscrire.");
  if (!document.getElementById('acceptCGU').checked) return alert("Veuillez accepter les CGU.");

  // 1. On commence par l'inscription
  const result = await sendRequest(REGISTER_URL, { email, password, dob });
  if (result.success) {
    // 2. On tente d'envoyer le mail de bienvenue
    try {
      const mailRes = await fetch("userinfo.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sendWelcomeEmail",
          to: email
        })
      });
      const mailJson = await mailRes.json();
      // 3. Si le mail échoue, on bloque TOUT
      if (!mailJson.success) {
        alert("Échec de l'envoi du mail de bienvenue. Votre inscription n'est pas prise en compte !");
        return; // On n'enregistre PAS le token ni l'email, pas de redirection
      }
    } catch (err) {
      alert("Erreur technique lors de l'envoi du mail de bienvenue. Votre inscription n'est pas prise en compte !");
      return;
    }
    // 4. Inscription OK + mail OK : on valide l'inscription
    localStorage.setItem("userToken", result.token || "");
    localStorage.setItem("userEmail", email);
    sessionStorage.removeItem("expiredRedirect");
    showSuccessAndRedirectFDJ("Inscription réussie !");
  } else alert(result.message || "Échec de l'inscription.");
}

  // --- Reset Password ---
async function resetPassword(e) {
  e.preventDefault();
  const email = document.getElementById('resetEmail').value.trim();
  if (!email) return alert("Veuillez entrer votre email.");
  
  // On envoie le mail de reset
  try {
    const res = await fetch("userinfo.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "requestPasswordReset",
        email: email
      })
    });
    const result = await res.json();
    if (result.success) {
      alert("Un email de réinitialisation a été envoyé !");
    } else {
      alert(result.message || "Impossible d'envoyer le mail de réinitialisation.");
    }
  } catch (err) {
    alert("Erreur serveur : " + err.message);
  }
}

  function cancelReset() { showForm('login'); }

  // --- CGU Modal ---
  function openCGU() { document.getElementById('cguModal').style.display = "flex"; }
  function acceptCGU() { document.getElementById('acceptCGU').checked = true; document.getElementById('cguModal').style.display = "none"; }

  // --- Bind Events ---
  document.getElementById('loginForm').addEventListener('submit', login);
  document.getElementById('registerForm').addEventListener('submit', register);
  document.getElementById('resetForm').addEventListener('submit', resetPassword);

  document.querySelectorAll('.tab')[0].addEventListener('click', () => showForm('login'));
  document.querySelectorAll('.tab')[1].addEventListener('click', () => showForm('register'));
  document.getElementById('forgotLink').addEventListener('click', () => showForm('reset'));

  document.getElementById('openCGU').addEventListener('click', openCGU);
  document.getElementById('acceptBtn').addEventListener('click', acceptCGU);
  document.getElementById('btnCancelReset').addEventListener('click', cancelReset);

  showForm('login');
});
