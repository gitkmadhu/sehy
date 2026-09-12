const offerId = qs('id');

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

async function init() {
  const content = document.getElementById('content');
  try {
    const { offer } = await api.get('/offers/get.php', { id: offerId });
    document.title = `${offer.title} - GLML`;

    const priceRow =
      offer.discounted_price != null
        ? `<span style="font-size:22px;font-weight:700;color:var(--primary);">${formatCurrency(offer.discounted_price)}</span>
           ${offer.original_price != null ? `<span style="margin-left:8px;text-decoration:line-through;color:var(--text-muted);">${formatCurrency(offer.original_price)}</span>` : ''}`
        : '';

    const mapBtn =
      offer.store_latitude && offer.store_longitude
        ? `<a class="btn outline" href="https://www.google.com/maps/search/?api=1&query=${offer.store_latitude},${offer.store_longitude}" target="_blank" rel="noopener">View store on map</a>`
        : '';

    content.innerHTML = `
      <a class="back-link" href="javascript:history.back()">&larr; Back</a>
      <div class="card">
        ${offer.image_url ? `<img src="${escapeHtml(offer.image_url)}" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:12px;margin-bottom:16px;" alt="" />` : ''}
        <div class="sub" style="color:var(--text-muted);">${escapeHtml(offer.store_name || '')}</div>
        <div class="top-title" style="margin:4px 0 12px;">${escapeHtml(offer.title)}</div>
        <div>${priceRow}</div>
        <div class="sub" style="color:var(--text-muted);margin-top:8px;">Expires ${formatDate(offer.expires_at)}</div>
        ${offer.description ? `<hr style="border:none;border-top:1px solid var(--border);margin:20px 0;" /><div class="section-title" style="margin-top:0;">Details</div><p>${escapeHtml(offer.description)}</p>` : ''}
        ${mapBtn ? `<div style="margin-top:12px;">${mapBtn}</div>` : ''}
      </div>
    `;
  } catch (e) {
    content.innerHTML = `<div class="empty-state">${escapeHtml(e.message)}</div>`;
  }
}

init();
