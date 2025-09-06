// ================== Variables principales ==================
let draws = [], stats = null, chartFreq = null, chartGap = null, currentShown = 10;
const fileInput = document.getElementById('fileInput');
const fakeFileBtn = document.getElementById('fakeFileBtn');
const btnGenerate = document.getElementById('btnGenerate');
const btnExport = document.getElementById('btnExport');
const drawTableWrap = document.getElementById('drawTableWrap');
const drawCount = document.getElementById('drawCount');
const recommendationEl = document.getElementById('recommendation');
const resultsEl = document.getElementById('results');
const overlay = document.getElementById('overlay');
const drawFilter = document.getElementById('drawFilter');
const yearFilter = document.getElementById('yearFilter');

// ================== Gestion compte utilisateur ==================
const userBtn = document.getElementById('userBtn');
const userBtnAvatar = document.getElementById('userBtnAvatar'); // Pour l'avatar sur le bouton
const userInitial = document.getElementById('userInitial'); // Pour l'initiale sur le bouton

const accountModal = document.getElementById('accountModal');
const closeAccountModal = document.getElementById('closeAccountModal');
const accEmail = document.getElementById('accEmail');
const accBirth = document.getElementById('accDob');
const accPassword = document.getElementById('accPassword');
const userAvatarImg = document.getElementById('userAvatar');
const changeAvatarBtn = document.getElementById('changeAvatar'); // Bouton "changer"
const uploadAvatar = document.getElementById('uploadAvatar'); // input type="file"
const updateAccountBtn = document.getElementById('updateAccount');
const deleteAccountBtn = document.getElementById('deleteAccount');
const logoutAccountBtn = document.getElementById('logoutAccount');
const lastLoginEl = document.getElementById('lastLogin');
const signupDateEl = document.getElementById('signupDate');

function showAccountModal() {
  document.getElementById('accountModal').style.display = 'flex';
  document.body.classList.add('modal-open');
}
function hideAccountModal() {
  document.getElementById('accountModal').style.display = 'none';
  document.body.classList.remove('modal-open');
}

(function() {
  const animatedFooter = document.getElementById('animatedFooter');
  let hasAnimated = false;
  function triggerFooterAnimation() {
    const scrollY = window.scrollY || window.pageYOffset;
    const windowH = window.innerHeight;
    const docH = document.body.offsetHeight;
    // On scroll tout en bas, lance l'animation
    if (scrollY + windowH >= docH - 12) {
      if (!hasAnimated) {
        animatedFooter.classList.add('animated');
        hasAnimated = true;
        setTimeout(() => { animatedFooter.classList.remove('animated'); }, 1200);
      }
    }
  }
  window.addEventListener('scroll', triggerFooterAnimation);
  window.addEventListener('resize', triggerFooterAnimation);
  document.addEventListener('DOMContentLoaded', triggerFooterAnimation);
})();

// ==== GESTION AVATAR ====
// Le bouton "changer" ouvre le sélecteur de fichier et upload auto
if (changeAvatarBtn && uploadAvatar) {
    changeAvatarBtn.addEventListener('click', () => {
        uploadAvatar.click();
    });
}

if (uploadAvatar && userAvatarImg) {
    uploadAvatar.addEventListener('change', async () => {
        if (uploadAvatar.files.length === 0) return;
        const file = uploadAvatar.files[0];

        // Preview immédiate
        const reader = new FileReader();
        reader.onload = e => { userAvatarImg.src = e.target.result; };
        reader.readAsDataURL(file);

        // Upload automatique
        const token = localStorage.getItem("userToken");
        if (!token) return alert("Token absent, reconnectez-vous.");

        const formData = new FormData();
        formData.append("action", "updateAvatar");
        formData.append("token", token);
        formData.append("file", file);

        if (typeof showLoader === "function") showLoader(true);

        try {
            const response = await fetch("userinfo.php", {
                method: "POST",
                body: formData
            });
            const result = await response.json();
            if (typeof showLoader === "function") showLoader(false);

            if (result.success && result.avatarUrl) {
                userAvatarImg.src = result.avatarUrl;
                updateUserBtnAvatar(result.avatarUrl, accEmail ? accEmail.value : "");
                alert("Avatar mis à jour !");
            } else {
                alert(result.message || "Erreur lors de la mise à jour de l'avatar.");
            }
        } catch (err) {
            if (typeof showLoader === "function") showLoader(false);
            alert("Erreur réseau : " + err.message);
        }
    });
}

