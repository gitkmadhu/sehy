function renderHeader() {
  const el = document.getElementById('site-header');
  if (!el) return;
  el.innerHTML = `
    <header class="header">
      <div class="brand">
        <a href="/sehy_web/index.html">
          <span class="logo-badge">GL</span>
          <span class="title">GL<span class="accent">ML</span></span>
        </a>
      </div>
      <a class="profile-btn" href="/sehy_web/profile.html" title="Profile">&#128100;</a>
    </header>
  `;
}

document.addEventListener('DOMContentLoaded', renderHeader);
