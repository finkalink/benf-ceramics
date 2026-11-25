(() => {
  "use strict";

  /* ---------------- Helpers ---------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: SHOP.currency, maximumFractionDigits: 0 });
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const byNo = (no) => PRODUCTS.find((p) => p.no === no);

  const ICON_CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  const ICON_ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16" style="fill:none;stroke:currentColor;stroke-width:1.5"><path d="M7 17 17 7M9 7h8v8"/></svg>';

  /* ---------------- Local claims (this browser only) ---------------- */
  const CLAIM_KEY = "benf-claims";
  function readClaims() {
    try { return JSON.parse(localStorage.getItem(CLAIM_KEY)) || {}; } catch { return {}; }
  }
  function saveClaim(no, type) {
    const all = readClaims();
    all[no] = { type, at: Date.now() };
    try { localStorage.setItem(CLAIM_KEY, JSON.stringify(all)); } catch { /* private mode: fine */ }
  }

  // available | reserved | sold | held-you | yours
  function statusOf(p) {
    if (p.status && p.status !== "available") return p.status;
    const c = readClaims()[p.no];
    if (c) return c.type === "purchased" ? "yours" : "held-you";
    return "available";
  }
  const STATUS_TEXT = { available: "Available", reserved: "On hold", sold: "Sold", "held-you": "Held for you", yours: "Yours" };
  const isAvailable = (p) => statusOf(p) === "available";

  /* ---------------- Artwork ---------------- */
  function art(p, opts = {}) {
    if (p.image) {
      return `<img src="${esc(p.image)}" alt="${esc(p.name)}, ${esc(p.glaze)} glaze" loading="${opts.eager ? "eager" : "lazy"}" decoding="async">`;
    }
    return Pottery.svg(p, { ...opts, label: `${p.name}, ${p.glaze} glaze` });
  }

  function card(p, i = 0, opts = {}) {
    const st = statusOf(p);
    const unavailable = st !== "available";
    const badge = unavailable
      ? `<span class="status${st === "reserved" || st === "held-you" ? " status--reserved" : ""}">${STATUS_TEXT[st]}</span>`
      : "";
    return `
      <button type="button" class="piece reveal${unavailable ? " is-unavailable" : ""}" data-no="${esc(p.no)}" style="--d:${(i % 4) * 0.06}s"
        aria-label="${esc(p.name)}, ${unavailable ? STATUS_TEXT[st] : money.format(p.price)}. View piece">
        <div class="piece__frame">
          ${art(p, opts)}
          ${badge}
          <span class="piece__view" aria-hidden="true">View piece</span>
        </div>
        <div class="wall-label">
          <span class="wall-label__no">No. ${esc(p.no)} · ${esc(p.year)}</span>
          <span class="wall-label__name">${esc(p.name)}</span>
          <span class="wall-label__price">${unavailable ? STATUS_TEXT[st] : money.format(p.price)}</span>
          <span class="wall-label__meta">${esc(p.clay)}, ${esc(p.glaze.toLowerCase())} glaze</span>
        </div>
      </button>`;
  }

  /* ---------------- Hero ---------------- */
  function renderHero() {
    const p = byNo(SHOP.heroPiece) || PRODUCTS[0];
    const st = statusOf(p);
    $("#hero-art").innerHTML = `
      <button type="button" data-no="${esc(p.no)}" aria-label="View ${esc(p.name)}">
        <div class="hero__frame">${art(p, { eager: true, wall: "#FBF8F3", floor: "#EDE4D8" })}</div>
        <figcaption class="hero__caption">
          <em>${esc(p.name)}</em>
          <span>No. ${esc(p.no)} · ${st === "available" ? money.format(p.price) : STATUS_TEXT[st]}</span>
        </figcaption>
      </button>`;

    const n = PRODUCTS.filter(isAvailable).length;
    $("#hero-count").textContent = n ? `${n} piece${n === 1 ? "" : "s"} available now` : "New work coming soon";
  }

  /* ---------------- New from the kiln ---------------- */
  function renderNew() {
    const list = (SHOP.newPieces || []).map(byNo).filter(Boolean);
    $("#new-grid").innerHTML = list.map((p, i) => card(p, i)).join("");
  }

  /* ---------------- Collection ---------------- */
  const state = { category: "All", onlyAvailable: false };

  function visibleList() {
    return PRODUCTS
      .filter((p) => state.category === "All" || p.category === state.category)
      .filter((p) => !state.onlyAvailable || isAvailable(p))
      .sort((a, b) => (isAvailable(b) - isAvailable(a)) || b.no.localeCompare(a.no));
  }

  function renderFilters() {
    const cats = ["All", ...new Set(PRODUCTS.map((p) => p.category))];
    $("#filters").innerHTML = cats.map((c) => {
      const n = c === "All" ? PRODUCTS.length : PRODUCTS.filter((p) => p.category === c).length;
      return `<button type="button" data-category="${esc(c)}" aria-pressed="${c === state.category}">${esc(c)}<sup>${n}</sup></button>`;
    }).join("");
  }

  function renderGrid() {
    const list = visibleList();
    $("#grid").innerHTML = list.map((p, i) => card(p, i)).join("");
    $("#grid-empty").hidden = list.length > 0;
    observeReveals();
  }

  function renderAll() {
    renderHero();
    renderNew();
    renderFilters();
    renderGrid();
  }

  /* ---------------- Scroll reveal ---------------- */
  let revealer = null;
  function observeReveals() {
    const items = $$(".reveal:not(.is-in)");
    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-in"));
      return;
    }
    if (!revealer) {
      revealer = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            revealer.unobserve(e.target);
          }
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    }
    // Stagger loose items in the same section (cards already carry their own delay)
    items.forEach((el) => {
      if (!el.style.getPropertyValue("--d")) {
        const sibs = $$(":scope > .reveal, :scope > * > .reveal", el.closest("section, footer") || document.body);
        const idx = Math.max(0, sibs.indexOf(el));
        el.style.setProperty("--d", `${Math.min(idx, 5) * 0.07}s`);
      }
      revealer.observe(el);
    });
  }

  /* ---------------- Nav: solid after hero, active section ---------------- */
  function setupNav() {
    const nav = $("#nav");
    const hero = $(".hero");
    const onScroll = () => {
      const limit = hero.offsetHeight - nav.offsetHeight;
      nav.classList.toggle("is-solid", window.scrollY > limit);
      nav.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);

    const links = $$(".nav__links a");
    const sections = links.map((a) => document.getElementById(a.dataset.section)).filter(Boolean);
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            links.forEach((a) => a.classList.toggle("is-active", a.dataset.section === e.target.id));
          }
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      sections.forEach((s) => io.observe(s));
      // Clear when back in the hero / new section
      const clear = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) links.forEach((a) => a.classList.remove("is-active")); });
      }, { rootMargin: "-45% 0px -50% 0px" });
      [hero, $("#new")].forEach((s) => clear.observe(s));
    }
  }

  /* ---------------- Mobile menu ---------------- */
  function setupMenu() {
    const menu = $("#menu");
    const openBtn = $("#menu-open");
    const open = () => {
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add("is-open"));
      openBtn.setAttribute("aria-expanded", "true");
      document.body.classList.add("is-locked");
      $("#menu-close").focus();
    };
    const close = (focusBack = true) => {
      menu.classList.remove("is-open");
      openBtn.setAttribute("aria-expanded", "false");
      document.body.classList.remove("is-locked");
      setTimeout(() => { menu.hidden = true; }, reduceMotion ? 0 : 300);
      if (focusBack) openBtn.focus();
    };
    openBtn.addEventListener("click", open);
    $("#menu-close").addEventListener("click", () => close());
    $$("a", menu).forEach((a) => a.addEventListener("click", () => close(false)));
    addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) close(); });
  }

  /* ---------------- Piece view ("gallery room") ---------------- */
  const room = $("#room");
  const roomFrame = $("#room-frame");
  const roomContent = $("#room-content");
  let roomList = PRODUCTS;
  let roomIndex = 0;

  function current() { return roomList[roomIndex]; }

  function venmoUrl(p) {
    const note = `BEN F No. ${p.no} · ${p.name}`;
    return `https://venmo.com/?txn=pay&recipients=${encodeURIComponent(SHOP.venmo)}&amount=${p.price}&note=${encodeURIComponent(note)}`;
  }
  function mailto(subject, body = "") {
    return `mailto:${SHOP.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function detailsView(p) {
    const st = statusOf(p);
    let action;
    if (st === "available") {
      action = `<button type="button" class="btn btn--block" data-action="buy">Buy this piece · ${money.format(p.price)}</button>
        <p class="room__note">Pay on Venmo, then mark it reserved or purchased. Pickup is free, and I'll quote shipping by email.</p>`;
    } else if (st === "held-you" || st === "yours") {
      action = `<p class="room__note">You let me know about this one. I'll confirm with you directly.</p>
        ${st === "held-you" ? `<a class="btn btn--block" href="${venmoUrl(p)}" target="_blank" rel="noopener">Pay ${money.format(p.price)} on Venmo ${ICON_ARROW}</a>` : ""}`;
    } else if (st === "reserved") {
      action = `<a class="btn btn--ghost btn--block" href="${mailto(`Waitlist: No. ${p.no} ${p.name}`, `Hi Ben, if No. ${p.no} (${p.name}) frees up, I'd love it.\n\n`)}">Ask to be next in line</a>
        <p class="room__note">Someone has this on hold. Holds last 48 hours.</p>`;
    } else {
      action = `<a class="btn btn--ghost btn--block" href="${mailto(`Something like No. ${p.no}`, `Hi Ben, I loved the ${p.name}. Will you make another?\n\n`)}">Ask for one like it</a>`;
    }

    return `
      <p class="label label--accent">No. ${esc(p.no)} · ${esc(p.category)}</p>
      <h2 class="room__title" id="room-title">${esc(p.name)}</h2>
      <p class="room__price">${st === "available" ? money.format(p.price) : ""}<span class="pill pill--${st === "held-you" ? "reserved" : st === "yours" ? "sold" : st}">${STATUS_TEXT[st]}</span></p>
      <p class="room__desc">${esc(p.description)}</p>
      <dl class="specs">
        <dt>Clay</dt><dd>${esc(p.clay)}</dd>
        <dt>Glaze</dt><dd>${esc(p.glaze)}</dd>
        <dt>Size</dt><dd>${esc(p.size)}</dd>
        <dt>Made</dt><dd>${esc(p.year)}</dd>
      </dl>
      <div>${action}</div>`;
  }

  function buyView(p) {
    return `
      <button type="button" class="link buy__back" data-action="details">← Back to the piece</button>
      <p class="label label--accent">No. ${esc(p.no)} · ${money.format(p.price)}</p>
      <h2 class="room__title" id="room-title">${esc(p.name)}</h2>

      <div class="buy__step">
        <div class="buy__step-head"><span>1</span><h3>Pay on Venmo</h3></div>
        <a class="btn btn--block" href="${venmoUrl(p)}" target="_blank" rel="noopener" data-action="venmo">Pay ${money.format(p.price)} to @${esc(SHOP.venmo)} ${ICON_ARROW}</a>
        <p class="buy__hint">Opens Venmo with the amount and note filled in. Want it held first? Skip this and choose "Reserve" below.</p>
      </div>

      <div class="buy__step">
        <div class="buy__step-head"><span>2</span><h3>Let me know</h3></div>
        <form class="form" id="buy-form" novalidate>
          <fieldset class="choice-group">
            <legend>This piece is</legend>
            <label class="choice"><input type="radio" name="intent" value="purchased" required>
              <span><strong>Purchased</strong><small>I've paid on Venmo</small></span></label>
            <label class="choice"><input type="radio" name="intent" value="reserved">
              <span><strong>Reserved</strong><small>Hold it for me. I'll pay within 48 hours</small></span></label>
          </fieldset>

          <div class="field"><label for="f-name">Your name</label>
            <input id="f-name" name="name" autocomplete="name" required></div>
          <div class="field"><label for="f-contact">Email or phone</label>
            <input id="f-contact" name="contact" autocomplete="email" required></div>

          <fieldset class="choice-group">
            <legend>Getting it to you</legend>
            <div class="choice-row">
              <label class="choice"><input type="radio" name="delivery" value="Pickup" checked>
                <span><strong>Pickup</strong><small>Free</small></span></label>
              <label class="choice"><input type="radio" name="delivery" value="Shipping">
                <span><strong>Shipping</strong><small>I'll email a quote</small></span></label>
            </div>
          </fieldset>

          <div class="field" id="f-address-wrap" hidden><label for="f-address">Shipping address</label>
            <textarea id="f-address" name="address" autocomplete="street-address"></textarea></div>
          <div class="field"><label for="f-note">Note <span class="field__opt">(optional)</span></label>
            <textarea id="f-note" name="note" rows="2"></textarea></div>

          <div class="hp" aria-hidden="true"><label>Leave empty <input name="_honey" tabindex="-1" autocomplete="off"></label></div>
          <p class="form__error" id="form-error" role="alert" hidden></p>
          <button type="submit" class="btn btn--block" id="buy-submit">Send</button>
        </form>
      </div>`;
  }

  function thanksView(p, data) {
    const first = (data.name || "").trim().split(/\s+/)[0] || "friend";
    const reserved = data.intent === "reserved";
    return `
      <div class="thanks">
        <div class="thanks__mark">${ICON_CHECK}</div>
        <p class="label label--accent">No. ${esc(p.no)} · ${reserved ? "Reserved" : "Purchased"}</p>
        <h2 class="room__title" id="room-title">Thank you, ${esc(first)}.</h2>
        <p>${reserved
          ? `I'll hold the ${esc(p.name)} for 48 hours. Pay on Venmo whenever you're ready.`
          : `The ${esc(p.name)} is yours. I'll confirm ${data.delivery === "Shipping" ? "the shipping cost" : "a pickup time"} with you within a day.`}</p>
        ${reserved ? `<a class="btn btn--block" href="${venmoUrl(p)}" target="_blank" rel="noopener">Pay ${money.format(p.price)} on Venmo ${ICON_ARROW}</a>` : ""}
        <p class="room__note"><button type="button" class="link" data-action="close">Keep looking</button></p>
      </div>`;
  }

  function showView(html) {
    roomContent.innerHTML = html;
    $(".room__panel").scrollTop = 0;
  }

  function renderRoom(direction = 0) {
    const p = current();
    roomFrame.style.setProperty("--from", reduceMotion ? "0" : `${direction * 24}px`);
    roomFrame.innerHTML = art(p, { eager: true, wall: "#FBF8F3", floor: "#EFE7DC" });
    $("#room-count").textContent = `${roomIndex + 1} / ${roomList.length}`;
    showView(detailsView(p));
  }

  function openRoom(no, list) {
    roomList = list && list.length ? list : PRODUCTS;
    roomIndex = Math.max(0, roomList.findIndex((p) => p.no === no));
    if (!roomList[roomIndex] || roomList[roomIndex].no !== no) {
      roomList = PRODUCTS;
      roomIndex = Math.max(0, PRODUCTS.findIndex((p) => p.no === no));
    }
    renderRoom();
    const hash = `#piece-${current().no}`;
    if (!room.open) {
      room.showModal();
      document.body.classList.add("is-locked");
      if (location.hash !== hash) history.pushState({ room: true }, "", hash);
      $("#room-close").focus();
    } else {
      history.replaceState(history.state, "", hash);
    }
  }

  function step(dir) {
    if (roomList.length < 2) return;
    roomIndex = (roomIndex + dir + roomList.length) % roomList.length;
    renderRoom(dir);
    history.replaceState(history.state, "", `#piece-${current().no}`);
  }

  function finishClose() {
    if (room.open) room.close();
    document.body.classList.remove("is-locked");
  }
  function closeRoom() {
    if (history.state && history.state.room) {
      history.back(); // popstate closes it, so the browser Back button and the X behave the same
    } else {
      finishClose();
      history.replaceState(null, "", location.pathname + location.search);
    }
  }

  function wireBuyForm(p) {
    const form = $("#buy-form");
    const submit = $("#buy-submit");
    const err = $("#form-error");
    const addrWrap = $("#f-address-wrap");
    const addr = $("#f-address");

    const syncLabels = () => {
      const action = form.intent.value;
      submit.textContent = action === "purchased" ? "Mark as purchased" : action === "reserved" ? "Reserve this piece" : "Send";
      const ship = form.delivery.value === "Shipping";
      addrWrap.hidden = !ship;
      addr.required = ship;
    };
    form.addEventListener("change", syncLabels);

    // Paying on Venmo implies "Purchased"
    $('[data-action="venmo"]').addEventListener("click", () => {
      form.querySelector('input[value="purchased"]').checked = true;
      syncLabels();
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      err.hidden = true;
      if (!form.intent.value) { showError("Choose Purchased or Reserved."); return; }
      if (!form.reportValidity()) return;

      const data = Object.fromEntries(new FormData(form));
      if (data._honey) { showView(thanksView(p, data)); return; }

      const verb = data.intent === "purchased" ? "PURCHASED" : "RESERVED";
      const payload = {
        _subject: `${verb}: No. ${p.no} ${p.name} (${money.format(p.price)})`,
        _template: "table",
        _captcha: "false",
        Status: verb,
        Piece: `No. ${p.no} · ${p.name}`,
        Price: money.format(p.price),
        Name: data.name,
        Contact: data.contact,
        Delivery: data.delivery,
        Address: data.address || "",
        Note: data.note || "",
        Link: `${location.origin}${location.pathname}#piece-${p.no}`,
        _replyto: /@/.test(data.contact) ? data.contact : undefined,
      };

      submit.disabled = true;
      submit.textContent = "Sending…";
      try {
        const res = await fetch(`https://formsubmit.co/ajax/${SHOP.email}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || String(json.success) !== "true") throw new Error(json.message || "Send failed");

        saveClaim(p.no, data.intent);
        showView(thanksView(p, data));
        renderAll();
        observeReveals();
      } catch (ex) {
        const body = Object.entries(payload)
          .filter(([k, v]) => !k.startsWith("_") && v)
          .map(([k, v]) => `${k}: ${v}`).join("\n");
        showError(`That didn't go through. <a href="${mailto(payload._subject, body)}">Email it to me instead</a> and I'll take care of it.`);
        submit.disabled = false;
        syncLabels();
      }
    });

    function showError(html) { err.innerHTML = html; err.hidden = false; }
  }

  function setupRoom() {
    // Open from anywhere a [data-no] button lives
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-no]");
      if (!btn || room.contains(btn)) return;
      const inGrid = btn.closest("#grid");
      openRoom(btn.dataset.no, inGrid ? visibleList() : PRODUCTS);
    });

    $("#room-prev").addEventListener("click", () => step(-1));
    $("#room-next").addEventListener("click", () => step(1));
    $("#room-close").addEventListener("click", closeRoom);
    room.addEventListener("cancel", (e) => { e.preventDefault(); closeRoom(); });
    room.addEventListener("click", (e) => { if (e.target === room) closeRoom(); });

    roomContent.addEventListener("click", (e) => {
      const a = e.target.closest("[data-action]");
      if (!a) return;
      const p = current();
      if (a.dataset.action === "buy") { showView(buyView(p)); wireBuyForm(p); $("#buy-form input").focus({ preventScroll: true }); }
      if (a.dataset.action === "details") showView(detailsView(p));
      if (a.dataset.action === "close") closeRoom();
    });

    room.addEventListener("keydown", (e) => {
      if (e.target.closest("input, textarea, select")) return;
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    });

    // Swipe between pieces on touch screens
    let x0 = null, y0 = null;
    const artEl = $("#room-art");
    artEl.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    artEl.addEventListener("touchend", (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      const dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
      x0 = null;
    });

    addEventListener("popstate", () => {
      const m = location.hash.match(/^#piece-(.+)$/);
      if (m && byNo(m[1])) openRoom(m[1]);
      else finishClose();
    });

    // Direct link to a piece, e.g. ...#piece-043
    const m = location.hash.match(/^#piece-(.+)$/);
    if (m && byNo(m[1])) openRoom(m[1]);
  }

  /* ---------------- Collection controls ---------------- */
  function setupCollection() {
    $("#filters").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-category]");
      if (!b) return;
      state.category = b.dataset.category;
      renderFilters();
      renderGrid();
    });
    $("#only-available").addEventListener("change", (e) => {
      state.onlyAvailable = e.target.checked;
      renderGrid();
    });
  }

  /* ---------------- Contact details ---------------- */
  function setupContact() {
    $$("[data-email-link]").forEach((a) => { a.href = mailto("Hello from the BEN F site"); });
    $$("[data-email-text]").forEach((el) => { el.textContent = SHOP.email; });
    $$(".venmo-handle").forEach((el) => { el.textContent = `@${SHOP.venmo}`; });
    $("#year").textContent = new Date().getFullYear();
  }

  /* ---------------- Go ---------------- */
  renderAll();
  setupContact();
  setupNav();
  setupMenu();
  setupCollection();
  setupRoom();
  observeReveals();
})();