// ===== FONCTION POUR LE BOUTON UTILISATEUR AVATAR/INITIAL =====
function updateUserBtnAvatar(avatarUrl, userEmail) {
    if (userBtnAvatar && userInitial) {
        if (avatarUrl && avatarUrl.length > 0) {
            userBtnAvatar.src = avatarUrl;
            userBtnAvatar.style.display = "block";
            userInitial.style.display = "none";
        } else {
            userBtnAvatar.src = "";
            userBtnAvatar.style.display = "none";
            userInitial.style.display = "block";
            if (userEmail)
                userInitial.textContent = userEmail[0].toUpperCase();
        }
    }
}

// ==== Modales confirmation ====
const deleteConfirmModal = document.getElementById('deleteConfirmModal');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const closeDeleteConfirm = document.getElementById('closeDeleteConfirm');

const updateConfirmModal = document.getElementById('updateConfirmModal');
const confirmUpdateBtn = document.getElementById('confirmUpdateBtn');
const cancelUpdateBtn = document.getElementById('cancelUpdateBtn');
const closeUpdateConfirm = document.getElementById('closeUpdateConfirm');

// ========== Helpers auth ==========
function getUserToken(){
    const params = new URLSearchParams(window.location.search);
    const tokenQS = params.get("token");
    const tokenLS = localStorage.getItem("userToken");
    const token = tokenQS || tokenLS || "";
    return token;
}
function saveUserToken(token){
    if(token) localStorage.setItem("userToken", token);
}
function clearUserToken(){
    localStorage.removeItem("userToken");
}
function logout(){
    clearUserToken();
    window.location.href = "index.html";
}

// ========== Redirection expiration token ==========
function redirectToExpired() {
    clearUserToken();
    sessionStorage.setItem("expiredRedirect", "1");
    window.location.replace("expired.html");
}

function checkTokenAndRedirect() {
    const token = getUserToken();
    if (!token) {
        redirectToExpired();
        return;
    }
    fetch("userinfo.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getUserInfo", token })
    })
    .then(res => res.json())
    .then(data => {
        if (!data.success && data.message && data.message.toLowerCase().includes("expiré")) {
            redirectToExpired();
        }
    })
    .catch(() => {
        redirectToExpired();
    });
}

// Force la redirection même si l'utilisateur fait "retour"
window.addEventListener('pageshow', function(event) {
    if (!getUserToken() || sessionStorage.getItem("expiredRedirect") === "1") {
        redirectToExpired();
    }
});

// ==== Modale compte utilisateur ====
if (userBtn && accountModal) {
    userBtn.addEventListener('click', () => {
        accountModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    });
    accountModal.addEventListener('click', e => {
        if(e.target === accountModal){
            accountModal.style.display = 'none';
            document.body.style.overflow = '';
        }
    });
}
if (closeAccountModal && accountModal) {
    closeAccountModal.addEventListener('click', () => {
        accountModal.style.display = 'none';
        document.body.style.overflow = '';
    });
}

// ==== Déconnexion ====
if (logoutAccountBtn) {
    logoutAccountBtn.addEventListener('click', () => {
        logout();
    });
}

