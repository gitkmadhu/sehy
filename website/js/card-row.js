/**
 * Shared neomorphic card + horizontally-scrollable card row, used by the
 * home page's sections and the category page's Markets list. See the
 * .neo-card / .neo-card-row rules in style.css.
 */

const NEO_CARD_PALETTE = [
  { text: 'text-amber-600' },
  { text: 'text-sky-600' },
  { text: 'text-emerald-600' },
  { text: 'text-rose-600' },
  { text: 'text-purple-600' },
  { text: 'text-cyan-600' },
  { text: 'text-pink-600' },
  { text: 'text-orange-600' },
  { text: 'text-lime-700' },
  { text: 'text-blue-600' },
];

function neoCardColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return NEO_CARD_PALETTE[hash % NEO_CARD_PALETTE.length];
}

/**
 * A neomorphic card: a real photo if given (imageUrl), otherwise iconHtml
 * (e.g. an emoji, for things like units/markets that rarely have a photo
 * uploaded), otherwise the title's first letter.
 */
function neoCardHtml({ href, title, subtitle, imageUrl, iconHtml }) {
  const color = neoCardColor(title);
  const avatar = imageUrl
    ? `<img src="${escapeHtml(imageUrl)}" alt="" class="neo-avatar-img w-16 h-16 object-cover mb-4" />`
    : iconHtml
    ? `<div class="neo-avatar w-16 h-16 flex items-center justify-center text-2xl mb-4">${iconHtml}</div>`
    : `<div class="neo-avatar w-16 h-16 flex items-center justify-center text-xl font-bold ${color.text} mb-4">${escapeHtml(title.charAt(0).toUpperCase())}</div>`;
  return `
    <a href="${href}" class="neo-card p-5 flex flex-col items-center text-center group">
      ${avatar}
      <h4 class="font-bold text-gray-700 group-hover:text-[#0155ce] text-sm transition">${escapeHtml(title)}</h4>
      <p class="text-xs text-gray-500 mt-1">${escapeHtml(subtitle || '')}</p>
    </a>`;
}

/** The wrap+prev+row+next markup for one horizontally-scrollable row of cards (already-built card HTML strings). */
function cardRowSectionHtml(rowId, cardsHtml) {
  return `
    <div class="neo-card-row-wrap">
      <button type="button" class="neo-card-row-btn prev" data-scroll="-1" aria-label="Scroll left" disabled>&#8249;</button>
      <div class="neo-card-row" id="${rowId}">${cardsHtml.join('')}</div>
      <button type="button" class="neo-card-row-btn next" data-scroll="1" aria-label="Scroll right">&#8250;</button>
    </div>`;
}

/**
 * Prev/next buttons for every card row currently in the page: scroll by
 * roughly one screenful, and hide either button once its end of the row is
 * reached. Call again after re-rendering any row (e.g. after a search
 * filter redraws it).
 */
function wireCardRowButtons() {
  document.querySelectorAll('.neo-card-row-wrap').forEach((wrapEl) => {
    const row = wrapEl.querySelector('.neo-card-row');
    const prevBtn = wrapEl.querySelector('.neo-card-row-btn.prev');
    const nextBtn = wrapEl.querySelector('.neo-card-row-btn.next');
    if (!row || !prevBtn || !nextBtn) return;
    const update = () => {
      prevBtn.disabled = row.scrollLeft <= 4;
      nextBtn.disabled = row.scrollLeft >= row.scrollWidth - row.clientWidth - 4;
    };
    prevBtn.addEventListener('click', () => row.scrollBy({ left: -row.clientWidth * 0.8, behavior: 'smooth' }));
    nextBtn.addEventListener('click', () => row.scrollBy({ left: row.clientWidth * 0.8, behavior: 'smooth' }));
    row.addEventListener('scroll', update, { passive: true });
    update();
  });
}
