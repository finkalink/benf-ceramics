(() => {
  "use strict";

  /* =========================================================
     Config
     ========================================================= */
  const onPages = location.hostname.endsWith(".github.io");
  const CONFIG = {
    owner: onPages ? location.hostname.split(".")[0] : "finkalink",
    repo: (onPages && location.pathname.split("/")[1]) || "benf-ceramics",
    branch: "main",
    recordsRepo: "benf-records",   // PRIVATE repo for owner names, prices paid, notes
    recordsPath: "records.json",
  };
  // SHA-256 of "benf-admin:" + PIN. The PIN keeps casual visitors out of this
  // screen; the GitHub token (stored only on Ben's devices) is what allows changes.
  const PIN_HASH = "c152bec4789f2dd9ce2bfb61cf66c88322d78b78085e58d997eb93cf0dd2b493";
  const TOKEN_KEY = "benf-admin-token";
  const UNLOCK_KEY = "benf-admin-unlocked";
  const FAIL_KEY = "benf-admin-fails";
  const MAX_PHOTO_PX = 1800;
  const PHOTO_QUALITY = 0.82;
  const NEW_LIMIT = 3;

  /* =========================================================
     Helpers
     ========================================================= */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const money = (n) => `$${Number(n || 0).toLocaleString("en-US")}`;
  const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "piece";
  const rand = () => Math.random().toString(36).slice(2, 7);
  const STATUS = { available: "Available", reserved: "On hold", sold: "Sold", gifted: "Gifted", kept: "Kept" };
  const ARCHIVE = ["sold", "gifted", "kept"];
  const isArchived = (p) => ARCHIVE.includes(p.status);
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const RECORD_KEYS = ["owner", "contact", "date", "paid", "method", "delivery", "notes"];
  const store$ = {
    get: (k, s = localStorage) => { try { return s.getItem(k); } catch { return null; } },
    set: (k, v, s = localStorage) => { try { s.setItem(k, v); } catch { /* ignore */ } },
    del: (k, s = localStorage) => { try { s.removeItem(k); } catch { /* ignore */ } },
  };

  async function sha256(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  let toastTimer;
  function toast(html, ms = 4200) {
    const t = $("#toast");
    t.innerHTML = html;
    t.hidden = false;
    clearTimeout(toastTimer);
    if (ms) toastTimer = setTimeout(() => { t.hidden = true; }, ms);
  }

  function confirmBox({ title, body, ok = "Delete", cancel = "Cancel", danger = true }) {
    const d = $("#confirm");
    $("#confirm-title").textContent = title;
    $("#confirm-body").textContent = body;
    const yes = $("#confirm-yes");
    yes.textContent = ok;
    yes.className = `btn ${danger ? "btn--danger" : ""}`;
    $("#confirm-no").textContent = cancel;
    d.showModal();
    return new Promise((resolve) => {
      const done = (v) => { d.close(); yes.onclick = no.onclick = null; resolve(v); };
      const no = $("#confirm-no");
      yes.onclick = () => done(true);
      no.onclick = () => done(false);
      d.oncancel = (e) => { e.preventDefault(); done(false); };
    });
  }

  function showScreen(name) {
    ["lock", "connect", "app"].forEach((s) => { $(`#screen-${s}`).hidden = s !== name; });
    if (name === "lock") setTimeout(() => $("#pin-input").focus({ preventScroll: true }), 50);
  }

  /* =========================================================
     State
     ========================================================= */
  let store = null;
  let data = { settings: {}, products: [] };
  let dataSha = null;
  let originals = new WeakMap();   // product object -> JSON at load / last publish
  let originalList = [];           // product objects present at load
  let originalSettings = "";
  const pending = new Map();       // "pending:id" -> { base64, url }
  const previews = new Map();      // published path -> local object URL (until the site rebuilds)
  const removedPaths = new Set();  // photos to delete on publish
  const view = { show: "all", q: "" };
  let publishing = false;

  // Private archive records, keyed by catalog no. Lives in a separate private repo.
  let recordsStore = null;
  let records = {};
  let recordsSha = null;
  let originalRecords = "{}";
  let recordsState = "off";        // "ok" | "missing" | "noaccess" | "error" | "off"

  const isPending = (src) => typeof src === "string" && src.startsWith("pending:");

  function normalize(p) {
    return {
      no: String(p.no ?? "").trim(),
      name: p.name || "",
      category: p.category || "",
      shape: p.shape || "vase",
      price: Number(p.price) || 0,
      status: STATUS[p.status] ? p.status : "available",
      year: p.year ? Number(p.year) : new Date().getFullYear(),
      clay: p.clay || "",
      glaze: p.glaze || "",
      size: p.size || "",
      description: p.description || "",
      glazeColor: p.glazeColor || "#D8C7A8",
      clayColor: p.clayColor || "#B98A64",
      speckle: !!p.speckle,
      images: Array.isArray(p.images) ? p.images.filter(Boolean) : (p.image ? [p.image] : []),
      hidden: !!p.hidden,
      // Card crop per photo (only the cover's is used): { src: { s, x, y } } made in a 4:5 frame
      crops: p.crops && typeof p.crops === "object" ? { ...p.crops } : {},
    };
  }

  function snapshot() {
    originals = new WeakMap();
    data.products.forEach((p) => originals.set(p, JSON.stringify(p)));
    originalList = [...data.products];
    originalSettings = JSON.stringify(data.settings);
    originalRecords = JSON.stringify(records);
  }

  function changes() {
    const changed = data.products.filter((p) => originals.get(p) !== JSON.stringify(p));
    const deleted = originalList.filter((p) => !data.products.includes(p));
    const settings = JSON.stringify(data.settings) !== originalSettings;
    const siteCount = changed.length + deleted.length + (settings ? 1 : 0);
    const recordsChanged = JSON.stringify(records) !== originalRecords;
    const recordsOnly = recordsChanged
      ? Object.keys({ ...records, ...JSON.parse(originalRecords) })
        .filter((no) => JSON.stringify(records[no]) !== JSON.stringify(JSON.parse(originalRecords)[no]))
        .filter((no) => !changed.some((p) => p.no === no)).length
      : 0;
    return { changed, deleted, settings, siteCount, recordsChanged, count: siteCount + recordsOnly };
  }

  /* Records: tidy a record, dropping empty fields; null when nothing is left */
  function cleanRecord(r) {
    const out = {};
    RECORD_KEYS.forEach((k) => {
      const v = r && r[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") out[k] = k === "paid" ? Number(v) : String(v).trim();
    });
    return Object.keys(out).length ? out : null;
  }

  /* =========================================================
     1. PIN lock
     ========================================================= */
  function setupLock() {
    const input = $("#pin-input");
    const dots = $$("#pin-dots i");
    const hint = $("#pin-hint");
    let digits = "";
    let busy = false;

    const paint = () => dots.forEach((d, i) => d.classList.toggle("is-on", i < digits.length));

    function lockedFor() {
      const f = JSON.parse(store$.get(FAIL_KEY) || "{}");
      return f.until && f.until > Date.now() ? Math.ceil((f.until - Date.now()) / 1000) : 0;
    }
    function cooldown() {
      const s = lockedFor();
      $$("#keypad button").forEach((b) => { b.disabled = s > 0; });
      if (s > 0) {
        hint.textContent = `Too many tries. Wait ${s}s`;
        hint.classList.add("is-error");
        setTimeout(cooldown, 1000);
      } else if (hint.textContent.startsWith("Too many")) {
        hint.textContent = "Enter your PIN";
        hint.classList.remove("is-error");
      }
    }

    async function check() {
      busy = true;
      const ok = (await sha256(`benf-admin:${digits}`)) === PIN_HASH;
      if (ok) {
        store$.del(FAIL_KEY);
        store$.set(UNLOCK_KEY, "1", sessionStorage);
        digits = "";
        paint();
        busy = false;
        afterUnlock();
        return;
      }
      const f = JSON.parse(store$.get(FAIL_KEY) || "{}");
      f.n = (f.n || 0) + 1;
      if (f.n >= 5) { f.until = Date.now() + 30000; f.n = 0; }
      store$.set(FAIL_KEY, JSON.stringify(f));
      $("#pin-dots").classList.add("is-shake");
      hint.textContent = "Wrong PIN";
      hint.classList.add("is-error");
      setTimeout(() => {
        $("#pin-dots").classList.remove("is-shake");
        digits = "";
        paint();
        busy = false;
        cooldown();
      }, 420);
    }

    function press(k) {
      if (busy || lockedFor()) return;
      if (k === "del") digits = digits.slice(0, -1);
      else if (/^\d$/.test(k) && digits.length < 4) digits += k;
      hint.classList.remove("is-error");
      hint.textContent = "Enter your PIN";
      paint();
      if (digits.length === 4) check();
    }

    $("#keypad").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-key]");
      if (b) { press(b.dataset.key); input.focus({ preventScroll: true }); }
    });
    // Physical keyboard / phone number pad
    input.addEventListener("input", () => {
      const v = input.value.replace(/\D/g, "");
      input.value = "";
      [...v].forEach(press);
    });
    input.addEventListener("keydown", (e) => { if (e.key === "Backspace") { e.preventDefault(); press("del"); } });
    $("#screen-lock").addEventListener("click", () => input.focus({ preventScroll: true }));
    cooldown();
  }

  /* =========================================================
     2. Connect
     ========================================================= */
  function setupConnect() {
    $("#connect-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const token = $("#token").value.trim();
      const err = $("#connect-error");
      err.hidden = true;
      if (!token) return;
      const btn = $("#connect-btn");
      btn.disabled = true;
      btn.textContent = "Checking…";
      try {
        makeStores(token);
        await loadData();
        store$.set(TOKEN_KEY, token);
        $("#token").value = "";
        startApp();
      } catch (ex) {
        err.textContent = ex.message || "Couldn't connect.";
        err.hidden = false;
        store = null;
      } finally {
        btn.disabled = false;
        btn.textContent = "Connect";
      }
    });

    $("#demo-btn").addEventListener("click", async () => {
      store = new DemoStore();
      recordsStore = new DemoStore({ records: true });
      await loadData();
      startApp();
    });
  }

  async function afterUnlock() {
    const token = store$.get(TOKEN_KEY);
    if (!token) { showScreen("connect"); return; }
    makeStores(token);
    try {
      await loadData();
      startApp();
    } catch (ex) {
      showScreen("connect");
      const err = $("#connect-error");
      err.textContent = ex.kind === "auth" || ex.kind === "notfound"
        ? `${ex.message} Make a new token and paste it below.`
        : ex.message;
      err.hidden = false;
    }
  }

  /* =========================================================
     3. Data
     ========================================================= */
  function makeStores(token) {
    store = new GitHubStore({ ...CONFIG, token });
    recordsStore = new GitHubStore({ owner: CONFIG.owner, repo: CONFIG.recordsRepo, branch: CONFIG.branch, token, path: CONFIG.recordsPath });
  }

  /* Private records: a problem here never blocks editing the site */
  async function loadRecords() {
    records = {};
    recordsSha = null;
    if (!recordsStore) { recordsState = "off"; return; }
    try {
      const info = await recordsStore.repoInfo();
      if (!info) { recordsState = "missing"; return; }
      if (info.private === false) { recordsState = "public"; return; } // never write private notes to a public repo
      const res = await recordsStore.load(undefined, { allowMissing: true });
      records = res.data && typeof res.data === "object" ? res.data : {};
      recordsSha = res.sha;
      recordsState = "ok";
    } catch (e) {
      recordsState = e.kind === "auth" || e.kind === "notfound" ? "noaccess" : "error";
    }
  }

  async function loadData() {
    const res = await store.load();
    await loadRecords();
    data = {
      settings: { name: "BEN F", currency: "USD", heroPiece: "", newPieces: [], ...res.data.settings },
      products: (res.data.products || []).map(normalize),
    };
    dataSha = res.sha;
    pending.clear();
    removedPaths.clear();
    snapshot();
  }

  function cleanData() {
    return {
      settings: data.settings,
      // keep the public file tidy: only write "hidden" when it's on
      products: data.products.map(({ hidden, crops, ...p }) => {
        const out = { ...p };
        const used = Object.fromEntries(Object.entries(crops || {}).filter(([src]) => p.images.includes(src)));
        if (Object.keys(used).length) out.crops = used;
        if (hidden) out.hidden = true;
        return out;
      }),
    };
  }

  /* =========================================================
     Photos: display + processing
     ========================================================= */
  function imgSrc(src) {
    if (isPending(src)) return pending.get(src)?.url || "";
    return previews.get(src) || src;
  }
  function photoImg(src, alt = "") {
    const raw = !isPending(src) && store ? store.rawUrl(src) : "";
    return `<img src="${esc(imgSrc(src))}" alt="${esc(alt)}" data-raw="${esc(raw)}" loading="lazy" decoding="async">`;
  }
  // If a photo isn't on the live site yet, fall back to GitHub's copy
  document.addEventListener("error", (e) => {
    const img = e.target;
    if (img.tagName === "IMG" && img.dataset.raw && img.src !== img.dataset.raw) img.src = img.dataset.raw;
  }, true);

  function thumb(p) {
    return p.images.length ? photoImg(p.images[0], p.name) : Pottery.svg(p, { label: p.name });
  }

  async function decode(file) {
    if ("createImageBitmap" in window) {
      try { return await createImageBitmap(file, { imageOrientation: "from-image" }); } catch { /* fall through */ }
    }
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  async function processPhoto(file) {
    const src = await decode(file);
    const w = src.width, h = src.height;
    const scale = Math.min(1, MAX_PHOTO_PX / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
    if (src.close) src.close();
    const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", PHOTO_QUALITY));
    const base64 = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result).split(",")[1]);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
    const id = `pending:${rand()}${rand()}`;
    pending.set(id, { base64, url: URL.createObjectURL(blob) });
    return id;
  }

  /* =========================================================
     Works list
     ========================================================= */
  function sortedProducts() {
    return [...data.products].sort((a, b) => b.no.localeCompare(a.no, undefined, { numeric: true }));
  }

  function renderList() {
    const q = view.q.trim().toLowerCase();
    const matchesView = (p) => view.show === "all"
      || (view.show === "archive" ? isArchived(p) : p.status === view.show);
    const list = sortedProducts().filter((p) => matchesView(p) &&
      (!q || `${p.no} ${p.name} ${p.category} ${p.glaze} ${records[p.no]?.owner || ""}`.toLowerCase().includes(q)));

    const total = data.products.length;
    const avail = data.products.filter((p) => p.status === "available").length;
    const archived = data.products.filter(isArchived);
    const raised = archived.reduce((sum, p) => sum + (p.status === "sold" ? Number(records[p.no]?.paid) || 0 : 0), 0);
    const homes = data.products.filter((p) => ["sold", "gifted"].includes(p.status)).length;
    $("#works-title").textContent = `${total} work${total === 1 ? "" : "s"} · ${avail} available`;
    $("#stats").textContent = archived.length
      ? `${homes} out in the world${raised ? ` · ${money(raised)} raised for classes & studio time` : ""}`
      : "";

    $("#works").innerHTML = list.map((p) => {
      const changed = originals.get(p) !== JSON.stringify(p) || JSON.stringify(records[p.no]) !== JSON.stringify(JSON.parse(originalRecords)[p.no]);
      const r = records[p.no] || {};
      const who = { sold: "Sold to", gifted: "Given to", reserved: "Held for" }[p.status];
      const meta = (isArchived(p) || p.status === "reserved") && (r.owner || r.paid || r.date)
        ? [r.owner && who ? `${who} ${esc(r.owner)}` : "", r.paid ? money(r.paid) : "", r.date ? esc(r.date) : ""].filter(Boolean).join(" · ")
        : `${money(p.price)}${p.glaze ? ` · ${esc(p.glaze)}` : ""}`;
      const tags = [
        data.settings.heroPiece === p.no ? '<span class="tag">Top</span>' : "",
        (data.settings.newPieces || []).includes(p.no) ? '<span class="tag tag--plain">New</span>' : "",
        p.hidden ? '<span class="tag tag--plain">Hidden</span>' : "",
      ].join("");
      return `
        <li class="work${changed ? " is-changed" : ""}" data-no="${esc(p.no)}">
          <button type="button" class="work__thumb" data-edit aria-label="Edit ${esc(p.name)}">${thumb(p)}</button>
          <button type="button" class="work__main" data-edit>
            <span class="work__no">No. ${esc(p.no)} · ${esc(p.category)}${p.images.length ? ` · ${p.images.length} photo${p.images.length === 1 ? "" : "s"}` : ""}</span>
            <span class="work__name">${esc(p.name) || "<em>Untitled</em>"}${tags}</span>
            <span class="work__meta">${meta}</span>
          </button>
          <div class="work__side">
            <label class="sr-only" for="st-${esc(p.no)}">Status of ${esc(p.name)}</label>
            <select class="status-select" id="st-${esc(p.no)}" data-status data-v="${p.status}">
              ${Object.entries(STATUS).map(([v, t]) => `<option value="${v}"${v === p.status ? " selected" : ""}>${t}</option>`).join("")}
            </select>
            <button type="button" class="btn btn--ghost btn--sm work__edit" data-edit>Edit</button>
          </div>
        </li>`;
    }).join("");
    $("#works-empty").hidden = list.length > 0;
    updateState();
  }

  function updateState() {
    const c = changes();
    const el = $("#state");
    const btn = $("#publish-btn");
    if (publishing) return;
    el.classList.toggle("is-dirty", c.count > 0);
    el.textContent = c.count
      ? `${c.count} unpublished change${c.count === 1 ? "" : "s"}`
      : store?.demo ? "Practice mode" : "Everything is published";
    btn.disabled = c.count === 0;
    btn.textContent = c.count ? `Publish${c.count > 1 ? ` ${c.count}` : ""}` : "Publish";
    $("#discard-btn").hidden = c.count === 0;
  }

  function setupList() {
    $("#works").addEventListener("click", (e) => {
      const row = e.target.closest(".work");
      if (row && e.target.closest("[data-edit]")) openEditor(data.products.find((p) => p.no === row.dataset.no));
    });
    $("#works").addEventListener("change", (e) => {
      const sel = e.target.closest("[data-status]");
      if (!sel) return;
      const p = data.products.find((x) => x.no === sel.closest(".work").dataset.no);
      p.status = sel.value;
      renderList();
      if (["sold", "gifted", "reserved"].includes(p.status) && recordsState === "ok" && !records[p.no]?.owner) {
        // Open the work so its new owner can be noted right away
        openEditor(p, { focusRecord: true });
        toast(`No. ${esc(p.no)} marked <strong>${STATUS[p.status]}</strong>. Add who has it, or tap Done to skip.`);
      } else {
        toast(`No. ${esc(p.no)} marked <strong>${STATUS[p.status]}</strong>. Publish when you're ready.`);
      }
    });
    $("#search").addEventListener("input", (e) => { view.q = e.target.value; renderList(); });
    $$(".admin-tools .seg button").forEach((b) => b.addEventListener("click", () => {
      view.show = b.dataset.show;
      $$(".admin-tools .seg button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      renderList();
    }));
    $("#add-btn").addEventListener("click", () => openEditor(null));
  }

  /* =========================================================
     Editor
     ========================================================= */
  const editor = $("#editor");
  const form = $("#editor-form");
  let target = null;          // product being edited (null = new)
  let draft = null;           // working copy
  let draftRemoved = [];      // existing photos removed in this edit
  let draftTop = null;        // photo shown first when this work is featured at the top
  let draftCrops = {};        // homepage crop per photo of the featured work: { src: { s, x, y } }

  function nextNo() {
    const nums = data.products.map((p) => parseInt(p.no, 10)).filter((n) => !isNaN(n));
    return String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0");
  }

  /* Which record fields each status uses, and how they're labeled */
  const RECORD_LAYOUT = {
    reserved: { title: "Hold", owner: "Held for", date: "Held since", paid: "Agreed price ($)", fields: ["owner", "contact", "date", "paid", "notes"] },
    sold: { title: "Sale record", owner: "Sold to", date: "Date sold", paid: "Price paid ($)", fields: ["owner", "contact", "date", "paid", "method", "delivery", "notes"] },
    gifted: { title: "Gift record", owner: "Given to", date: "Date given", fields: ["owner", "contact", "date", "delivery", "notes"] },
    kept: { title: "Keeping it", date: "Kept since", notes: "Why I'm keeping it", fields: ["date", "notes"] },
  };

  function renderRecord() {
    const status = form.querySelector('input[name="status"]:checked')?.value || "available";
    const layout = RECORD_LAYOUT[status];
    const section = $("#record");
    section.hidden = !layout;
    if (!layout) return;
    $("#record-title").textContent = layout.title;
    $("#r-owner-label").textContent = layout.owner || "Owner";
    $("#r-date-label").textContent = layout.date || "Date";
    $("#r-paid-label").textContent = layout.paid || "Price paid ($)";
    $("#r-notes-label").textContent = layout.notes || "Notes";
    $$("#record-fields [data-r]").forEach((el) => { el.hidden = !layout.fields.includes(el.dataset.r); });
    $("#r-paid").placeholder = draft.price ? `Suggested ${money(draft.price)}` : "";

    const setup = $("#record-setup");
    const ok = recordsState === "ok";
    const msg = {
      missing: `Private records need a private GitHub repository named <strong>${CONFIG.recordsRepo}</strong>. Once it exists and your access token includes it, these fields will save.`,
      noaccess: `Your access token can't open the private <strong>${CONFIG.recordsRepo}</strong> repository. Edit the token on GitHub and add that repository (Contents: Read and write).`,
      public: `<strong>${CONFIG.recordsRepo}</strong> is a public repository, so records are switched off to keep them private. Make it private on GitHub.`,
      error: "Couldn't load your private records right now. Reload the page to try again.",
      off: "Private records aren't available in this mode.",
    }[recordsState];
    setup.hidden = ok;
    setup.innerHTML = ok ? "" : msg || "";
    $$("#record-fields input, #record-fields select, #record-fields textarea").forEach((el) => { el.disabled = !ok; });
  }

  function fillRecord(r = {}) {
    RECORD_KEYS.forEach((k) => { form.elements[`r_${k}`].value = r[k] ?? ""; });
  }
  function readRecord() {
    const r = {};
    RECORD_KEYS.forEach((k) => { r[k] = form.elements[`r_${k}`].value; });
    return r;
  }

  function openEditor(p, { focusRecord = false } = {}) {
    target = p;
    draftRemoved = [];
    draft = p ? structuredClone(p) : normalize({
      no: nextNo(), status: "available", year: new Date().getFullYear(), shape: "mug",
      glazeColor: "#D8C7A8", clayColor: "#B98A64",
    });
    $("#editor-title").textContent = p ? `No. ${p.no}` : "New work";
    $("#delete-wrap").hidden = !p;
    $("#editor-error").hidden = true;

    const f = form.elements;
    ["name", "no", "price", "category", "year", "clay", "glaze", "size", "description", "shape", "glazeColor", "clayColor"]
      .forEach((k) => { f[k].value = draft[k] ?? ""; });
    form.querySelector(`input[name="status"][value="${draft.status}"]`).checked = true;
    f.speckle.checked = !!draft.speckle;
    f.isNew.checked = p ? (data.settings.newPieces || []).includes(p.no) : true;
    f.isHero.checked = p ? data.settings.heroPiece === p.no : false;
    f.isHidden.checked = !!draft.hidden;
    fillRecord(p ? records[p.no] : {});
    if (focusRecord && !f.r_date.value && ["sold", "gifted", "reserved"].includes(draft.status)) f.r_date.value = today();
    draftTop = f.isHero.checked && draft.images.includes(data.settings.heroPhoto)
      ? data.settings.heroPhoto
      : draft.images[0] || null;
    draftCrops = {};
    draftAspect = (f.isHero.checked && data.settings.heroAspect) || SHAPES.tall;
    if (f.isHero.checked) {
      Object.entries(data.settings.heroCrops || {}).forEach(([src, c]) => { if (draft.images.includes(src)) draftCrops[src] = { ...c }; });
    }
    $$(".is-touched", form).forEach((el) => el.classList.remove("is-touched"));

    $("#categories").innerHTML = [...new Set(data.products.map((x) => x.category).filter(Boolean))]
      .map((c) => `<option value="${esc(c)}">`).join("");

    renderPhotos();
    renderDrawing();
    renderRecord();
    $("#drawing").open = draft.images.length === 0 && !p;
    editor.showModal();
    $(".sheet__body", editor).scrollTop = 0;
    if (!p) setTimeout(() => f.name.focus(), 60);
    if (focusRecord && !$("#record").hidden) {
      setTimeout(() => {
        $("#record").scrollIntoView({ block: "start" });
        if (recordsState === "ok") (f.r_owner.closest("[data-r]").hidden ? f.r_notes : f.r_owner).focus({ preventScroll: true });
      }, 80);
    }
  }

  function readForm() {
    const f = form.elements;
    Object.assign(draft, {
      name: f.name.value.trim(),
      no: f.no.value.trim(),
      price: Number(f.price.value),
      category: f.category.value.trim(),
      year: f.year.value ? Number(f.year.value) : "",
      clay: f.clay.value.trim(),
      glaze: f.glaze.value.trim(),
      size: f.size.value.trim(),
      description: f.description.value.trim(),
      shape: f.shape.value,
      glazeColor: f.glazeColor.value,
      clayColor: f.clayColor.value,
      speckle: f.speckle.checked,
      status: form.querySelector('input[name="status"]:checked')?.value || "available",
      hidden: f.isHidden.checked,
    });
  }

  function validate() {
    const f = form.elements;
    const problems = [];
    if (!draft.name) { problems.push("Add a name."); f.name.classList.add("is-touched"); }
    if (!draft.no) { problems.push("Add a catalog number."); f.no.classList.add("is-touched"); }
    else if (data.products.some((p) => p !== target && p.no === draft.no)) {
      problems.push(`No. ${draft.no} is already used by another work.`); f.no.classList.add("is-touched");
    }
    if (f.price.value === "" || isNaN(draft.price) || draft.price < 0) { problems.push("Add a price."); f.price.classList.add("is-touched"); }
    if (!draft.category) { problems.push("Add a type, like Mugs or Bowls."); f.category.classList.add("is-touched"); }
    return problems;
  }

  function renderDrawing() {
    $("#drawing-preview").innerHTML = Pottery.svg(draft, { label: "Drawing preview" });
  }

  function renderPhotos() {
    const imgs = draft.images;
    const arrowL = '<svg viewBox="0 0 24 24"><path d="M15 5 8 12l7 7"/></svg>';
    const arrowR = '<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>';
    const cross = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>';
    const featured = form.elements.isHero.checked && imgs.length > 0;
    if (!imgs.includes(draftTop)) draftTop = imgs[0] || null;
    $("#photo-top-hint").hidden = !featured;
    $("#photos").innerHTML = imgs.map((src, i) => `
      <li class="photo" draggable="true" data-i="${i}">
        ${photoImg(src, `Photo ${i + 1}`)}
        ${i === 0 ? '<span class="photo__cover">Cover</span>' : ""}
        ${featured ? `<button type="button" class="photo__top" data-top aria-pressed="${src === draftTop}"
          aria-label="Show photo ${i + 1} first at the top of the homepage">${src === draftTop ? "★ Top photo" : "Use at top"}</button>
          <button type="button" class="photo__crop${draftCrops[src] ? " is-set" : ""}" data-crop
            aria-label="Adjust how photo ${i + 1} is cropped at the top of the homepage">${draftCrops[src] ? "Top crop ✓" : "Crop top"}</button>` : ""}
        ${i === 0 ? `<button type="button" class="photo__cardcrop${draft.crops[src] ? " is-set" : ""}" data-cardcrop
          aria-label="Adjust how this cover photo is cropped on its card">${draft.crops[src] ? "Card crop ✓" : "Crop card"}</button>` : ""}
        <div class="photo__tools">
          <button type="button" data-move="-1" aria-label="Move photo ${i + 1} earlier" ${i === 0 ? "disabled" : ""}>${arrowL}</button>
          <button type="button" data-remove class="is-remove" aria-label="Remove photo ${i + 1}">${cross}</button>
          <button type="button" data-move="1" aria-label="Move photo ${i + 1} later" ${i === imgs.length - 1 ? "disabled" : ""}>${arrowR}</button>
        </div>
      </li>`).join("") + `
      <li><button type="button" class="photo photo--add" id="add-photo">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>
        Add photos
      </button></li>`;
    // With a single photo there's nothing to choose between
    if (imgs.length < 2) $$("#photos [data-top]").forEach((b) => b.remove());
  }

  /* ---------- Homepage crop (featured work) ----------
     Frame is 4:5 like the homepage. Crop = { s: image width ÷ frame width, x/y: image point (%) at the frame center } */
  // Homepage frame shapes (width / height). The photo always covers the frame: no white space.
  const SHAPES = { tall: "4/5", square: "1/1", wide: "4/3" };
  const ratio = (a) => { const [w, h] = String(a || "4/5").split("/").map(Number); return w && h ? w / h : 0.8; };
  let draftAspect = SHAPES.tall;
  // mode "card": the piece's card photo (always a tall 4:5 frame); "hero": homepage top (shape is choosable)
  const crop = { src: null, s: 1, x: 50, y: 50, aspect: 4 / 3, cover: 1, mode: "hero" };
  const frameAspect = () => (crop.mode === "card" ? SHAPES.tall : draftAspect);

  // Keep the photo covering the frame: zoom at least "fill", and no panning past an edge
  function clampCrop() {
    const F = ratio(frameAspect()), A = crop.aspect;
    crop.cover = Math.max(1, A / F);
    crop.s = Math.max(crop.cover, crop.s);
    const halfX = 50 / crop.s;                 // half the visible width, in % of the image
    const halfY = (50 * A) / (crop.s * F);     // half the visible height, in % of the image
    crop.x = Math.min(100 - halfX, Math.max(halfX, crop.x));
    crop.y = Math.min(100 - halfY, Math.max(halfY, crop.y));
  }

  function paintCrop() {
    clampCrop();
    const img = $("#crop-img");
    $("#crop-frame").style.aspectRatio = frameAspect().replace("/", " / ");
    img.style.setProperty("--s", crop.s);
    img.style.setProperty("--x", crop.x);
    img.style.setProperty("--y", crop.y);
    const zoom = $("#crop-zoom");
    zoom.min = crop.cover.toFixed(3);
    zoom.max = (crop.cover * 3).toFixed(3);
    zoom.value = crop.s;
    $$("#crop-shapes [data-shape]").forEach((b) => b.setAttribute("aria-pressed", String(SHAPES[b.dataset.shape] === draftAspect)));
  }

  function openCrop(src, mode = "hero") {
    const img = $("#crop-img");
    crop.mode = mode;
    const card = mode === "card";
    $("#crop-title").textContent = card ? "Crop the card photo" : "Crop for the top of the homepage";
    $("#crop-intro").textContent = card
      ? "This is the photo on this piece's card in the gallery. Drag to move and use the slider to zoom. Leave it alone and it stays centered automatically."
      : "Pick a frame shape, then drag to move and use the slider to zoom. What's inside the frame is exactly what the homepage shows.";
    $("#crop-shapes").hidden = card;
    $("#crop-shape-note").hidden = card;
    const start = () => {
      crop.src = src;
      crop.aspect = img.naturalWidth / img.naturalHeight || 4 / 3;
      const saved = card ? draft.crops[src] : draftCrops[src];
      Object.assign(crop, saved ? { s: saved.s, x: saved.x, y: saved.y } : { s: 0, x: 50, y: 50 }); // s: 0 → clamps to "fill"
      paintCrop();
    };
    img.onload = start;
    img.src = imgSrc(src);
    if (img.complete && img.naturalWidth) start();
    $("#cropper").showModal();
  }

  function setupCrop() {
    const frame = $("#crop-frame");
    const clamp = (v) => Math.max(0, Math.min(100, v));
    let drag = null;
    frame.addEventListener("pointerdown", (e) => {
      drag = { x: e.clientX, y: e.clientY, cx: crop.x, cy: crop.y };
      frame.setPointerCapture(e.pointerId);
      frame.classList.add("is-dragging");
    });
    frame.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const w = frame.clientWidth * crop.s;           // shown image width in px
      const h = w / crop.aspect;
      crop.x = clamp(drag.cx - ((e.clientX - drag.x) / w) * 100);
      crop.y = clamp(drag.cy - ((e.clientY - drag.y) / h) * 100);
      paintCrop();
    });
    const end = () => { drag = null; frame.classList.remove("is-dragging"); };
    frame.addEventListener("pointerup", end);
    frame.addEventListener("pointercancel", end);
    // Arrow keys nudge for keyboard users
    frame.addEventListener("keydown", (e) => {
      const step = e.shiftKey ? 5 : 1;
      const moves = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
      if (!moves) return;
      e.preventDefault();
      crop.x = clamp(crop.x + moves[0]);
      crop.y = clamp(crop.y + moves[1]);
      paintCrop();
    });
    $("#crop-zoom").addEventListener("input", (e) => { crop.s = Number(e.target.value); paintCrop(); });
    $("#crop-shapes").addEventListener("click", (e) => {
      const b = e.target.closest("[data-shape]");
      if (!b) return;
      if (SHAPES[b.dataset.shape] !== draftAspect) {
        // Crops made for the old shape don't fit the new one: start the others fresh (filled, centered)
        Object.keys(draftCrops).forEach((src) => { if (src !== crop.src) delete draftCrops[src]; });
      }
      draftAspect = SHAPES[b.dataset.shape];  // one shape for all of this work's homepage photos
      crop.s = 0;                              // start the new shape filled and centered
      crop.x = 50; crop.y = 50;
      paintCrop();
    });
    $("#crop-reset").addEventListener("click", () => { Object.assign(crop, { s: 0, x: 50, y: 50 }); paintCrop(); });
    $("#crop-cancel").addEventListener("click", () => $("#cropper").close());
    $("#crop-save").addEventListener("click", () => {
      const r = (v, d) => Math.round(v * 10 ** d) / 10 ** d;
      const isDefault = Math.abs(crop.s - crop.cover) < 0.005 && Math.abs(crop.x - 50) < 0.5 && Math.abs(crop.y - 50) < 0.5;
      const target = crop.mode === "card" ? draft.crops : draftCrops;   // untouched = automatic (centered)
      if (isDefault) delete target[crop.src];
      else target[crop.src] = { s: r(crop.s, 3), x: r(crop.x, 1), y: r(crop.y, 1) };
      $("#cropper").close();
      renderPhotos();
    });
  }

  async function addFiles(files) {
    const list = [...files].filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    if (!list.length) return;
    const status = $("#photo-status");
    const add = $("#add-photo");
    add.classList.add("photo--busy");
    let done = 0, failed = 0;
    for (const file of list) {
      status.textContent = `Preparing photo ${done + failed + 1} of ${list.length}…`;
      try {
        draft.images.push(await processPhoto(file));
        done++;
      } catch {
        failed++;
      }
      renderPhotos();
    }
    status.textContent = failed
      ? `${failed} photo${failed === 1 ? "" : "s"} couldn't be read. Try JPEG or PNG.`
      : `${done} photo${done === 1 ? "" : "s"} added.`;
    setTimeout(() => { if (!failed) status.textContent = ""; }, 3000);
  }

  function setupEditor() {
    const fileInput = $("#file-input");
    const photos = $("#photos");

    photos.addEventListener("click", (e) => {
      if (e.target.closest("#add-photo")) { fileInput.click(); return; }
      const li = e.target.closest(".photo[data-i]");
      if (!li) return;
      const i = +li.dataset.i;
      const mv = e.target.closest("[data-move]");
      if (mv) {
        const j = i + Number(mv.dataset.move);
        [draft.images[i], draft.images[j]] = [draft.images[j], draft.images[i]];
        renderPhotos();
      }
      if (e.target.closest("[data-remove]")) {
        const [src] = draft.images.splice(i, 1);
        if (!isPending(src)) draftRemoved.push(src);
        delete draft.crops[src];
        delete draftCrops[src];
        renderPhotos();
      }
      if (e.target.closest("[data-top]")) {
        draftTop = draft.images[i];
        renderPhotos();
      }
      if (e.target.closest("[data-crop]")) openCrop(draft.images[i], "hero");
      if (e.target.closest("[data-cardcrop]")) openCrop(draft.images[i], "card");
    });
    // Show or hide the top-photo buttons as "Feature at the top" is ticked
    form.elements.isHero.addEventListener("change", renderPhotos);
    fileInput.addEventListener("change", () => { addFiles(fileInput.files); fileInput.value = ""; });

    // Drag to reorder, or drop new files anywhere on the photo grid
    let dragFrom = null;
    photos.addEventListener("dragstart", (e) => {
      const li = e.target.closest(".photo[data-i]");
      if (!li) return;
      dragFrom = +li.dataset.i;
      li.classList.add("is-dragging");
      e.dataTransfer.effectAllowed = "move";
    });
    photos.addEventListener("dragend", () => { dragFrom = null; $$(".photo", photos).forEach((x) => x.classList.remove("is-dragging", "is-over")); });
    photos.addEventListener("dragover", (e) => {
      e.preventDefault();
      const li = e.target.closest(".photo");
      $$(".photo", photos).forEach((x) => x.classList.toggle("is-over", x === li));
    });
    photos.addEventListener("dragleave", (e) => { if (!photos.contains(e.relatedTarget)) $$(".photo", photos).forEach((x) => x.classList.remove("is-over")); });
    photos.addEventListener("drop", (e) => {
      e.preventDefault();
      $$(".photo", photos).forEach((x) => x.classList.remove("is-over"));
      if (e.dataTransfer.files && e.dataTransfer.files.length) { addFiles(e.dataTransfer.files); return; }
      const li = e.target.closest(".photo[data-i]");
      if (dragFrom === null || !li) return;
      const to = +li.dataset.i;
      const [m] = draft.images.splice(dragFrom, 1);
      draft.images.splice(to, 0, m);
      renderPhotos();
    });

    // Live drawing preview
    form.addEventListener("input", (e) => {
      if (["shape", "glazeColor", "clayColor", "speckle"].includes(e.target.name)) { readForm(); renderDrawing(); }
      if (e.target.name === "status") {
        // Date it when it leaves the studio
        if (["sold", "gifted", "reserved"].includes(e.target.value) && !form.elements.r_date.value) form.elements.r_date.value = today();
        renderRecord();
      }
      e.target.classList.remove("is-touched");
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      readForm();
      const problems = validate();
      const err = $("#editor-error");
      if (problems.length) {
        err.textContent = problems.join(" ");
        err.hidden = false;
        err.scrollIntoView({ block: "center", behavior: "smooth" });
        return;
      }
      saveDraft();
      editor.close();
    });

    $$("[data-close]", editor).forEach((b) => b.addEventListener("click", () => editor.close()));

    $("#delete-btn").addEventListener("click", async () => {
      const ok = await confirmBox({
        title: `Delete No. ${target.no}?`,
        body: `${target.name} and its photos will be removed from the site when you publish.`,
      });
      if (!ok) return;
      target.images.filter((s) => !isPending(s)).forEach((s) => removedPaths.add(s));
      data.products = data.products.filter((p) => p !== target);
      const s = data.settings;
      s.newPieces = (s.newPieces || []).filter((n) => n !== target.no);
      if (s.heroPiece === target.no) { s.heroPiece = ""; s.heroPhoto = ""; delete s.heroCrops; delete s.heroAspect; }
      delete records[target.no];
      editor.close();
      renderList();
      toast(`Deleted No. ${esc(target.no)}. Publish to update the site.`);
    });
  }

  function saveDraft() {
    const f = form.elements;
    const s = data.settings;
    const oldNo = target ? target.no : null;

    if (target) {
      Object.keys(target).forEach((k) => delete target[k]);
      Object.assign(target, draft);
    } else {
      target = draft;
      data.products.push(target);
    }
    draftRemoved.forEach((src) => removedPaths.add(src));

    // Private record: follows the work if it's renumbered; dropped if it's back on the shelf
    if (recordsState === "ok") {
      const rec = target.status === "available" ? null : cleanRecord(readRecord());
      if (oldNo && oldNo !== target.no) delete records[oldNo];
      if (rec) records[target.no] = rec;
      else delete records[target.no];
    }

    // Keep homepage references in step with a renumbered work
    s.newPieces = (s.newPieces || []).map((n) => (n === oldNo ? target.no : n));
    if (oldNo && s.heroPiece === oldNo) s.heroPiece = target.no;

    let note = "";
    if (f.isNew.checked) {
      if (!s.newPieces.includes(target.no)) s.newPieces.push(target.no);
    } else {
      s.newPieces = s.newPieces.filter((n) => n !== target.no);
    }
    s.newPieces = s.newPieces
      .filter((n) => data.products.some((p) => p.no === n))
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    if (s.newPieces.length > NEW_LIMIT) {
      if (s.newPieces.indexOf(target.no) >= NEW_LIMIT) note = ` Only the ${NEW_LIMIT} newest show under "New from the kiln".`;
      s.newPieces = s.newPieces.slice(0, NEW_LIMIT);
    }
    if (f.isHero.checked) {
      s.heroPiece = target.no;
      s.heroPhoto = target.images.includes(draftTop) ? draftTop : target.images[0] || "";
      const crops = {};
      target.images.forEach((src) => { if (draftCrops[src]) crops[src] = draftCrops[src]; });
      if (Object.keys(crops).length) s.heroCrops = crops; else delete s.heroCrops;
      if (draftAspect !== SHAPES.tall) s.heroAspect = draftAspect; else delete s.heroAspect;
    } else if (s.heroPiece === target.no) {
      s.heroPiece = "";
      s.heroPhoto = "";
      delete s.heroCrops;
      delete s.heroAspect;
    }

    renderList();
    toast(`Saved No. ${esc(target.no)}.${note} Publish when you're ready.`, 5200);
  }

  /* =========================================================
     Settings
     ========================================================= */
  function setupSettings() {
    const d = $("#settings");
    const f = $("#settings-form");
    $("#settings-btn").addEventListener("click", () => {
      closeMenu();
      f.elements.email.value = data.settings.email || "";
      f.elements.venmo.value = data.settings.venmo || "";
      f.elements.web3formsKey.value = data.settings.web3formsKey || "";
      d.showModal();
    });
    $$("[data-close]", d).forEach((b) => b.addEventListener("click", () => d.close()));
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!f.reportValidity()) return;
      data.settings.email = f.elements.email.value.trim();
      data.settings.venmo = f.elements.venmo.value.trim().replace(/^@/, "");
      data.settings.web3formsKey = f.elements.web3formsKey.value.trim();
      d.close();
      renderList();
    });
  }

  /* =========================================================
     Publish
     ========================================================= */
  function commitMessage(c) {
    const added = c.changed.filter((p) => !originals.has(p)).length;
    const edited = c.changed.length - added;
    const parts = [];
    if (added) parts.push(`add ${added} work${added === 1 ? "" : "s"}`);
    if (edited) parts.push(`update ${edited} work${edited === 1 ? "" : "s"}`);
    if (c.deleted.length) parts.push(`remove ${c.deleted.length} work${c.deleted.length === 1 ? "" : "s"}`);
    if (c.settings) parts.push("update shop settings");
    // (private record details never appear in public commit messages)
    const msg = parts.join(", ") || "update works";
    return `Studio: ${msg.charAt(0).toUpperCase()}${msg.slice(1)}`;
  }

  async function publish() {
    const c = changes();
    if (!c.count || publishing) return;
    publishing = true;
    const btn = $("#publish-btn");
    btn.classList.add("is-busy");
    btn.textContent = "Publishing…";
    $("#state").textContent = "Saving to GitHub…";

    // Give new photos their final file names
    const addFiles = [];
    const renamed = new Map();
    data.products.forEach((p) => {
      p.images.forEach((src) => {
        if (isPending(src) && !renamed.has(src)) {
          const path = `images/${slug(p.no)}-${slug(p.name)}-${rand()}.jpg`;
          renamed.set(src, path);
          addFiles.push({ path, base64: pending.get(src).base64 });
        }
      });
    });
    const out = cleanData();
    out.products.forEach((p) => {
      p.images = p.images.map((s) => renamed.get(s) || s);
      if (p.crops) p.crops = Object.fromEntries(Object.entries(p.crops).map(([s, c]) => [renamed.get(s) || s, c]));
    });
    if (data.settings.heroPhoto || data.settings.heroCrops) {
      const crops = {};
      Object.entries(data.settings.heroCrops || {}).forEach(([src, c]) => { crops[renamed.get(src) || src] = c; });
      out.settings = { ...data.settings, heroPhoto: renamed.get(data.settings.heroPhoto) || data.settings.heroPhoto || "" };
      if (Object.keys(crops).length) out.settings.heroCrops = crops; else delete out.settings.heroCrops;
    }
    const stillUsed = new Set(out.products.flatMap((p) => p.images));
    const deletePaths = [...removedPaths].filter((p) => !stillUsed.has(p) && p.startsWith("images/"));

    try {
      // 1. Private records go to the private repo first
      if (c.recordsChanged && recordsState === "ok") {
        $("#state").textContent = "Saving private records…";
        const r = await recordsStore.publish({
          data: records, message: "Studio: update records", expectedSha: recordsSha,
        });
        recordsSha = r.dataSha;
        originalRecords = JSON.stringify(records);
      }
      if (!c.siteCount) {
        publishing = false;
        btn.classList.remove("is-busy");
        renderList();
        toast(store.demo ? "Practice mode: records would now be saved privately." : "Private records saved. (Nothing on the public site changed.)");
        return;
      }

      // 2. Public site
      $("#state").textContent = "Saving to GitHub…";
      const res = await store.publish({ data: out, addFiles, deletePaths, message: commitMessage(c), expectedSha: dataSha });
      // Local state now matches what's on GitHub
      data.products.forEach((p) => {
        p.images = p.images.map((s) => {
          const path = renamed.get(s);
          if (path) previews.set(path, pending.get(s).url);
          return path || s;
        });
        p.crops = Object.fromEntries(Object.entries(p.crops || {})
          .map(([s, c]) => [renamed.get(s) || s, c])
          .filter(([s]) => p.images.includes(s)));
      });
      if (renamed.has(data.settings.heroPhoto)) data.settings.heroPhoto = renamed.get(data.settings.heroPhoto);
      if (data.settings.heroCrops) {
        const crops = {};
        Object.entries(data.settings.heroCrops).forEach(([src, c]) => { crops[renamed.get(src) || src] = c; });
        data.settings.heroCrops = crops;
      }
      renamed.forEach((_, id) => pending.delete(id));
      removedPaths.clear();
      dataSha = res.dataSha;
      snapshot();
      publishing = false;
      btn.classList.remove("is-busy");
      renderList();
      if (store.demo) {
        toast("Practice mode: this would now be published.");
      } else {
        $("#state").textContent = "Published · site updating…";
        toast('Published. The site updates in about a minute. <a href="./" target="_blank" rel="noopener">View site</a>', 7000);
        watchBuild(res.commitSha);
      }
    } catch (ex) {
      publishing = false;
      btn.classList.remove("is-busy");
      updateState();
      if (ex.kind === "conflict") {
        const reload = await confirmBox({
          title: "The site changed elsewhere",
          body: "Someone (maybe you, on another device) published changes since this page was opened. Reload to get the latest version. Your unpublished changes here will be lost.",
          ok: "Reload latest", danger: false,
        });
        if (reload) { await loadData(); renderList(); }
      } else {
        toast(`Couldn't publish: ${esc(ex.message || "unknown error")}`, 9000);
      }
    }
  }

  async function watchBuild(sha, tries = 0) {
    if (tries > 30) return;
    const b = await store.pagesBuild();
    if (!b) { setTimeout(() => { if (!changes().count) $("#state").textContent = "Published"; }, 60000); return; }
    if (b.commit === sha && b.status === "built") {
      if (!changes().count) $("#state").textContent = "Live on the site";
      toast('Your changes are live. <a href="./" target="_blank" rel="noopener">View site</a>');
      return;
    }
    if (b.commit === sha && b.status === "errored") {
      toast("GitHub couldn't build the site. Try publishing again in a minute.", 9000);
      return;
    }
    setTimeout(() => watchBuild(sha, tries + 1), 6000);
  }

  /* =========================================================
     App shell
     ========================================================= */
  function closeMenu() { $(".menu-pop").open = false; }

  function startApp() {
    showScreen("app");
    $("#demo-banner").hidden = !store.demo;
    renderList();
  }

  function setupApp() {
    $("#publish-btn").addEventListener("click", publish);
    $("#lock-btn").addEventListener("click", () => {
      store$.del(UNLOCK_KEY, sessionStorage);
      closeMenu();
      showScreen("lock");
    });
    $("#disconnect-btn").addEventListener("click", async () => {
      closeMenu();
      const ok = await confirmBox({
        title: "Disconnect this device?",
        body: "The GitHub token is removed from this browser. You'll need to paste a token again to make changes here.",
        ok: "Disconnect",
      });
      if (!ok) return;
      store$.del(TOKEN_KEY);
      store = null;
      showScreen("connect");
    });
    $("#discard-btn").addEventListener("click", async () => {
      closeMenu();
      const ok = await confirmBox({
        title: "Discard unpublished changes?",
        body: "Everything you changed since the last publish will be undone.",
        ok: "Discard",
      });
      if (!ok) return;
      await loadData();
      renderList();
      toast("Changes discarded.");
    });
    document.addEventListener("click", (e) => { if (!e.target.closest(".menu-pop")) closeMenu(); });
    addEventListener("beforeunload", (e) => {
      if (store && changes().count) { e.preventDefault(); e.returnValue = ""; }
    });
  }

  /* =========================================================
     Go
     ========================================================= */
  setupLock();
  setupConnect();
  setupList();
  setupEditor();
  setupCrop();
  setupSettings();
  setupApp();

  if (store$.get(UNLOCK_KEY, sessionStorage) === "1") afterUnlock();
  else showScreen("lock");
})();