// ==== MODAL CONFIRMATION SUPPRESSION ====
if (deleteAccountBtn && deleteConfirmModal && accountModal) {
    deleteAccountBtn.addEventListener('click', () => {
        accountModal.style.display = "none";
        deleteConfirmModal.style.display = "flex";
        document.body.style.overflow = "hidden";
    });
}
if (cancelDeleteBtn && deleteConfirmModal && accountModal) {
    cancelDeleteBtn.addEventListener('click', () => {
        deleteConfirmModal.style.display = "none";
        accountModal.style.display = "flex";
        document.body.style.overflow = "hidden";
    });
}
if (closeDeleteConfirm && deleteConfirmModal && accountModal) {
    closeDeleteConfirm.addEventListener('click', () => {
        deleteConfirmModal.style.display = "none";
        accountModal.style.display = "flex";
        document.body.style.overflow = "hidden";
    });
}
if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
        const token = getUserToken();
        if (!token) return redirectToExpired();
        showLoader(true);
        try {
            const res = await fetch("userinfo.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "deleteAccount", token })
            });
            const data = await res.json();
            showLoader(false);
            if (data.success) {
                await sendConfirmationEmail("delete", accEmail.value);
                alert("Votre compte a bien été supprimé. Un email de confirmation vient de vous être envoyé.");
                logout();
            } else alert(data.message || "Erreur lors de la suppression du compte.");
        } catch (err) {
            showLoader(false);
            alert("Erreur réseau lors de la suppression.");
        }
        deleteConfirmModal.style.display = "none";
        document.body.style.overflow = "";
    });
}

// ==== MODAL CONFIRMATION MISE À JOUR ====
if (updateAccountBtn && updateConfirmModal && accountModal) {
    updateAccountBtn.addEventListener('click', () => {
        accountModal.style.display = "none";
        updateConfirmModal.style.display = "flex";
        document.body.style.overflow = "hidden";
    });
}
if (cancelUpdateBtn && updateConfirmModal && accountModal) {
    cancelUpdateBtn.addEventListener('click', () => {
        updateConfirmModal.style.display = "none";
        accountModal.style.display = "flex";
        document.body.style.overflow = "hidden";
    });
}
if (closeUpdateConfirm && updateConfirmModal && accountModal) {
    closeUpdateConfirm.addEventListener('click', () => {
        updateConfirmModal.style.display = "none";
        accountModal.style.display = "flex";
        document.body.style.overflow = "hidden";
    });
}
if (confirmUpdateBtn) {
    confirmUpdateBtn.addEventListener('click', async () => {
        const token = getUserToken();
        if (!token) return redirectToExpired();
        const email = accEmail.value.trim();
        const password = accPassword.value.trim();
        if (!email && !password) return alert("Veuillez renseigner au moins un champ à mettre à jour.");
        showLoader(true);
        try {
            const res = await fetch("userinfo.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "updateAccount", token, email, password })
            });
            const data = await res.json();
            showLoader(false);
            if (data.success) {
                await sendConfirmationEmail("update", email || accEmail.value);
                alert("Modification effectuée. Un email de confirmation vient de vous être envoyé.");
                loadUserInfo();
            } else alert(data.message || "Erreur lors de la mise à jour.");
        } catch (err) {
            showLoader(false);
            alert("Erreur réseau lors de la modification.");
        }
        updateConfirmModal.style.display = "none";
        document.body.style.overflow = "";
    });
}

