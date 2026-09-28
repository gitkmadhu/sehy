function renderHeader() {
  const el = document.getElementById('site-header');
  if (!el) return;
  el.innerHTML = `
    <header class="header">
      <div class="brand">
        <a href="/sehy_web/index.html">
          <span class="logo-badge">SE</span>
          <span class="title">SE<span class="accent">HY</span></span>
        </a>
      </div>
      <a class="profile-btn" href="/sehy_web/profile.html" title="Profile">&#128100;</a>
    </header>
  `;
}

/**
 * Breadcrumb trail ("Home › Category › Unit › Shop"). $items is a list of
 * { label, href? }; an item without an href is the current page. Rendered
 * right under the site header, or into $target when given (e.g. the admin
 * page's top bar). Pages with data-driven trails call this again once their
 * data has loaded.
 */
const BREADCRUMB_CSS = `
a[href], button:not(:disabled), select, summary, [role="button"] { cursor: pointer; }
.breadcrumbs { max-width: 960px; margin: 0 auto; padding: 12px 16px 0; font-size: 13px; color: var(--text-muted, #6b5a58); }
.breadcrumbs ol { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.breadcrumbs li + li::before { content: "\\203A"; margin-right: 6px; opacity: .6; }
.breadcrumbs a { color: var(--primary, #0155ce); text-decoration: none; }
.breadcrumbs a:hover { text-decoration: underline; }
.breadcrumbs [aria-current] { color: var(--text, #241615); font-weight: 600; }
.breadcrumbs.breadcrumbs-inline { max-width: none; padding: 0 0 6px; }`;

function crumbEscape(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function setBreadcrumbs(items, target) {
  if (!document.getElementById('breadcrumb-styles')) {
    const style = document.createElement('style');
    style.id = 'breadcrumb-styles';
    style.textContent = BREADCRUMB_CSS;
    document.head.appendChild(style);
  }
  let nav = target || document.getElementById('breadcrumbs');
  if (!nav) {
    // Pages with their own header (the dashboards) have no #site-header — use their <header>.
    const header = document.getElementById('site-header') || document.querySelector('body > header, header');
    if (!header) return;
    nav = document.createElement('nav');
    nav.id = 'breadcrumbs';
    header.insertAdjacentElement('afterend', nav);
  }
  nav.className = 'breadcrumbs' + (target ? ' breadcrumbs-inline' : '');
  nav.setAttribute('aria-label', 'Breadcrumb');
  const trail = [{ label: 'Home', href: '/sehy_web/index.html' }, ...items];
  nav.innerHTML =
    '<ol>' +
    trail
      .map((it, i) =>
        i === trail.length - 1 || !it.href
          ? `<li aria-current="page">${crumbEscape(it.label)}</li>`
          : `<li><a href="${crumbEscape(it.href)}">${crumbEscape(it.label)}</a></li>`
      )
      .join('') +
    '</ol>';
}

// Fixed trails for the pages whose position never changes. Data-driven pages
// (category, unit, shop, offer) and the admin page set their own.
const STATIC_CRUMBS = {
  'login.html': [{ label: 'Sign in' }],
  'register.html': [{ label: 'Create account' }],
  'contact.html': [{ label: 'Contact us' }],
  'profile.html': [{ label: 'Profile' }],
  'my-service.html': [{ label: 'Profile', href: '/sehy_web/profile.html' }, { label: 'My Service' }],
  'my-unit.html': [{ label: 'Profile', href: '/sehy_web/profile.html' }, { label: 'My Unit' }],
  'my-category-ads.html': [{ label: 'Profile', href: '/sehy_web/profile.html' }, { label: 'My Category Ads' }],
  'manager-dashboard.html': [{ label: 'Profile', href: '/sehy_web/profile.html' }, { label: 'Category Manager Dashboard' }],
  'staff-dashboard.html': [{ label: 'Profile', href: '/sehy_web/profile.html' }, { label: 'Service Staff Portal' }],
};

document.addEventListener('DOMContentLoaded', () => {
  renderHeader();
  const page = window.location.pathname.split('/').pop();
  if (STATIC_CRUMBS[page]) setBreadcrumbs(STATIC_CRUMBS[page]);
});
