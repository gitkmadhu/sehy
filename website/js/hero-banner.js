/**
 * "Category page hero banner" panel, shared by the unit and service (sub-unit)
 * manager pages: shows the paid banner-plan status, lets the manager buy a plan
 * (Razorpay, via payWithRazorpay in payments.js), then upload a banner with an
 * optional click-through link (a site path or an external URL) and remove the
 * banners they've posted. Uploads go to category_ads/create.php, which enforces
 * the paid window server-side.
 *
 * opts: { purpose: 'unit_subscription' | 'service_subscription', serviceId?,
 *         subjectName, categoryName, categoryId, expiresAt, canPay, ads, reload }
 */
async function renderHeroBannerPanel(container, opts) {
  const active = opts.expiresAt && new Date(opts.expiresAt.replace(' ', 'T')).getTime() > Date.now();
  let plans = [];
  if (opts.canPay) {
    try {
      ({ rate_cards: plans } = await api.get('/rate_cards/list.php', { tier: 'category_subscription' }));
    } catch (e) {
      plans = [];
    }
  }
  const status = active
    ? `<span class="chip">Active until ${escapeHtml(new Date(opts.expiresAt.replace(' ', 'T')).toLocaleString())}</span>`
    : `<span class="chip" style="background:#fdecea;color:#c0392b;">${opts.expiresAt ? 'Plan expired' : 'No active plan'}</span>`;

  container.innerHTML = `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
        <div style="font-weight:600;">${escapeHtml(opts.subjectName)} &rarr; ${escapeHtml(opts.categoryName)} page</div>
        ${status}
      </div>
      <p style="font-size:13px;color:var(--text-muted);margin:8px 0;">
        The hero banner sits at the top of the <b>${escapeHtml(opts.categoryName)}</b> category page.
        ${opts.canPay ? 'Pay for a plan to upload banners; each plan keeps the upload option open for its duration.' : 'Your manager pays for the plan; once it is active you can upload.'}
      </p>
      ${
        opts.canPay && plans.length
          ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">${plans
              .map(
                (p) => `<button class="btn outline" type="button" data-hero-plan="${escapeHtml(p.plan_key)}" data-plan-label="${escapeHtml(p.label)}">${escapeHtml(p.label)} — &#8377;${(p.amount / 100).toLocaleString('en-IN')}</button>`
              )
              .join('')}</div>`
          : ''
      }
      <div class="error-text hero-error" style="display:none;"></div>
      <form class="hero-form">
        <div class="form-field"><label>Banner image</label><input type="file" name="image" accept="image/*" required ${active ? '' : 'disabled'} /></div>
        <div class="form-field">
          <label>Click-through link (optional)</label>
          <input type="text" name="link_url" placeholder="https://example.com or /sehy_web/unit.html?id=1" ${active ? '' : 'disabled'} />
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">Use a full https:// address for an external site, or a path starting with / for a page on this site.</div>
        </div>
        <button class="btn" type="submit" ${active ? '' : 'disabled'}>Upload hero banner</button>
      </form>
      <div class="hero-list" style="margin-top:12px;">
        ${
          opts.ads.length
            ? opts.ads
                .map(
                  (a) => `
        <div class="admin-item">
          <img class="thumb" src="${escapeHtml(a.image_url)}" alt="" />
          <div class="info"><div class="sub" style="color:var(--text-muted);">${escapeHtml(a.link_url || 'No link')}</div></div>
          <button class="btn danger" type="button" data-hero-delete="${a.id}">Delete</button>
        </div>`
                )
                .join('')
            : '<div class="empty-state">No hero banners uploaded yet</div>'
        }
      </div>
    </div>`;

  const errEl = container.querySelector('.hero-error');
  const showError = (msg) => {
    errEl.textContent = msg;
    errEl.style.display = 'block';
  };

  container.querySelectorAll('[data-hero-plan]').forEach((btn) => {
    const label = btn.textContent;
    btn.addEventListener('click', async () => {
      errEl.style.display = 'none';
      btn.disabled = true;
      btn.textContent = 'Opening payment...';
      try {
        await payWithRazorpay({
          purpose: opts.purpose,
          serviceId: opts.serviceId,
          plan: btn.dataset.heroPlan,
          description: `${btn.dataset.planLabel} hero banner plan for ${opts.subjectName}`,
        });
        opts.reload();
      } catch (e) {
        showError(e.message);
        btn.disabled = false;
        btn.textContent = label;
      }
    });
  });

  container.querySelector('.hero-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.style.display = 'none';
    const fd = new FormData(e.target);
    if (opts.serviceId != null) fd.set('service_id', opts.serviceId);
    try {
      await api.postForm('/category_ads/create.php', fd);
      opts.reload();
    } catch (err) {
      showError(err.message);
    }
  });

  container.querySelectorAll('[data-hero-delete]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!window.confirm('Delete this hero banner?')) return;
      try {
        await api.del('/category_ads/delete.php', { id: Number(btn.dataset.heroDelete) });
        opts.reload();
      } catch (err) {
        showError(err.message);
      }
    });
  });
}