// ==== Envoi Email confirmation (frontend vers backend) ====
async function sendConfirmationEmail(type, toEmail) {
    let subject = "";
    let htmlContent = "";
    if(type === "delete") {
        subject = "Suppression de votre compte Loto Analyzer";
        htmlContent = `
        <div style="background:linear-gradient(90deg,#0b3aa3,#1b56e0);padding:24px;border-radius:18px;color:white;font-family:Inter,Arial,sans-serif;">
            <h2 style="margin-top:0;color:#ff3b3b;">Votre compte a été supprimé</h2>
            <p>Bonjour,<br>Votre compte sur <b>Loto Analyzer Ultimate</b> vient d'être supprimé à votre demande.<br>
            Toutes vos données ont été effacées.<br><br>
            Merci d'avoir utilisé notre logiciel.<br>
            <span style="color:#ffe066;">FDJ Ultimate</span>
            </p>
        </div>
        `;
    } else if(type === "update") {
        subject = "Modification de votre compte Loto Analyzer";
        htmlContent = `
        <div style="background:linear-gradient(90deg,#0b3aa3,#1b56e0);padding:24px;border-radius:18px;color:white;font-family:Inter,Arial,sans-serif;">
            <h2 style="margin-top:0;color:#1b56e0;">Modification de vos informations</h2>
            <p>Bonjour,<br>Les informations de votre compte <b>Loto Analyzer Ultimate</b> ont été modifiées.<br>
            Si vous n'êtes pas à l'origine de ce changement, contactez immédiatement le support.<br><br>
            Merci de votre confiance.<br>
            <span style="color:#ffe066;">FDJ Ultimate</span>
            </p>
        </div>
        `;
    }
    await fetch("userinfo.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sendConfirmationEmail", to: toEmail, subject, html: htmlContent })
    });
}

// ==== Affichage date inscription / dernière connexion ====
async function loadUserInfo(){
    const token = getUserToken();
    if(!token){ redirectToExpired(); return; }
    saveUserToken(token);
    try{
        const res = await fetch("userinfo.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action:"getUserInfo", token })
        });
        const data = await res.json();
        if(!data.success){
            clearUserToken();
            redirectToExpired();
            return;
        }
        // AJOUT : Nettoyage du flag si tout est ok
        sessionStorage.removeItem("expiredRedirect");

        if (accEmail) accEmail.value = data.email || "";
        if (accBirth) accBirth.value = data.birthdate || "";
        if (userAvatarImg && data.avatarUrl) userAvatarImg.src = data.avatarUrl;
        if (lastLoginEl) lastLoginEl.textContent = data.lastLogin || "-";
        if (signupDateEl) signupDateEl.textContent = data.signupDate || "-";
        // Ajout : avatar sur le bouton utilisateur
        updateUserBtnAvatar(data.avatarUrl, data.email);
    } catch(err){ console.error(err); redirectToExpired(); }
}

// Correction du listener pageshow :
window.addEventListener('pageshow', function(event) {
    if (!getUserToken()) {
        redirectToExpired();
    }
});
// ==== Loader & RNG ====
function showLoader(on=true){ overlay.style.display = on ? 'flex' : 'none'; }
function xmur3(str){ let h=1779033703^str.length; for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=(h<<13)|(h>>>19);} return function(){h=Math.imul(h^(h>>>16),2246822507); h=Math.imul(h^(h>>>13),3266489909); return (h^(h>>>16))>>>0;} }
function mulberry32(a){ return function(){ var t=a+=0x6D2B79F5; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; } }
function rngFromSeed(seed){ if(!seed) return Math.random; return mulberry32(xmur3(seed)()); }

// ==== Parse date robuste ====
function parseDate(str){
    if(!str) return null;
    if(/^\d{4}-\d{2}-\d{2}/.test(str)) return new Date(str);
    if(/^\d{2}\/\d{2}\/\d{4}/.test(str)){
        const [d,m,y]=str.split('/'); return new Date(`${y}-${m}-${d}`);
    }
    return null;
}

// ==== Import CSV ====
fakeFileBtn.addEventListener('click',()=>fileInput.click());
fileInput.addEventListener('change', e=>{
    const file = e.target.files[0]; if(!file) return;
    showLoader();
    Papa.parse(file, { header:true, skipEmptyLines:true, complete: function(res){
        draws = res.data.map(r=>{
            const dateObj = parseDate(r.date_de_tirage);
            return { nums:[+r.boule_1,+r.boule_2,+r.boule_3,+r.boule_4,+r.boule_5], chance:+r.numero_chance, date:r.date_de_tirage, dateObj };
        });
        draws.sort((a,b)=>(b.dateObj||0)-(a.dateObj||0));
        drawCount.innerText = draws.length+' tirages';
        populateYearFilter();
        analyzeStats();
        applyFilters();
        adjustSliders();
        showLoader(false);
    }});
});

