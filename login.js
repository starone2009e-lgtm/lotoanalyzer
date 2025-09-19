// Script index.html mis à jour :
// - Unifie la clé du token => localStorage 'token' (au lieu de 'userToken')
// - Stocke is_admin ('1' ou '0') + session_expires_at
// - Redirige automatiquement vers admin.html si l'utilisateur est admin après login
// - showSuccessAndRedirectFDJ choisit dynamiquement la cible (admin.html / app.html)
// - Nettoie expiredRedirect si reconnexion
// - Améliore la robustesse (trim email, vérifs basiques)

document.addEventListener("DOMContentLoaded", () => {

  // ----------- Gestion des formulaires (login / register / reset) -----------
  function showForm(type) {
    document.querySelectorAll('.form').forEach(f => f.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    const resetForm = document.getElementById('resetForm');
    const forgotLink = document.getElementById('forgotLink');

    if (type === 'login') {
      document.getElementById('loginForm').classList.add('active');
      document.querySelectorAll('.tab')[0].classList.add('active');
      if (forgotLink) forgotLink.style.display = "inline";
      if (resetForm) resetForm.style.display = "none";
    } else if (type === 'register') {
      document.getElementById('registerForm').classList.add('active');
      document.querySelectorAll('.tab')[1].classList.add('active');
      if (forgotLink) forgotLink.style.display = "inline";
      if (resetForm) resetForm.style.display = "none";
    } else if (type === 'reset') {
      if (resetForm) resetForm.style.display = "block";
      if (forgotLink) forgotLink.style.display = "none";
    }
  }

  // ----------- Endpoints ----------- 
  const LOGIN_URL    = "login.php";
  const REGISTER_URL = "register.php";
  const RESET_URL    = "reset.php"; // (utilisé indirectement via userinfo.php pour reset flow étendu)

  async function sendRequest(url, data) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(data)
      });
      const json = await res.json().catch(() => ({ success:false, message:"Réponse invalide" }));
      return json;
    } catch (err) {
      console.error("Erreur fetch:", err);
      return { success:false, message:"Erreur serveur." };
    }
  }

  // ----------- Notification + redirection dynamique -----------
  function showSuccessAndRedirectFDJ(message, target) {
    const container = document.createElement("div");
    Object.assign(container.style, {
      position: "fixed",
      top: "-100px",
      left: "50%",
      transform: "translateX(-50%)",
      padding: "20px 40px",
      background: "linear-gradient(135deg, #0066cc, #ffcc00)",
      color: "#fff",
      fontSize: "1.15em",
      fontWeight: "bold",
      borderRadius: "12px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
      zIndex: "9999",
      transition: "top 0.6s ease, opacity 0.6s ease",
      opacity: "0"
    });
    container.textContent = message;
    document.body.appendChild(container);

    setTimeout(() => {
      container.style.top = "30px";
      container.style.opacity = "1";
    }, 10);

    setTimeout(() => {
      container.style.top = "-100px";
      container.style.opacity = "0";
      setTimeout(() => {
        const token = localStorage.getItem("token") || "";
        // On ajoute le token en query si tu en as besoin côté app/admin (sinon tu peux retirer)
        window.location.href = target + (token ? "?token=" + encodeURIComponent(token) : "");
      }, 550);
    }, 1400);
  }

  // ----------- Connexion -----------
  async function login(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
      alert("Veuillez remplir tous les champs.");
      return;
    }

    const result = await sendRequest(LOGIN_URL, { email, password });

    if (result.success) {
      // Unification clés localStorage
      localStorage.setItem("token", result.token);
      localStorage.setItem("userToken", result.token); // (Legacy pour compat éventuelle)
      localStorage.setItem("userEmail", result.email || email);
      if (result.session_expires_at) {
        localStorage.setItem("session_expires_at", result.session_expires_at);
      }
      if (typeof result.is_admin !== 'undefined') {
        localStorage.setItem("is_admin", result.is_admin ? "1" : "0");
      }

      // Nettoyage d’un éventuel flag de redirection précédente
      sessionStorage.removeItem("expiredRedirect");

      // Cible : admin.html si admin, sinon app.html
      const target = result.is_admin ? "admin.html" : "app.html";
      showSuccessAndRedirectFDJ("Connexion réussie !", target);
    } else {
      alert(result.message || "Échec de la connexion.");
    }
  }

  // ----------- Inscription -----------
  async function register(e) {
    e.preventDefault();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const dob = document.getElementById('regDob').value;

    if (!email || !password || !dob) {
      alert("Veuillez remplir tous les champs.");
      return;
    }

    const birth = new Date(dob);
    const todayYear = new Date().getFullYear();
    const age = todayYear - birth.getFullYear() - (new Date().setFullYear(todayYear) < birth ? 1 : 0);
    if (age < 18) {
      alert("Vous devez avoir au moins 18 ans pour vous inscrire.");
      return;
    }

    if (!document.getElementById('acceptCGU').checked) {
      alert("Veuillez accepter les CGU.");
      return;
    }

    // 1. Inscription
    const result = await sendRequest(REGISTER_URL, { email, password, dob });
    if (!result.success) {
      alert(result.message || "Échec de l'inscription.");
      return;
    }

    // 2. Envoi mail bienvenue (via userinfo.php action sendWelcomeEmail)
    try {
      const mailRes = await fetch("userinfo.php", {
        method: "POST",
        headers: { "Content-Type":"application/json", "Accept":"application/json" },
        body: JSON.stringify({ action:"sendWelcomeEmail", to: email })
      });
      const mailJson = await mailRes.json().catch(() => ({ success:false }));
      if (!mailJson.success) {
        alert("Échec de l'envoi du mail de bienvenue. Votre inscription n'est pas prise en compte !");
        return;
      }
    } catch (err) {
      alert("Erreur technique lors de l'envoi du mail de bienvenue. Votre inscription n'est pas prise en compte !");
      return;
    }

    // 3. Si ton register.php renvoie déjà un token (adapter si ce n'est pas le cas)
    if (result.token) {
      localStorage.setItem("token", result.token);
      localStorage.setItem("userToken", result.token);
      localStorage.setItem("userEmail", email);
      if (result.session_expires_at) {
        localStorage.setItem("session_expires_at", result.session_expires_at);
      }
      if (typeof result.is_admin !== 'undefined') {
        localStorage.setItem("is_admin", result.is_admin ? "1" : "0");
      }
    } else {
      // Si pas de token dans la réponse inscription, envisager un login automatique :
      // const autoLogin = await sendRequest(LOGIN_URL, { email, password });
      // ...
    }

    sessionStorage.removeItem("expiredRedirect");
    // En général un nouvel inscrit n'est pas admin
    const target = (result.is_admin ? "admin.html" : "app.html");
    showSuccessAndRedirectFDJ("Inscription réussie !", target);
  }

  // ----------- Reset Password -----------
  async function resetPassword(e) {
    e.preventDefault();
    const email = document.getElementById('resetEmail').value.trim();
    if (!email) {
      alert("Veuillez entrer votre email.");
      return;
    }
    try {
      const res = await fetch("userinfo.php", {
        method: "POST",
        headers: { "Content-Type":"application/json", "Accept":"application/json" },
        body: JSON.stringify({ action:"requestPasswordReset", email })
      });
      const result = await res.json().catch(() => ({ success:false }));
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

  // ----------- CGU Modal -----------
  function openCGU() { document.getElementById('cguModal').style.display = "flex"; }
  function acceptCGU() {
    document.getElementById('acceptCGU').checked = true;
    document.getElementById('cguModal').style.display = "none";
  }

  // ----------- Bind Events -----------
  document.getElementById('loginForm').addEventListener('submit', login);
  document.getElementById('registerForm').addEventListener('submit', register);
  document.getElementById('resetForm').addEventListener('submit', resetPassword);

  document.querySelectorAll('.tab')[0].addEventListener('click', () => showForm('login'));
  document.querySelectorAll('.tab')[1].addEventListener('click', () => showForm('register'));
  document.getElementById('forgotLink').addEventListener('click', () => showForm('reset'));

  document.getElementById('openCGU').addEventListener('click', openCGU);
  document.getElementById('acceptBtn').addEventListener('click', acceptCGU);
  document.getElementById('btnCancelReset').addEventListener('click', cancelReset);

  // ----------- Initial -----------
  showForm('login');
});
