const SCHOOL = {
  name: "Golden Star International School",
  tagline: "Knowledge is power",
  address: "530100",
  phones: ["+254 798 176 687", "+254 111 316 354"],
  email: "goldenstarinternationalschool4@gmail.com",
  logo: "/assets/logo.jpg"
};

// ---------- tiny fetch helper ----------
async function api(path, options = {}) {
  const res = await fetch("/api" + path, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: "same-origin"
  });
  let data = {};
  try { data = await res.json(); } catch (e) { /* no body */ }
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// ---------- topbar ----------
function renderTopbar(containerId, roleLabel) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `
    <div class="topbar">
      <div class="brand">
        <img src="${SCHOOL.logo}" alt="logo">
        <div>
          <div class="name">${SCHOOL.name}</div>
          <div class="tagline">${SCHOOL.tagline}</div>
        </div>
      </div>
      <div class="topbar-right">
        <span class="role-pill">${roleLabel}</span>
        <button class="logout-btn" id="logoutBtn">Logout</button>
      </div>
    </div>`;
  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await api("/auth/logout", { method: "POST" });
    window.location.href = "/login.html";
  });
}

// ---------- footer ----------
function renderFooter(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `
    <footer class="site-footer">
      <div class="tagline">"${SCHOOL.tagline}"</div>
      <div>${SCHOOL.name} &middot; ${SCHOOL.address}</div>
      <div>${SCHOOL.phones.join(" | ")} &middot; <a href="mailto:${SCHOOL.email}">${SCHOOL.email}</a></div>
    </footer>`;
}

// ---------- guard: redirect to login if not authenticated with the right role ----------
async function requireRole(role) {
  try {
    const { user } = await api("/auth/me");
    if (user.role !== role) {
      window.location.href = "/login.html";
      return null;
    }
    return user;
  } catch (e) {
    window.location.href = "/login.html";
    return null;
  }
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