// ==== Curseurs auto ====
function adjustSliders(){
    ['wFreq','wGap','wPairs'].forEach(id=>{
        const s=document.getElementById(id);
        if(s){ s.min=0; s.max=100; s.value=50; }
    });
}

// ==== Filtres ====
function populateYearFilter(){
    const years = [...new Set(draws.map(d=>d.dateObj?d.dateObj.getFullYear():null).filter(y=>y!==null))].sort((a,b)=>b-a);
    yearFilter.innerHTML = '<option value="all">Toutes les années</option>';
    years.forEach(y=>{
        const opt=document.createElement('option'); opt.value=y; opt.innerText=y;
        yearFilter.appendChild(opt);
    });
}

function applyFilters(){
    const year = yearFilter.value;
    filteredDraws = draws.filter(d=>{ const y=d.dateObj?d.dateObj.getFullYear():NaN; return !isNaN(y) && (year==='all'||y==year); });
    const n = drawFilter.value==='all' ? filteredDraws.length : +drawFilter.value;
    currentShown = Math.min(n, filteredDraws.length);
    renderDraws();
}

drawFilter.addEventListener('change',applyFilters);
yearFilter.addEventListener('change',applyFilters);

// ==== Stats & Charts ====
let filteredDraws = [];
function analyzeStats(){
    stats = { freq:Array(50).fill(0), lastDraw:Array(50).fill(-1) };
    draws.forEach((d,i)=>{
        d.nums.forEach(n=>{
            stats.freq[n]++;
            stats.lastDraw[n] = i;
        });
    });
    renderCharts();
}

function renderCharts(){
    const ctxF = document.getElementById('chartFreq').getContext('2d');
    const ctxG = document.getElementById('chartGap').getContext('2d');
    const labels = Array.from({length:49},(_,i)=>i+1);
    if(chartFreq) chartFreq.destroy();
    if(chartGap) chartGap.destroy();
    chartFreq = new Chart(ctxF, { type:'bar', data:{labels,datasets:[{label:'Fréquence',data:stats.freq.slice(1),backgroundColor:'#1b56e0'}]}, options:{plugins:{legend:{display:false}}} });
    chartGap = new Chart(ctxG, { type:'bar', data:{labels,datasets:[{label:'Retard',data:stats.lastDraw.slice(1).map(v=>v>=0?draws.length-v:0),backgroundColor:'#ff3b3b'}]}, options:{plugins:{legend:{display:false}}} });
}

// ==== Rendu tirages ====
function renderDraws(additional=0){
    if(!filteredDraws.length){ drawTableWrap.innerHTML='<div class="small">Aucun tirage disponible.</div>'; return; }
    if(additional>0) currentShown = Math.min(currentShown+additional,filteredDraws.length);
    drawTableWrap.innerHTML='';
    filteredDraws.slice(0,currentShown).forEach(d=>{
        const div = document.createElement('div'); div.className='combo';
        div.innerHTML=`<div class="balls">${d.nums.map(v=>`<div class="ball">${v}</div>`).join('')}<div class="ball chance">${d.chance}</div></div><div class="small">${d.date}</div>`;
        drawTableWrap.appendChild(div);
    });
}

// ==== Génération combinaisons ====
function categorize(num){ return Math.floor(num/10); }
function getPattern(nums){ const catCount={}; nums.forEach(n=>{ const c=categorize(n); catCount[c]=(catCount[c]||0)+1; }); return Object.values(catCount).sort((a,b)=>b-a).join(''); }
function patternBonus(pattern){ return (pattern==='2111'||pattern==='221')?10:0; }

