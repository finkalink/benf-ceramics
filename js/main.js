(function () {
  const grid = document.getElementById("product-grid");
  const filtersEl = document.querySelector(".filters");
  const dialog = document.getElementById("product-dialog");
  const dialogBody = dialog.querySelector(".dialog-body");

  const money = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: SHOP.currency,
    maximumFractionDigits: 0,
  });

  let activeCategory = "All";

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
  }

  function imageHtml(p) {
    if (p.image) {
      return `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy">`;
    }
    return `<div class="placeholder" style="--glaze:${escapeHtml(p.glaze)}" role="img" aria-label="${escapeHtml(p.name)}"></div>`;
  }

  function renderFilters() {
    const categories = ["All", ...new Set(PRODUCTS.map((p) => p.category))];
    filtersEl.innerHTML = categories
      .map((c) => `<button type="button" data-category="${escapeHtml(c)}" aria-pressed="${c === activeCategory}">${escapeHtml(c)}</button>`)
      .join("");
  }

  function renderGrid() {
    const items = PRODUCTS.filter((p) => activeCategory === "All" || p.category === activeCategory);
    // Available pieces first, sold pieces after
    items.sort((a, b) => (a.status === "sold") - (b.status === "sold"));

    grid.innerHTML = items.map((p) => {
      const sold = p.status === "sold";
      return `
        <button type="button" class="product-card${sold ? " is-sold" : ""}" data-id="${escapeHtml(p.id)}">
          <div class="thumb">
            ${imageHtml(p)}
            ${sold ? '<span class="badge">Sold</span>' : ""}
          </div>
          <div class="meta">
            <span class="name">${escapeHtml(p.name)}</span>
            <span class="price">${sold ? "Sold" : money.format(p.price)}</span>
          </div>
        </button>`;
    }).join("");
  }

  function inquiryLink(p) {
    const subject = `Inquiry: ${p.name}`;
    const body = `Hi! I'm interested in purchasing the "${p.name}" (${money.format(p.price)}).\n\n`;
    return `mailto:${SHOP.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function openProduct(id) {
    const p = PRODUCTS.find((x) => x.id === id);
    if (!p) return;
    const sold = p.status === "sold";

    dialogBody.innerHTML = `
      <div class="thumb">${imageHtml(p)}</div>
      <div class="dialog-info">
        <p class="eyebrow">${escapeHtml(p.category)}</p>
        <h2>${escapeHtml(p.name)}</h2>
        <p class="price">${sold ? "Sold" : money.format(p.price)}</p>
        <p>${escapeHtml(p.description)}</p>
        <dl>
          ${p.dimensions ? `<dt>Size</dt><dd>${escapeHtml(p.dimensions)}</dd>` : ""}
          ${p.clay ? `<dt>Clay</dt><dd>${escapeHtml(p.clay)}</dd>` : ""}
          ${p.glazeName ? `<dt>Glaze</dt><dd>${escapeHtml(p.glazeName)}</dd>` : ""}
        </dl>
        ${sold
          ? '<button class="button" disabled>Sold</button>'
          : `<a class="button" href="${inquiryLink(p)}">Inquire to purchase</a>`}
      </div>`;

    dialog.showModal();
    history.replaceState(null, "", `#piece-${p.id}`);
  }

  // Events
  filtersEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-category]");
    if (!btn) return;
    activeCategory = btn.dataset.category;
    renderFilters();
    renderGrid();
  });

  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".product-card");
    if (card) openProduct(card.dataset.id);
  });

  dialog.addEventListener("click", (e) => {
    // close on X button or on backdrop click
    if (e.target.matches("[data-close]") || e.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    history.replaceState(null, "", location.pathname + location.search);
  });

  // Init
  document.title = `${SHOP.name} — Handmade Ceramics`;
  document.getElementById("year").textContent = new Date().getFullYear();
  document.getElementById("contact-email").href = `mailto:${SHOP.email}`;
  renderFilters();
  renderGrid();

  // Support direct links like index.html#piece-speckled-mug
  const match = location.hash.match(/^#piece-(.+)$/);
  if (match) openProduct(match[1]);
})();
