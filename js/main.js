(() => {
  "use strict";

  /* ---------------- Helpers ---------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  // Filled from data/products.json (edited through admin.html)
  let SHOP = {};
  let PRODUCTS = [];
  let money;
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
  const STATUS_TEXT = { available: "Available", reserved: "On hold", sold: "Sold", gifted: "Gifted", kept: "Not for sale", "held-you": "Held for you", yours: "Yours" };
  const isAvailable = (p) => statusOf(p) === "available";

  /* ---------------- Artwork ---------------- */
  const photosOf = (p) => (Array.isArray(p.images) ? p.images : []).filter(Boolean);

  function art(p, opts = {}) {
    const photos = photosOf(p);
    if (photos.length) {
      const i = Math.min(opts.index || 0, photos.length - 1);
      const n = photos.length > 1 ? ` (photo ${i + 1} of ${photos.length})` : "";
      // Card crop from the Studio page (made in a 4:5 frame); fitted to each card's real shape on load
      const c = opts.card && p.crops && p.crops[photos[i]];
      const cropAttrs = c
        ? ` class="is-cropped" data-crop="${esc(JSON.stringify({ s: +c.s || 1, x: +(c.x ?? 50), y: +(c.y ?? 50) }))}" style="--s:${+c.s || 1};--x:${+(c.x ?? 50)};--y:${+(c.y ?? 50)}"`
        : "";
      return `<img src="${esc(photos[i])}" alt="${esc(p.name)}, ${esc(p.glaze)} glaze${n}"${cropAttrs} loading="${opts.eager ? "eager" : "lazy"}" decoding="async">`;
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
          ${art(p, { ...opts, card: true })}
          ${badge}
          <span class="piece__view" aria-hidden="true">View piece</span>
        </div>
        <div class="wall-label">
          <span class="wall-label__no">No. ${esc(p.no)} · ${esc(p.year)}</span>
          <span class="wall-label__name">${esc(p.name)}</span>
          <span class="wall-label__price">${unavailable ? STATUS_TEXT[st] : money.format(p.price)}</span>
          <span class="wall-label__meta">${[p.clay, p.glaze].filter(Boolean).map(esc).join(" · ")}</span>
        </div>
      </button>`;
  }

  /* ---------------- Hero ---------------- */
  function renderHero() {
    const p = byNo(SHOP.heroPiece) || PRODUCTS.find(isAvailable) || PRODUCTS[0];
    if (!p) { $("#hero-art").innerHTML = ""; $("#hero-count").textContent = "New work coming soon"; return; }
    const st = statusOf(p);
    // Chosen top photo first, then the rest in their usual order
    const photos = photosOf(p).map((src, i) => ({ src, i }));
    const top = photos.findIndex((x) => x.src === SHOP.heroPhoto);
    if (top > 0) photos.unshift(...photos.splice(top, 1));
    const slides = photos.length
      ? photos.map((x, k) => `
          <button type="button" class="hero__slide" data-no="${esc(p.no)}" data-photo="${x.i}"
            aria-label="View ${esc(p.name)}, photo ${k + 1} of ${photos.length}">${heroImg(p, x, k)}</button>`).join("")
      : `<button type="button" class="hero__slide" data-no="${esc(p.no)}" aria-label="View ${esc(p.name)}">${art(p, { eager: true, wall: "#FBF8F3", floor: "#EDE4D8" })}</button>`;
    const many = photos.length > 1;
    const chevron = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;

    $("#hero-art").innerHTML = `
      <div class="hero__track" id="hero-track" style="aspect-ratio:${heroAspect().replace("/", " / ")}" aria-roledescription="carousel" aria-label="Photos of ${esc(p.name)}">${slides}</div>
      ${many ? `
      <div class="hero__nav">
        <div class="hero__dots">${photos.map((_, k) => `<button type="button" class="hero__dot" data-go="${k}" aria-label="Show photo ${k + 1}" aria-current="${k === 0}"></button>`).join("")}</div>
        <div class="hero__arrows">
          <button type="button" class="hero__arrow" data-step="-1" aria-label="Previous photo" disabled>${chevron("M15 5 8 12l7 7")}</button>
          <button type="button" class="hero__arrow" data-step="1" aria-label="Next photo">${chevron("m9 5 7 7-7 7")}</button>
        </div>
      </div>` : ""}
      <figcaption class="hero__caption">
        <em>${esc(p.name)}</em>
        <span>No. ${esc(p.no)} · ${st === "available" ? money.format(p.price) : STATUS_TEXT[st]}</span>
      </figcaption>`;
    if (many) wireHeroCarousel();
    // Keep each cropped photo covering its frame once its real size is known (no white space)
    $$("#hero-track img.is-cropped").forEach((img) => {
      if (img.complete && img.naturalWidth) clampHeroImg(img);
      else img.addEventListener("load", () => clampHeroImg(img), { once: true });
    });

    const n = PRODUCTS.filter(isAvailable).length;
    $("#hero-count").textContent = n ? `${n} piece${n === 1 ? "" : "s"} available now` : "New work coming soon";
  }

  /* Featured photo with the crop chosen in the Studio page.
     crop = { s: width as a multiple of the frame width, x/y: the image point (in %) at the frame's center } */
  // Frame shape chosen in the Studio page (width/height); tall 4:5 by default
  const heroAspect = () => (/^\d+\/\d+$/.test(SHOP.heroAspect || "") ? SHOP.heroAspect : "4/5");

  function clampHeroImg(img) {
    const [w, h] = heroAspect().split("/").map(Number);
    const F = w / h, A = img.naturalWidth / img.naturalHeight;
    const st = img.style;
    const s = Math.max(1, A / F, parseFloat(st.getPropertyValue("--s")) || 1);
    const halfX = 50 / s, halfY = (50 * A) / (s * F);
    const x = Math.min(100 - halfX, Math.max(halfX, parseFloat(st.getPropertyValue("--x")) || 50));
    const y = Math.min(100 - halfY, Math.max(halfY, parseFloat(st.getPropertyValue("--y")) || 50));
    st.setProperty("--s", s); st.setProperty("--x", x); st.setProperty("--y", y);
  }

  function heroImg(p, x, k) {
    const crop = (SHOP.heroCrops || {})[x.src];
    if (!crop) return art(p, { eager: k === 0, index: x.i });
    const s = Number(crop.s) || 1, cx = Number(crop.x ?? 50), cy = Number(crop.y ?? 50);
    return `<img class="is-cropped" src="${esc(x.src)}" alt="${esc(p.name)}, ${esc(p.glaze)} glaze"
      style="--s:${s};--x:${cx};--y:${cy}" loading="${k === 0 ? "eager" : "lazy"}" decoding="async">`;
  }

  // Featured-piece photo strip. The track is re-rendered, so look elements up each time.
  const heroTrack = () => $("#hero-track");
  const heroCount = () => $$("#hero-track .hero__slide").length;
  const heroIndex = () => { const t = heroTrack(); return t ? Math.round(t.scrollLeft / t.clientWidth) : 0; };
  function heroGo(k) {
    const t = heroTrack();
    if (!t) return;
    t.scrollTo({ left: Math.max(0, Math.min(heroCount() - 1, k)) * t.clientWidth, behavior: reduceMotion ? "auto" : "smooth" });
  }
  function heroSync() {
    const k = heroIndex(), n = heroCount();
    $$("#hero-art .hero__dot").forEach((d, i) => d.setAttribute("aria-current", String(i === k)));
    const [prev, next] = $$("#hero-art .hero__arrow");
    if (prev) { prev.disabled = k === 0; next.disabled = k === n - 1; }
  }
  function wireHeroCarousel() {
    heroTrack().addEventListener("scroll", () => requestAnimationFrame(heroSync), { passive: true });
  }
  function setupHeroControls() {
    const art = $("#hero-art");
    art.addEventListener("click", (e) => {
      const d = e.target.closest("[data-go]");
      const s = e.target.closest("[data-step]");
      if (d) heroGo(+d.dataset.go);
      if (s) heroGo(heroIndex() + Number(s.dataset.step));
    });
    art.addEventListener("keydown", (e) => {
      if (!e.target.closest("#hero-track")) return;
      if (e.key === "ArrowRight") { e.preventDefault(); heroGo(heroIndex() + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); heroGo(heroIndex() - 1); }
    });
  }

  /* ---------------- New from the kiln ---------------- */
  function renderNew() {
    let list = (SHOP.newPieces || []).map(byNo).filter(Boolean);
    // None picked in the Studio? Numbers run in order, so show the 3 newest.
    if (!list.length) {
      list = [...PRODUCTS].sort((a, b) => b.no.localeCompare(a.no, undefined, { numeric: true })).slice(0, 3);
    }
    $("#new").hidden = list.length === 0;
    $("#new-grid").innerHTML = list.map((p, i) => card(p, i)).join("");
    fitCardCrops($("#new-grid"));
  }

  /* Fit a card crop (saved as zoom + focus point in a 4:5 frame) to this card's actual shape,
     keeping the photo covering the card: no white space. */
  function fitCardCrop(img) {
    const frame = img.parentElement;
    if (!img.naturalWidth || !frame.clientHeight) return;
    let c;
    try { c = JSON.parse(img.dataset.crop); } catch { return; }
    const A = img.naturalWidth / img.naturalHeight;
    const F = frame.clientWidth / frame.clientHeight;
    const zoom = c.s / Math.max(1, A / 0.8);           // how far past "fill" the crop was zoomed in the 4:5 editor
    const s = Math.max(1, A / F) * Math.max(1, zoom);
    const halfX = 50 / s, halfY = (50 * A) / (s * F);
    img.style.setProperty("--s", s);
    img.style.setProperty("--x", Math.min(100 - halfX, Math.max(halfX, c.x)));
    img.style.setProperty("--y", Math.min(100 - halfY, Math.max(halfY, c.y)));
  }
  function fitCardCrops(root = document) {
    $$("img.is-cropped[data-crop]", root).forEach((img) => {
      if (img.complete && img.naturalWidth) fitCardCrop(img);
      else img.addEventListener("load", () => fitCardCrop(img), { once: true });
    });
  }
  let refitTimer;
  addEventListener("resize", () => {
    clearTimeout(refitTimer);
    refitTimer = setTimeout(() => fitCardCrops(), 150); // card shapes change between phone and desktop layouts
  });

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
    fitCardCrops($("#grid"));
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
  let roomList = [];
  let roomIndex = 0;

  function current() { return roomList[roomIndex]; }

  /* Sliding scale: each piece has a suggested price; buyers choose what to pay. */
  const chosen = {}; // piece no -> amount picked on the slider
  const amountFor = (p) => chosen[p.no] ?? p.price;
  function scaleFor(p) {
    const step = p.price <= 20 ? 1 : 5;
    const round = (v) => Math.max(step, Math.round(v / step) * step);
    return { min: 5, max: round(p.price * 2), step }; // any amount from $5 up is welcome
  }

  function venmoUrl(p) {
    const note = `BEN F No. ${p.no} · ${p.name}`;
    return `https://venmo.com/?txn=pay&recipients=${encodeURIComponent(SHOP.venmo)}&amount=${amountFor(p)}&note=${encodeURIComponent(note)}`;
  }
  function mailto(subject, body = "") {
    return `mailto:${SHOP.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function detailsView(p) {
    const st = statusOf(p);
    let action;
    if (st === "available") {
      action = `<button type="button" class="btn btn--block" data-action="buy">Buy this piece</button>
        <p class="room__note">Pay what feels right. Everything goes toward classes and studio time. Pickup is free, and I'll quote shipping by email.</p>`;
    } else if (st === "held-you" || st === "yours") {
      action = `<p class="room__note">You let me know about this one. I'll confirm with you directly.</p>
        ${st === "held-you" ? `<a class="btn btn--block" href="${venmoUrl(p)}" target="_blank" rel="noopener">Pay ${money.format(amountFor(p))} on Venmo ${ICON_ARROW}</a>` : ""}`;
    } else if (st === "reserved") {
      action = `<a class="btn btn--ghost btn--block" href="${mailto(`Waitlist: No. ${p.no} ${p.name}`, `Hi Ben, if No. ${p.no} (${p.name}) frees up, I'd love it.\n\n`)}">Ask to be next in line</a>
        <p class="room__note">Someone has this on hold. Holds last 48 hours.</p>`;
    } else {
      const why = { sold: "This one has found a home.", gifted: "This one was given as a gift.", kept: "I'm keeping this one for myself." }[st] || "";
      action = `<a class="btn btn--ghost btn--block" href="${mailto(`Something like No. ${p.no}`, `Hi Ben, I loved the ${p.name}. Will you make another?\n\n`)}">Ask for one like it</a>
        ${why ? `<p class="room__note">${why}</p>` : ""}`;
    }

    return `
      <p class="label label--accent">No. ${esc(p.no)} · ${esc(p.category)}</p>
      <h2 class="room__title" id="room-title">${esc(p.name)}</h2>
      <p class="room__price">${st === "available" ? `${money.format(p.price)} <span class="room__suggest">suggested</span>` : ""}<span class="pill pill--${st === "held-you" ? "reserved" : ["yours", "gifted", "kept"].includes(st) ? "sold" : st}">${STATUS_TEXT[st]}</span></p>
      <p class="room__desc">${esc(p.description)}</p>
      <dl class="specs">
        ${[["Clay", p.clay], ["Glaze", p.glaze], ["Size", p.size], ["Made", p.year]]
          .filter(([, v]) => v).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}
      </dl>
      <div>${action}</div>
      ${roomList.length > 1 ? `
      <nav class="room__pieces" aria-label="Other pieces">
        <button type="button" class="link" data-action="prev-piece">← Previous piece</button>
        <button type="button" class="link" data-action="next-piece">Next piece →</button>
      </nav>` : ""}`;
  }

  function buyView(p) {
    return `
      <button type="button" class="link buy__back" data-action="details">← Back to the piece</button>
      <p class="label label--accent">No. ${esc(p.no)} · Suggested ${money.format(p.price)}</p>
      <h2 class="room__title" id="room-title">${esc(p.name)}</h2>

      <div class="buy__step">
        <div class="buy__step-head"><span>1</span><h3>Choose your price</h3></div>
        <div class="scale">
          <output class="scale__amount" id="scale-amount" for="scale-input">${money.format(amountFor(p))}</output>
          <input type="range" id="scale-input" class="scale__input" aria-label="Your price"
            min="${scaleFor(p).min}" max="${scaleFor(p).max}" step="${scaleFor(p).step}" value="${amountFor(p)}">
          <div class="scale__ends"><span>${money.format(scaleFor(p).min)}</span><button type="button" class="link" data-action="suggested">Suggested ${money.format(p.price)}</button><span>${money.format(scaleFor(p).max)}</span></div>
        </div>
        <p class="buy__hint">Pay what feels right. I'm not selling for profit; it all goes toward classes and studio time.</p>
      </div>

      <div class="buy__step">
        <div class="buy__step-head"><span>2</span><h3>Pay on Venmo</h3></div>
        <a class="btn btn--block" href="${venmoUrl(p)}" target="_blank" rel="noopener" data-action="venmo"><span id="venmo-label">Pay ${money.format(amountFor(p))} to @${esc(SHOP.venmo)}</span> ${ICON_ARROW}</a>
        <p class="buy__hint">Opens Venmo with the amount and note filled in. Want it held first? Skip this and choose "Reserved" below.</p>
      </div>

      <div class="buy__step">
        <div class="buy__step-head"><span>3</span><h3>Let me know</h3></div>
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
        ${reserved ? `<a class="btn btn--block" href="${venmoUrl(p)}" target="_blank" rel="noopener">Pay ${money.format(amountFor(p))} on Venmo ${ICON_ARROW}</a>` : ""}
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
    const photos = photosOf(p);
    const many = photos.length > 1;
    const thumbs = $("#room-thumbs");
    thumbs.hidden = !many;
    thumbs.innerHTML = many ? photos.map((src, i) =>
      `<button type="button" class="room__thumb" data-photo="${i}" aria-label="Photo ${i + 1} of ${photos.length}" aria-pressed="${i === 0}">
        <img src="${esc(src)}" alt="" loading="lazy"></button>`).join("") : "";
    $("#photo-prev").hidden = $("#photo-next").hidden = !many;
    showPhoto(0);
    showView(detailsView(p));
  }

  // The arrows on the photo step through this piece's photos (wrapping around)
  let roomPhoto = 0;
  function showPhoto(i, direction = 0) {
    const n = Math.max(1, photosOf(current()).length);
    roomPhoto = ((i % n) + n) % n;
    if (direction) roomFrame.style.setProperty("--from", reduceMotion ? "0" : `${direction * 24}px`);
    roomFrame.innerHTML = art(current(), { eager: true, index: roomPhoto, wall: "#FBF8F3", floor: "#EFE7DC" });
    $$("#room-thumbs [data-photo]").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.photo === roomPhoto)));
    $("#room-count").textContent = n > 1 ? `Photo ${roomPhoto + 1} of ${n}` : "";
  }
  const stepPhoto = (dir) => { if (photosOf(current()).length > 1) showPhoto(roomPhoto + dir, dir); };

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

  /* Email Ben about a reservation or purchase.
     Uses Web3Forms when a key is set in shop settings, otherwise FormSubmit. */
  async function sendNotice(subject, fields, replyTo, fromName) {
    let res;
    if (SHOP.web3formsKey) {
      res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: SHOP.web3formsKey,
          subject,
          from_name: `${fromName || "Someone"} via BEN F site`,
          ...(replyTo ? { replyto: replyTo } : {}),
          ...fields,
        }),
      });
    } else {
      res = await fetch(`https://formsubmit.co/ajax/${SHOP.email}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ _subject: subject, _template: "table", _captcha: "false", ...(replyTo ? { _replyto: replyTo } : {}), ...fields }),
      });
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok || String(json.success) !== "true") throw new Error(json.message || "Send failed");
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

    // Sliding scale
    const slider = $("#scale-input");
    const venmoBtn = $('[data-action="venmo"]');
    const setAmount = (v) => {
      chosen[p.no] = Number(v);
      slider.value = v;
      $("#scale-amount").textContent = money.format(chosen[p.no]);
      $("#venmo-label").textContent = `Pay ${money.format(chosen[p.no])} to @${SHOP.venmo}`;
      venmoBtn.href = venmoUrl(p);
      const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
      slider.style.setProperty("--fill", `${pct}%`);
    };
    setAmount(amountFor(p));
    slider.addEventListener("input", () => setAmount(slider.value));
    $('[data-action="suggested"]').addEventListener("click", () => setAmount(p.price));

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
      const subject = `${verb}: No. ${p.no} ${p.name} (${money.format(p.price)})`;
      const fields = {
        Status: verb,
        Piece: `No. ${p.no} · ${p.name}`,
        Price: `${money.format(amountFor(p))} (suggested ${money.format(p.price)})`,
        Name: data.name,
        Contact: data.contact,
        Delivery: data.delivery,
        Address: data.address || "",
        Note: data.note || "",
        Link: `${location.origin}${location.pathname}#piece-${p.no}`,
      };
      const replyTo = /@/.test(data.contact) ? data.contact : undefined;

      submit.disabled = true;
      submit.textContent = "Sending…";
      try {
        await sendNotice(subject, fields, replyTo, data.name);

        saveClaim(p.no, data.intent);
        showView(thanksView(p, data));
        renderAll();
        observeReveals();
      } catch (ex) {
        const body = Object.entries(fields)
          .filter(([, v]) => v)
          .map(([k, v]) => `${k}: ${v}`).join("\n");
        showError(`That didn't go through. <a href="${mailto(subject, body)}">Email it to me instead</a> and I'll take care of it.`);
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
      if (btn.dataset.photo) showPhoto(+btn.dataset.photo); // open on the photo that was tapped
    });

    $("#photo-prev").addEventListener("click", () => stepPhoto(-1));
    $("#photo-next").addEventListener("click", () => stepPhoto(1));
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
      if (a.dataset.action === "prev-piece") step(-1);
      if (a.dataset.action === "next-piece") step(1);
    });

    // ← → keys flip through this piece's photos
    room.addEventListener("keydown", (e) => {
      if (e.target.closest("input, textarea, select")) return;
      if (e.key === "ArrowLeft") stepPhoto(-1);
      if (e.key === "ArrowRight") stepPhoto(1);
    });

    // Swipe through photos on touch screens
    let x0 = null, y0 = null;
    const artEl = $("#room-art");
    artEl.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    artEl.addEventListener("touchend", (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      const dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) stepPhoto(dx < 0 ? 1 : -1);
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
  async function boot() {
    setupNav();
    setupMenu();
    observeReveals();
    try {
      const res = await fetch("data/products.json", { cache: "no-cache" });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      SHOP = data.settings || {};
      PRODUCTS = (data.products || []).filter((p) => !p.hidden); // hidden = archive-only
    } catch (e) {
      $("#grid-empty").hidden = false;
      $("#grid-empty").textContent = "The collection couldn't load. Please refresh the page.";
      return;
    }
    money = new Intl.NumberFormat("en-US", { style: "currency", currency: SHOP.currency || "USD", maximumFractionDigits: 0 });
    renderAll();
    setupContact();
    setupCollection();
    setupRoom();
    setupHeroControls();
    $("#room-thumbs").addEventListener("click", (e) => {
      const b = e.target.closest("[data-photo]");
      if (b) showPhoto(+b.dataset.photo);
    });
    observeReveals();
  }
  boot();
})();