function generateCombos(n=30, seed=''){
    if(draws.length===0){ alert("Veuillez importer CSV !"); return []; }
    const rng = rngFromSeed(seed);
    const wFreq = 0.5, wGap = 0.3, wPairs = 0.2;
    const combos = []; let maxScore=0;

    while(combos.length<n){
        const nums = new Set();
        while(nums.size<5) nums.add(Math.floor(rng()*49)+1);
        const chance = Math.floor(rng()*10)+1;
        const arr=[...nums].sort((a,b)=>a-b);
        let score=0;
        arr.forEach(num=>{
            const f = stats.freq[num]||0;
            const g = (stats.lastDraw[num]>=0 ? draws.length-stats.lastDraw[num]:0);
            score += f*wFreq + g*wGap;
        });
        let maxPairCount=0;
        for(let i=0;i<arr.length;i++) for(let j=i+1;j<arr.length;j++){
            maxPairCount=Math.max(maxPairCount,(draws.filter(d=>d.nums.includes(arr[i])&&d.nums.includes(arr[j])).length));
        }
        score+=maxPairCount*wPairs;
        const p=getPattern(arr); score+=patternBonus(p);
        if(score>maxScore) maxScore=score;
        combos.push({nums:arr,chance,score,pattern:p});
    }

    combos.forEach(c=>{ c.score=Math.round((c.score/maxScore)*100); });
    combos.sort((a,b)=>b.score-a.score);
    return combos;
}

// ==== Boutons Générer / Export ====
btnGenerate.addEventListener('click', ()=>{
    if(draws.length===0){ alert("Importer CSV d'abord."); return; }
    showLoader();
    setTimeout(()=>{
        const n = +document.getElementById('nCombos').value;
        const seed = document.getElementById('seed').value;
        const combos = generateCombos(n, seed);
        resultsEl.innerHTML=''; recommendationEl.innerHTML='';
        combos.forEach((c,i)=>{
            const div=document.createElement('div'); div.className='combo';
            div.innerHTML=`<div class="balls">${c.nums.map(v=>`<div class="ball">${v}</div>`).join('')}<div class="ball chance">${c.chance}</div></div><div class="small">Pattern:${c.pattern} • Score:${c.score.toFixed(1)}</div>`;
            if(i<5){
                div.classList.add('highlight');
                const chanceBall=div.querySelector('.ball.chance');
                if(chanceBall) chanceBall.classList.add('highlight-chance');
                recommendationEl.appendChild(div.cloneNode(true));
            }
            resultsEl.appendChild(div);
        });
        showLoader(false);
    },50);
});

