/**
 * A dropdown-with-checkboxes for picking which of a category's catalog
 * products (see products/list.php, admin-managed) a store carries. Used on
 * register.html (signup) and my-service.html (Add a service) — call
 * setCategory() whenever the chosen category changes, and getSelected() at
 * submit time for the product_ids[] field.
 */
function createProductPicker(toggleEl, panelEl) {
  let allProducts = [];
  let selected = new Set();

  function summaryText() {
    if (!allProducts.length) return 'No products listed for this category yet';
    if (!selected.size) return 'Select products...';
    return `${selected.size} product${selected.size === 1 ? '' : 's'} selected`;
  }

  function render() {
    panelEl.innerHTML = allProducts
      .map(
        (p) => `
      <label style="display:flex;align-items:center;gap:8px;padding:6px 4px;font-weight:400;cursor:pointer;">
        <input type="checkbox" value="${p.id}" ${selected.has(p.id) ? 'checked' : ''} style="width:auto;padding:0;border:none;flex:0 0 auto;" />
        ${escapeHtml(p.name)}
      </label>`
      )
      .join('');
    panelEl.querySelectorAll('input[type=checkbox]').forEach((cb) => {
      cb.addEventListener('change', () => {
        const id = Number(cb.value);
        if (cb.checked) selected.add(id);
        else selected.delete(id);
        toggleEl.textContent = summaryText();
      });
    });
    toggleEl.textContent = summaryText();
  }

  toggleEl.addEventListener('click', () => {
    if (toggleEl.disabled) return;
    panelEl.style.display = panelEl.style.display === 'none' ? 'block' : 'none';
  });
  document.addEventListener('click', (e) => {
    if (!toggleEl.contains(e.target) && !panelEl.contains(e.target)) panelEl.style.display = 'none';
  });

  return {
    async setCategory(categoryId, preselectedIds) {
      selected = new Set((preselectedIds || []).map(Number));
      panelEl.style.display = 'none';
      if (!categoryId) {
        allProducts = [];
        toggleEl.disabled = true;
        toggleEl.textContent = 'Select a category first';
        panelEl.innerHTML = '';
        return;
      }
      toggleEl.disabled = false;
      toggleEl.textContent = 'Loading products...';
      try {
        ({ products: allProducts } = await api.get('/products/list.php', { category_id: categoryId }));
      } catch (e) {
        allProducts = [];
      }
      render();
    },
    getSelected() {
      return [...selected];
    },
  };
}
