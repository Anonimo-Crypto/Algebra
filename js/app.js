(function () {
  const APP_VERSION = "2.2.0";
  const sizeBtns = document.querySelectorAll("[data-size]");
  const modeBtns = document.querySelectorAll("[data-mode]");
  const input = document.getElementById("eqs");
  const statusEl = document.getElementById("status");
  const methodsEl = document.getElementById("methods");
  const solveBtn = document.getElementById("solve");
  const out = document.getElementById("out");
  const installBtn = document.getElementById("install");
  const manualControls = document.getElementById("manualControls");
  const detectedType = document.getElementById("detectedType");
  const toast = document.getElementById("toast");

  let size = 3, mode = "auto", parsed = null, methodId = "adicion", deferredPrompt = null;
  let settings = JSON.parse(localStorage.getItem("algebra-settings") || "{}");
  settings = Object.assign({ typing: true, haptic: true, autoUpdate: true }, settings);

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const semver = v => String(v).replace(/^v/, "").split(".").map(x => Number(x) || 0);
  function isNewer(a, b) { const A = semver(a), B = semver(b); for (let i=0;i<3;i++) { if (A[i] !== B[i]) return A[i] > B[i]; } return false; }
  function saveSettings() { localStorage.setItem("algebra-settings", JSON.stringify(settings)); }
  function showToast(message, ms = 4200) { toast.textContent = message; toast.classList.add("show"); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove("show"), ms); }
  function haptic() { if (settings.haptic && navigator.vibrate) navigator.vibrate(8); }

  function detectSize() {
    const lines = input.value.split(/\n+/).map(x => x.trim()).filter(Boolean);
    const text = input.value.toLowerCase();
    const vars = [...new Set((text.match(/[xyz]/g) || []))];
    if (vars.includes("z") || lines.length === 3 || vars.length >= 3) return 3;
    if (lines.length === 2 || vars.length === 2) return 2;
    return null;
  }

  function effectiveSize() { return mode === "auto" ? (detectSize() || size) : size; }
  function setSize(n) {
    size = n;
    sizeBtns.forEach(b => b.classList.toggle("on", Number(b.dataset.size) === n));
    validate();
  }
  function setMode(next) {
    mode = next;
    modeBtns.forEach(b => b.classList.toggle("on", b.dataset.mode === mode));
    manualControls.classList.toggle("hidden", mode !== "manual");
    validate();
  }
  sizeBtns.forEach(b => b.addEventListener("click", () => setSize(Number(b.dataset.size))));
  modeBtns.forEach(b => b.addEventListener("click", () => setMode(b.dataset.mode)));
  input.addEventListener("input", validate);

  function validate() {
    const currentSize = effectiveSize();
    const detected = detectSize();
    if (mode === "auto") {
      detectedType.textContent = detected ? `Detectado automáticamente: sistema ${detected}×${detected}` : "Escribe las ecuaciones para detectar el problema";
    } else detectedType.textContent = `Selección manual: sistema ${size}×${size}`;

    if (!input.value.trim()) {
      parsed = null; methodsEl.innerHTML = ""; solveBtn.disabled = true;
      statusEl.textContent = "Escribe las ecuaciones para comenzar."; statusEl.className = "status";
      return;
    }
    parsed = parseSystem(input.value, currentSize);
    methodsEl.innerHTML = "";
    if (!parsed.ok) {
      statusEl.textContent = parsed.error; statusEl.className = "status err"; solveBtn.disabled = true; return;
    }
    statusEl.textContent = `Sistema ${currentSize}×${currentSize} listo.`; statusEl.className = "status ok";
    Object.values(METHODS).forEach(method => {
      const chip = document.createElement("button"); chip.type = "button";
      chip.className = "chip" + (method.id === methodId ? " on" : ""); chip.textContent = method.name;
      chip.addEventListener("click", () => { methodId = method.id; [...methodsEl.children].forEach(c => c.classList.toggle("on", c === chip)); });
      methodsEl.appendChild(chip);
    });
    solveBtn.disabled = false;
  }

  async function typeTitle(el, text) {
    if (!settings.typing) { el.textContent = text; return; }
    el.textContent = "";
    for (const char of text) { el.textContent += char; await sleep(char === " " ? 12 : 24); }
  }

  async function renderResult(result) {
    out.innerHTML = "";
    for (let i = 0; i < result.steps.length; i++) {
      const step = result.steps[i];
      const article = document.createElement("article");
      article.className = "solution-step";
      const title = document.createElement("h2");
      const content = document.createElement("div"); content.className = "step-content";
      content.innerHTML = renderMarkdown(step.markdown);
      article.append(title, content); out.appendChild(article);
      article.scrollIntoView({ behavior: i === 0 ? "auto" : "smooth", block: "nearest" });
      await typeTitle(title, step.titulo);
      haptic();
      await sleep(settings.typing ? Math.min(420, 130 + step.markdown.length * 1.4) : 90);
    }
  }

  solveBtn.addEventListener("click", async () => {
    validate(); if (!parsed || !parsed.ok) return;
    solveBtn.disabled = true; solveBtn.textContent = "Resolviendo…";
    try { await renderResult(solveSystem(parsed, methodId)); }
    catch (err) { out.innerHTML = `<article class="solution-step visible"><h2>Error</h2><div class="md-text">${String(err.message || err)}</div></article>`; }
    finally { solveBtn.disabled = false; solveBtn.textContent = "Resolver"; }
  });

  // Settings
  const bindSetting = (id, key) => { const el = document.getElementById(id); el.checked = !!settings[key]; el.addEventListener("change", () => { settings[key] = el.checked; saveSettings(); }); };
  bindSetting("typingToggle", "typing"); bindSetting("hapticToggle", "haptic"); bindSetting("autoUpdateToggle", "autoUpdate");

  // Versioning and updates
  const updateModal = document.getElementById("updateModal");
  const updateFilesEl = document.getElementById("updateFiles");
  const updateDownloadArea = document.getElementById("updateDownloadArea");
  const updateDownloadBtn = document.getElementById("downloadUpdate");
  const applyUpdateBtn = document.getElementById("applyUpdate");
  let availableUpdate = null;

  function closeUpdateModal() { updateModal.classList.add("hidden"); }
  document.getElementById("closeUpdate").addEventListener("click", closeUpdateModal);
  document.getElementById("laterUpdate").addEventListener("click", closeUpdateModal);
  updateModal.addEventListener("click", e => { if (e.target === updateModal) closeUpdateModal(); });

  async function fetchUpdateManifest(remote) {
    const path = remote.updateManifest || "./update-manifest.json";
    const response = await fetch(`${path}${path.includes("?") ? "&" : "?"}t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudo obtener el manifiesto de actualización.");
    return response.json();
  }

  function showUpdateScreen(manifest) {
    availableUpdate = manifest;
    document.getElementById("updateVersion").textContent = `v${manifest.version}`;
    document.getElementById("updateRelease").textContent = manifest.release || "Fecha no especificada";
    document.getElementById("updateSummary").textContent = `Hay una nueva versión disponible. La descarga es opcional.`;
    const notes = Array.isArray(manifest.notes) ? manifest.notes : [manifest.notes || "Nueva versión disponible."];
    document.getElementById("updateNotes").innerHTML = notes.filter(Boolean).map(note => `<div>• ${note}</div>`).join("");
    updateFilesEl.innerHTML = "";
    updateDownloadArea.classList.add("hidden");
    updateDownloadBtn.classList.remove("hidden");
    applyUpdateBtn.classList.add("hidden");
    updateDownloadBtn.disabled = false;
    updateDownloadBtn.textContent = "Descargar actualización";
    updateModal.classList.remove("hidden");
  }

  async function checkUpdate(silent = false) {
    if (!navigator.onLine) { if (!silent) showToast("Sin conexión. No es posible buscar actualizaciones."); return null; }
    try {
      const r = await fetch(`./version.json?t=${Date.now()}`, { cache: "no-store" });
      if (!r.ok) throw new Error("No disponible");
      const remote = await r.json();
      if (isNewer(remote.version, APP_VERSION)) {
        document.getElementById("updateStatus").textContent = `Nueva versión v${remote.version}`;
        const manifest = await fetchUpdateManifest(remote);
        if (!silent) showUpdateScreen(manifest);
        else showToast(`Actualización disponible: v${remote.version}`, 5000);
        availableUpdate = manifest;
        return manifest;
      }
      document.getElementById("updateStatus").textContent = "Ya tienes la última versión";
      if (!silent) showToast(`Álgebra está actualizado: v${APP_VERSION}`);
      return remote;
    } catch (err) { if (!silent) showToast("No se pudo comprobar la actualización."); return null; }
  }

  document.getElementById("checkUpdate").addEventListener("click", () => checkUpdate(false));
  if (settings.autoUpdate && navigator.onLine) setTimeout(() => checkUpdate(true), 1600);
  window.addEventListener("online", () => { if (settings.autoUpdate) checkUpdate(true); });

  function cacheKey(path) { return new URL(path, location.href).href; }

  function buildFileCards(container, files, prefix) {
    container.innerHTML = "";
    return files.map(file => {
      const el = document.createElement("div"); el.className = "offline-file";
      el.innerHTML = `<div class="file-circle"><svg viewBox="0 0 36 36"><path class="circle-bg" d="M18 2.5a15.5 15.5 0 1 1 0 31a15.5 15.5 0 1 1 0-31"/><path class="circle-progress" d="M18 2.5a15.5 15.5 0 1 1 0 31a15.5 15.5 0 1 1 0-31" stroke-dasharray="0,100"/></svg><span>0%</span></div><div class="file-meta"><strong>${file.label || file.path}</strong><small>Calculando tamaño…</small></div>`;
      container.appendChild(el);
      return { file, el, loaded: 0, total: 0 };
    });
  }

  async function downloadUpdate() {
    if (!availableUpdate?.files?.length) return;
    if (!navigator.onLine) { showToast("Necesitas conexión para descargar la actualización."); return; }
    updateDownloadBtn.disabled = true;
    updateDownloadBtn.textContent = "Descargando…";
    updateDownloadArea.classList.remove("hidden");
    const cacheName = `algebra-update-${availableUpdate.version}`;
    const cache = await caches.open(cacheName);
    const cards = buildFileCards(updateFilesEl, availableUpdate.files);
    const sizes = await Promise.all(cards.map(async item => {
      try { const head = await fetch(item.file.path, { method: "HEAD", cache: "no-store" }); return Number(head.headers.get("content-length")) || 0; }
      catch (_) { return 0; }
    }));
    cards.forEach((item, i) => item.total = sizes[i]);
    let totalKnown = sizes.reduce((a, b) => a + b, 0), totalLoaded = 0;
    const started = performance.now();
    try {
      for (const item of cards) {
        const response = await fetch(item.file.path, { cache: "no-store" });
        if (!response.ok) throw new Error(`No se pudo descargar ${item.file.label || item.file.path}`);
        const contentLength = Number(response.headers.get("content-length")) || 0;
        if (!item.total && contentLength) { item.total = contentLength; totalKnown += contentLength; }
        const reader = response.body?.getReader(); const chunks = [];
        if (reader) {
          while (true) {
            const { done, value } = await reader.read(); if (done) break;
            chunks.push(value); item.loaded += value.byteLength; totalLoaded += value.byteLength;
            updateTransferUI(item, totalLoaded, totalKnown, started, {
              bar: "updateOverallBar", percent: "updateOverallPercent", speed: "updateDownloadSpeed"
            }, false);
          }
          const blob = new Blob(chunks, { type: response.headers.get("content-type") || "application/octet-stream" });
          await cache.put(cacheKey(item.file.path), new Response(blob, { headers: { "content-type": blob.type } }));
        } else {
          const copy = response.clone();
          await cache.put(cacheKey(item.file.path), copy);
          item.loaded = item.total || 0;
        }
        if (!item.total) { item.total = item.loaded; totalKnown += item.loaded; }
        if (item.loaded < item.total) totalLoaded += item.total - item.loaded;
        item.loaded = item.total;
        updateTransferUI(item, totalLoaded, totalKnown, started, {
          bar: "updateOverallBar", percent: "updateOverallPercent", speed: "updateDownloadSpeed"
        }, true);
      }
      document.getElementById("updateOverallBar").style.width = "100%";
      document.getElementById("updateOverallPercent").textContent = "100%";
      document.getElementById("updateSummary").textContent = `La versión v${availableUpdate.version} está lista para aplicarse.`;
      localStorage.setItem("algebra-pending-update", JSON.stringify({ version: availableUpdate.version, cache: cacheName }));
      updateDownloadBtn.classList.add("hidden"); applyUpdateBtn.classList.remove("hidden");
      showToast("Actualización descargada. Puedes aplicarla cuando quieras."); haptic();
    } catch (err) {
      updateDownloadBtn.disabled = false; updateDownloadBtn.textContent = "Reintentar descarga";
      document.getElementById("updateSummary").textContent = String(err.message || err);
    }
  }

  updateDownloadBtn.addEventListener("click", downloadUpdate);
  applyUpdateBtn.addEventListener("click", async () => {
    const pending = JSON.parse(localStorage.getItem("algebra-pending-update") || "null");
    if (!pending) return;
    try {
      const reg = await navigator.serviceWorker?.ready;
      if (reg?.active) reg.active.postMessage({ type: "ACTIVATE_DOWNLOADED_UPDATE", version: pending.version, cache: pending.cache });
      else if (navigator.serviceWorker?.controller) navigator.serviceWorker.controller.postMessage({ type: "ACTIVATE_DOWNLOADED_UPDATE", version: pending.version, cache: pending.cache });
      localStorage.removeItem("algebra-pending-update");
      localStorage.setItem("algebra-last-applied-version", pending.version);
      document.getElementById("updateSummary").textContent = "Actualización aplicada. Reiniciando…";
      setTimeout(() => location.reload(), 350);
    } catch (_) { showToast("No se pudo aplicar automáticamente. Reinicia la aplicación."); }
  });
  // Offline download with aggregate and per-file progress
  const modal = document.getElementById("offlineModal"), offlineFiles = document.getElementById("offlineFiles");
  document.getElementById("offlineBtn").addEventListener("click", prepareOffline);
  document.getElementById("closeOffline").addEventListener("click", () => modal.classList.add("hidden"));
  modal.addEventListener("click", e => { if (e.target === modal) modal.classList.add("hidden"); });

  async function prepareOffline() {
    modal.classList.remove("hidden"); offlineFiles.innerHTML = "";
    document.getElementById("offlineSummary").textContent = "Preparando lista de archivos…";
    try {
      const manifest = await fetch("./offline-manifest.json", { cache: "no-store" }).then(r => r.json());
      const cache = await caches.open(`algebra-offline-${manifest.version}`);
      // Intentamos conocer los tamaños antes de iniciar para que la barra general sea más precisa.
      const sizes = await Promise.all(manifest.files.map(async file => {
        try { const head = await fetch(file.path, { method: "HEAD", cache: "no-store" }); return Number(head.headers.get("content-length")) || 0; }
        catch (_) { return 0; }
      }));
      const cards = manifest.files.map((file, index) => {
        const el = document.createElement("div"); el.className = "offline-file";
        el.innerHTML = `<div class="file-circle"><svg viewBox="0 0 36 36"><path class="circle-bg" d="M18 2.5a15.5 15.5 0 1 1 0 31a15.5 15.5 0 1 1 0-31"/><path class="circle-progress" d="M18 2.5a15.5 15.5 0 1 1 0 31a15.5 15.5 0 1 1 0-31" stroke-dasharray="0,100"/></svg><span>0%</span></div><div class="file-meta"><strong>${file.label}</strong><small>Calculando tamaño…</small></div>`;
        offlineFiles.appendChild(el); return { file, el, loaded: 0, total: sizes[index] || 0 };
      });
      const started = performance.now();
      let totalLoaded = 0, totalKnown = sizes.reduce((sum, value) => sum + value, 0);
      for (const item of cards) {
        const response = await fetch(item.file.path, { cache: "no-store" });
        if (!response.ok) throw new Error(`No se pudo descargar ${item.file.label}`);
        const length = Number(response.headers.get("content-length")) || 0;
        if (!item.total && length) { item.total = length; totalKnown += length; }
        const reader = response.body?.getReader(); const chunks = [];
        if (reader) {
          while (true) {
            const { done, value } = await reader.read(); if (done) break;
            chunks.push(value); item.loaded += value.byteLength; totalLoaded += value.byteLength;
            updateOfflineUI(item, totalLoaded, totalKnown, started, false);
          }
          const blob = new Blob(chunks, { type: response.headers.get("content-type") || "application/octet-stream" });
          await cache.put(item.file.path, new Response(blob, { headers: { "content-type": blob.type } }));
        } else await cache.put(item.file.path, response.clone());
        if (!item.total) { item.total = item.loaded; totalKnown += item.loaded; }
        item.loaded = item.total || item.loaded;
        updateOfflineUI(item, totalLoaded, totalKnown, started, true);
      }
      document.getElementById("overallBar").style.width = "100%"; document.getElementById("overallPercent").textContent = "100%";
      document.getElementById("offlineSummary").textContent = "Modo Offline preparado correctamente.";
      showToast("Todos los archivos están disponibles sin conexión."); haptic();
    } catch (err) { document.getElementById("offlineSummary").textContent = String(err.message || err); }
  }
  function updateOfflineUI(item, loaded, total, started, done) {
    const percent = item.total ? Math.min(100, item.loaded / item.total * 100) : (done ? 100 : 0);
    item.el.querySelector(".circle-progress").setAttribute("stroke-dasharray", `${percent},100`);
    item.el.querySelector(".file-circle span").textContent = `${Math.round(percent)}%`;
    item.el.querySelector(".file-meta small").textContent = item.total ? `${formatBytes(item.loaded)} / ${formatBytes(item.total)}` : `${formatBytes(item.loaded)}`;
    const overall = total ? Math.min(100, loaded / total * 100) : 0;
    document.getElementById("overallBar").style.width = `${overall}%`; document.getElementById("overallPercent").textContent = `${Math.round(overall)}%`;
    const seconds = Math.max(.001, (performance.now() - started) / 1000);
    document.getElementById("downloadSpeed").textContent = `${formatBytes(loaded / seconds)}/s`;
  }
  function updateTransferUI(item, loaded, total, started, ids, done) {
    const percent = item.total ? Math.min(100, item.loaded / item.total * 100) : (done ? 100 : 0);
    item.el.querySelector(".circle-progress").setAttribute("stroke-dasharray", `${percent},100`);
    item.el.querySelector(".file-circle span").textContent = `${Math.round(percent)}%`;
    item.el.querySelector(".file-meta small").textContent = item.total ? `${formatBytes(item.loaded)} / ${formatBytes(item.total)}` : `${formatBytes(item.loaded)}`;
    const overall = total ? Math.min(100, loaded / total * 100) : 0;
    document.getElementById(ids.bar).style.width = `${overall}%`;
    document.getElementById(ids.percent).textContent = `${Math.round(overall)}%`;
    const seconds = Math.max(.001, (performance.now() - started) / 1000);
    document.getElementById(ids.speed).textContent = `${formatBytes(loaded / seconds)}/s`;
  }

  function formatBytes(bytes) { if (!bytes) return "0 B"; const units=["B","KB","MB","GB"]; const i=Math.min(Math.floor(Math.log(bytes)/Math.log(1024)), units.length-1); return `${(bytes/1024**i).toFixed(i?1:0)} ${units[i]}`; }

  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferredPrompt = e; installBtn.classList.add("ready"); });
  installBtn.addEventListener("click", async () => { if (!deferredPrompt) { showToast("La instalación depende del navegador. Usa el menú del navegador para instalar la aplicación."); return; } deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; installBtn.classList.remove("ready"); });

  document.getElementById("versionBadge").textContent = `v${APP_VERSION}`;
  document.getElementById("footerVersion").textContent = `v${APP_VERSION}`;
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});

  // Opening signature: shown on every fresh application load.
  document.body.classList.add("app-booting");
  const splash = document.getElementById("splash");
  const appShell = document.querySelector(".app-shell");
  requestAnimationFrame(() => {
    requestAnimationFrame(() => splash?.classList.add("visible"));
    setTimeout(() => {
      splash?.classList.add("leaving");
      setTimeout(() => {
        document.body.classList.remove("app-booting");
        appShell?.classList.add("entering");
        setTimeout(() => splash?.remove(), 650);
      }, 520);
    }, 2600);
  });

  // Al volver desde otra aplicación, nunca dejamos una capa ni el estado de cierre bloqueando los toques.
  function restoreInteractivity() {
    document.body.classList.remove("app-closing");
    if (splash && !document.body.classList.contains("app-booting")) splash.style.pointerEvents = "none";
    document.querySelectorAll("button, input, textarea").forEach(el => { el.style.pointerEvents = "auto"; });
  }
  window.addEventListener("pageshow", restoreInteractivity);
  window.addEventListener("focus", restoreInteractivity);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") restoreInteractivity();
  });
  validate();
})();