btnExport.addEventListener('click', ()=>{
    if(resultsEl.children.length===0){ alert('Aucune combinaison à exporter'); return; }
    let csv='boule_1,boule_2,boule_3,boule_4,boule_5,chance,pattern,score\n';
    Array.from(resultsEl.children).forEach(c=>{
        const balls = [...c.querySelectorAll('.ball')].map(b=>b.innerText);
        const small = c.querySelector('.small').innerText;
        const [pattern,score] = small.replace('Pattern:','').split('• Score:');
        csv += balls.slice(0,5).join(',')+','+balls[5]+','+pattern.trim()+','+score.trim()+'\n';
    });
    const blob = new Blob([csv],{type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='combinaisons.csv'; a.click();
    URL.revokeObjectURL(url);
});

// ==== Tutoriel / aide / overlay ====
const helpBtn = document.getElementById('helpBtn');
const helpModal = document.getElementById('helpModal');
const closeModal = document.getElementById('closeModal');

if (helpBtn && helpModal && closeModal) {
    helpBtn.addEventListener('click', () => { helpModal.style.display = 'flex'; });
    closeModal.addEventListener('click', () => { helpModal.style.display = 'none'; });
    helpModal.addEventListener('click', (e) => { if(e.target === helpModal) helpModal.style.display = 'none'; });
}

// ==== Tutoriel Overlay complet avec surbrillance ====
const btnTutorial = document.getElementById('btnTutorial');
const tutorialOverlay = document.getElementById('tutorialOverlay');
const tutorialClose = document.getElementById('tutorialClose');
const tutorialPrev = document.getElementById('tutorialPrev');
const tutorialNext = document.getElementById('tutorialNext');
const tutorialStepTitle = document.getElementById('tutorialStepTitle');
const tutorialStepText = document.getElementById('tutorialStepText');

const tutorialSteps = [
  {title:'Bienvenue',text:'Bienvenue sur Loto Analyzer Ultimate ! Ce tutoriel te guidera étape par étape.',highlight:null},
  {title:'Importer CSV',text:'Clique sur "Importer CSV" pour charger l’historique officiel des tirages FDJ.',highlight:'#fakeFileBtn'},
  {title:'Générer des combinaisons',text:'Après l’import, clique sur "Générer" pour créer des combinaisons optimisées selon les critères.',highlight:'#btnGenerate'},
  {title:'Exporter CSV',text:'Tu peux exporter tes combinaisons générées avec ce bouton.',highlight:'#btnExport'},
  {title:'Paramètres rapides',text:'Ajuste le nombre de combinaisons et la seed pour contrôler la génération.',highlight:'#nCombos'},
  {title:'Poids critères',text:'Les sliders permettent de donner plus ou moins d’importance à chaque critère.',highlight:'#wFreq'},
  {title:'Derniers tirages',text:'Cette section affiche les tirages extraits depuis ton CSV.',highlight:'#drawTableWrap'},
  {title:'Filtres tirages',text:'Filtre les tirages par nombre ou par année.',highlight:'#drawFilter'},
  {title:'Stats graphiques',text:'Visualise la fréquence et le retard des numéros sur ces graphiques.',highlight:'#chartFreq'},
  {title:'Recommandations & Top',text:'Les meilleures combinaisons sont affichées ici avec mise en avant des 5 top scores.',highlight:'#recommendation'},
  {title:'Combinaisons générées',text:'Toutes les combinaisons générées apparaissent ici.',highlight:'#results'},
  {title:'Fin du tutoriel',text:'Tu as terminé le tutoriel ! Amuse-toi bien à analyser les tirages et générer tes combinaisons.',highlight:null}
];

let tutorialIndex = 0;
let previousHighlight = null;

function showTutorialStep(index){
  tutorialIndex = index;
  const step = tutorialSteps[tutorialIndex];
  tutorialStepTitle.innerText = step.title;
  tutorialStepText.innerText = step.text;

  if(previousHighlight) previousHighlight.classList.remove('tut-highlight');
  if(step.highlight){
    const elem = document.querySelector(step.highlight);
    if(elem){
      elem.classList.add('tut-highlight');
      previousHighlight = elem;
      elem.scrollIntoView({behavior:'smooth', block:'center'});
    }
  } else previousHighlight=null;

  tutorialOverlay.style.display='flex';
}

if (btnTutorial && tutorialOverlay && tutorialClose && tutorialPrev && tutorialNext) {
    btnTutorial.addEventListener('click',()=>showTutorialStep(0));
    tutorialClose.addEventListener('click',()=>{
      tutorialOverlay.style.display='none';
      if(previousHighlight) previousHighlight.classList.remove('tut-highlight');
    });
    tutorialPrev.addEventListener('click',()=>{if(tutorialIndex>0) showTutorialStep(tutorialIndex-1);});
    tutorialNext.addEventListener('click',()=>{
      if(tutorialIndex<tutorialSteps.length-1) showTutorialStep(tutorialIndex+1);
      else {tutorialOverlay.style.display='none'; if(previousHighlight) previousHighlight.classList.remove('tut-highlight');}
    });
}

// ==== Initialisation ====
window.addEventListener('DOMContentLoaded',()=>{loadUserInfo();});
