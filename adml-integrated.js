/*
 * ADML integrated runtime
 *
 * The loader is intentionally data-free: ZIP files are the only plugin boundary.
 * All visible loader copy is English. The i18n API is exposed for language-pack mods.
 */

const STORAGE_KEY = "adml_integrated_plugins_v2";
const ENABLED_KEY = "adml_integrated_enabled_v2";
const ENDGAME_KEY = "adml_integrated_endgame_v1";
const JSZIP_URL = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";

class IntegratedADML {
  constructor() {
    this.version = "2.2.0-integrated";
    this.plugins = new Map();
    this.styles = new Map();
    this.patches = new Map();
    this.listeners = new Map();
    this.installed = this.read(STORAGE_KEY, {});
    this.enabled = new Set(this.read(ENABLED_KEY, []));
    this.overlay = null;
    this.overlayRoot = null;
    this.i18nPacks = new Map();
    this.i18nLocale = null;
    this.i18nObserver = null;
    this.i18nOriginalText = new WeakMap();
    this.endgameLayers = new Map();
    this.endgameState = this.read(ENDGAME_KEY, { resources: {} });
  }

  read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  }

  persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.installed));
    localStorage.setItem(ENABLED_KEY, JSON.stringify([...this.enabled]));
    localStorage.setItem(ENDGAME_KEY, JSON.stringify(this.endgameState));
  }

  async init() {
    this.injectStyles();
    this.mountButton();
    this.emitLoop = window.setInterval(() => this.emit("update", { delta: 1 }), 1000);
    for (const id of this.enabled) {
      if (this.installed[id]) await this.load(this.installed[id]);
    }
  }

  injectStyles() {
    const node = document.createElement("style");
    node.id = "adml-int-core-style";
    node.textContent = `
      #adml-int-overlay, #adml-int-overlay *, #adml-int-button, #adml-int-button * { box-sizing: border-box; }
      #adml-int-button { position: fixed; z-index: 2147483000; top: 12px; right: 16px; min-width: 88px; margin: 0; padding: 9px 12px; border: 1px solid #e6a35c; border-radius: 0; background: rgba(12, 18, 24, .96); color: #e6a35c; font: 700 12px/1.1 monospace; letter-spacing: .08em; text-align: center; cursor: pointer; box-shadow: 0 5px 18px rgba(0,0,0,.28); appearance: none; }
      #adml-int-button:hover, #adml-int-button:focus-visible { background: #e6a35c; color: #10151b; outline: 2px solid rgba(230,163,92,.35); outline-offset: 2px; }
      #adml-int-overlay { position: fixed; z-index: 2147482000; inset: 0; display: flex; align-items: flex-start; justify-content: center; padding: clamp(58px, 8vh, 92px) 18px 28px; overflow-y: auto; background: rgba(5, 9, 13, .82); color: #edf1ec; font-family: Arial, Helvetica, sans-serif; text-align: left; }
      #adml-int-modal { width: min(720px, 100%); max-height: calc(100vh - 110px); overflow: auto; margin: 0; padding: 0; background: #0d151c; color: #edf1ec; border: 1px solid #e6a35c; border-radius: 0; box-shadow: 18px 18px 0 rgba(230,163,92,.12); }
      #adml-int-modal button, #adml-int-modal input { box-sizing: border-box; margin: 0; border-radius: 0; font-family: monospace; line-height: 1.2; }
      #adml-int-modal button { appearance: none; text-transform: none; }
      .adml-int-head { display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; padding: 20px 22px; border-bottom: 1px solid rgba(155,212,215,.2); }
      .adml-int-kicker { color: #9bd4d7; font: 10px/1.2 monospace; letter-spacing: .14em; }
      .adml-int-title { margin: 8px 0 0; padding: 0; color: #f3f1e8; font: 700 24px/1.1 Arial, Helvetica, sans-serif; letter-spacing: -.035em; }
      .adml-int-version { color: #71848e; font: 11px/1 monospace; font-weight: 400; }
      .adml-int-close, .adml-int-secondary { border: 1px solid rgba(155,212,215,.4); background: transparent; color: #9bd4d7; padding: 8px 11px; font: 11px/1 monospace; cursor: pointer; }
      .adml-int-close:hover, .adml-int-close:focus-visible, .adml-int-secondary:hover, .adml-int-secondary:focus-visible { background: rgba(155,212,215,.12); outline: none; }
      .adml-int-body { padding: 18px 22px 22px; }
      .adml-int-warning { margin: 0 0 18px; padding: 12px 14px; border-left: 2px solid #f27c6b; color: #b7c5c7; background: rgba(242,124,107,.06); font: 12px/1.55 Arial, Helvetica, sans-serif; }
      .adml-int-warning strong { color: #f27c6b; }
      .adml-int-list { display: grid; gap: 10px; }
      .adml-int-card { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 16px; align-items: start; padding: 15px; border: 1px solid rgba(243,241,232,.15); background: rgba(255,255,255,.025); }
      .adml-int-card:hover { border-color: rgba(230,163,92,.7); }
      .adml-int-name { color: #e6a35c; font: 700 16px/1.2 Arial, Helvetica, sans-serif; }
      .adml-int-meta, .adml-int-description, .adml-int-files { margin-top: 6px; color: #97a9ae; font: 12px/1.5 Arial, Helvetica, sans-serif; }
      .adml-int-files { color: #9bd4d7; font-family: monospace; font-size: 10px; overflow-wrap: anywhere; }
      .adml-int-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; align-items: flex-start; gap: 7px; }
      .adml-int-primary, .adml-int-danger { min-width: 86px; padding: 9px 11px; border: 1px solid #e6a35c; background: #e6a35c; color: #0b1016; cursor: pointer; font: 700 10px/1 monospace; }
      .adml-int-primary:hover, .adml-int-primary:focus-visible { background: transparent; color: #e6a35c; outline: none; }
      .adml-int-danger { border-color: #f27c6b; background: transparent; color: #f27c6b; }
      .adml-int-danger:hover, .adml-int-danger:focus-visible { background: #f27c6b; color: #0b1016; outline: none; }
      .adml-int-install { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; margin-top: 18px; padding-top: 18px; border-top: 1px solid rgba(243,241,232,.15); }
      .adml-int-url { width: 100%; min-width: 0; padding: 10px; border: 1px solid rgba(155,212,215,.32); background: #080d12; color: #f3f1e8; font: 11px/1.2 monospace; }
      .adml-int-url::placeholder { color: #71848e; }.adml-int-url:focus { outline: 1px solid #9bd4d7; }
      .adml-int-empty { padding: 32px 12px; color: #7f9299; text-align: center; font: 11px/1.7 monospace; border: 1px dashed rgba(155,212,215,.2); }
      .adml-int-inspector { margin-top: 12px; padding: 12px; white-space: pre-wrap; overflow-wrap: anywhere; color: #cbd9d6; background: #080d12; border: 1px solid rgba(155,212,215,.2); font: 11px/1.6 monospace; }
      .adml-int-toast { position: fixed; z-index: 2147482500; right: 18px; bottom: 18px; max-width: min(360px, calc(100vw - 36px)); padding: 12px 15px; border-left: 2px solid #e6a35c; background: #0d151c; color: #e9eee9; box-shadow: 9px 9px 0 rgba(230,163,92,.1); font: 11px/1.5 monospace; }
      .adml-int-file-button { margin-top: 8px !important; }
      @media (max-width: 620px) {
        #adml-int-button { top: 8px; right: 8px; min-width: 76px; padding: 8px 10px; }
        #adml-int-overlay { align-items: flex-start; padding: 48px 8px 14px; }
        #adml-int-modal { max-height: calc(100vh - 62px); }
        .adml-int-head, .adml-int-body { padding-left: 14px; padding-right: 14px; }
        .adml-int-head { gap: 10px; }.adml-int-title { font-size: 20px; }.adml-int-close { flex: 0 0 auto; }
        .adml-int-card, .adml-int-install { grid-template-columns: 1fr; }
        .adml-int-actions { justify-content: flex-start; }.adml-int-primary, .adml-int-danger, .adml-int-secondary { min-width: 0; }
      }
    `;
    document.head.appendChild(node);
  }

  mountButton() {
    if (document.getElementById("adml-int-button")) return;
    const button = document.createElement("button");
    button.id = "adml-int-button";
    button.type = "button";
    button.textContent = "MODS";
    button.title = "ADML Plugin Manager";
    button.addEventListener("click", () => this.openManager());
    document.body.appendChild(button);
  }

  async ensureJSZip() {
    if (window.JSZip) return window.JSZip;
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = JSZIP_URL;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Unable to load JSZip. Check your network connection."));
      document.head.appendChild(script);
    });
    return window.JSZip;
  }

  openManager() {
    if (this.overlay) this.overlay.remove();
    const host = document.createElement("div");
    host.id = "adml-int-overlay-host";
    Object.assign(host.style, { position: "fixed", inset: "0", zIndex: "2147482000" });
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = `
      <style>
        :host { all: initial; }
        *, *::before, *::after { box-sizing: border-box; }
        #adml-int-overlay { position: absolute; inset: 0; display: flex; align-items: flex-start; justify-content: center; padding: clamp(58px, 8vh, 92px) 18px 28px; overflow-y: auto; background: rgba(5, 9, 13, .84); color: #edf1ec; font-family: Arial, Helvetica, sans-serif; text-align: left; }
        #adml-int-modal { width: min(720px, 100%); max-height: calc(100vh - 110px); overflow: auto; margin: 0; padding: 0; background: #0d151c; color: #edf1ec; border: 1px solid #e6a35c; box-shadow: 18px 18px 0 rgba(230,163,92,.12); }
        #adml-int-modal, #adml-int-modal * { box-sizing: border-box; }
        #adml-int-modal h2, #adml-int-modal p, #adml-int-modal strong, #adml-int-modal button, #adml-int-modal input { margin: 0; padding: 0; font: inherit; line-height: 1.25; }
        #adml-int-modal button { appearance: none; text-transform: none; border-radius: 0; cursor: pointer; }
        .adml-int-head { display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; padding: 20px 22px; border-bottom: 1px solid rgba(155,212,215,.2); }
        .adml-int-kicker { color: #9bd4d7; font: 10px/1.2 monospace; letter-spacing: .14em; }
        .adml-int-title { margin-top: 8px !important; color: #f3f1e8; font: 700 24px/1.1 Arial, Helvetica, sans-serif !important; letter-spacing: -.035em; }
        .adml-int-version { color: #71848e; font: 11px/1 monospace; font-weight: 400; }
        .adml-int-close, .adml-int-secondary { border: 1px solid rgba(155,212,215,.4); background: transparent; color: #9bd4d7; padding: 8px 11px !important; font: 11px/1 monospace !important; }
        .adml-int-close:hover, .adml-int-close:focus-visible, .adml-int-secondary:hover, .adml-int-secondary:focus-visible { background: rgba(155,212,215,.12); outline: none; }
        .adml-int-body { padding: 18px 22px 22px; }
        .adml-int-warning { margin: 0 0 18px; padding: 12px 14px; border-left: 2px solid #f27c6b; color: #b7c5c7; background: rgba(242,124,107,.06); font: 12px/1.55 Arial, Helvetica, sans-serif; }
        .adml-int-warning strong { color: #f27c6b; }
        .adml-int-list { display: grid; gap: 10px; }
        .adml-int-card { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 16px; align-items: start; padding: 15px; border: 1px solid rgba(243,241,232,.15); background: rgba(255,255,255,.025); }
        .adml-int-card:hover { border-color: rgba(230,163,92,.7); }
        .adml-int-name { color: #e6a35c; font: 700 16px/1.2 Arial, Helvetica, sans-serif; }
        .adml-int-meta, .adml-int-description, .adml-int-files { margin-top: 6px; color: #97a9ae; font: 12px/1.5 Arial, Helvetica, sans-serif; }
        .adml-int-files { color: #9bd4d7; font-family: monospace; font-size: 10px; overflow-wrap: anywhere; }
        .adml-int-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; align-items: flex-start; gap: 7px; }
        .adml-int-primary, .adml-int-danger { min-width: 86px; padding: 9px 11px !important; border: 1px solid #e6a35c; background: #e6a35c; color: #0b1016; font: 700 10px/1 monospace !important; }
        .adml-int-primary:hover, .adml-int-primary:focus-visible { background: transparent; color: #e6a35c; outline: none; }
        .adml-int-danger { border-color: #f27c6b; background: transparent; color: #f27c6b; }
        .adml-int-danger:hover, .adml-int-danger:focus-visible { background: #f27c6b; color: #0b1016; outline: none; }
        .adml-int-install { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; margin-top: 18px; padding-top: 18px; border-top: 1px solid rgba(243,241,232,.15); }
        .adml-int-dropzone { display: flex; align-items: center; justify-content: center; min-height: 78px; margin-top: 10px; padding: 16px; border: 1px dashed rgba(155,212,215,.45); background: rgba(155,212,215,.035); color: #9bd4d7; font: 11px/1.45 monospace; letter-spacing: .05em; text-align: center; cursor: pointer; transition: background .16s ease, border-color .16s ease, color .16s ease; }
        .adml-int-dropzone:hover, .adml-int-dropzone:focus-visible, .adml-int-dropzone.is-over { border-color: #e6a35c; background: rgba(230,163,92,.1); color: #e6a35c; outline: none; }
        .adml-int-forge-view { padding: 20px 22px 22px; }.adml-int-forge-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }.adml-int-forge-label { display: block; margin-bottom: 6px; color: #9bd4d7; font: 10px/1.2 monospace; letter-spacing: .08em; }.adml-int-forge-select, .adml-int-forge-textarea { width: 100%; border: 1px solid rgba(155,212,215,.32); background: #080d12; color: #f3f1e8; padding: 10px !important; font: 11px/1.45 monospace !important; }.adml-int-forge-select { min-height: 36px; }.adml-int-forge-textarea { min-height: 240px; resize: vertical; }.adml-int-forge-code { min-height: 340px; }.adml-int-forge-note { margin-top: 12px; padding: 10px 12px; border-left: 2px solid #e6a35c; background: rgba(230,163,92,.06); color: #b7c5c7; font: 11px/1.5 Arial, Helvetica, sans-serif; }.adml-int-forge-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
        .adml-int-url { width: 100%; min-width: 0; padding: 10px !important; border: 1px solid rgba(155,212,215,.32); background: #080d12; color: #f3f1e8; font: 11px/1.2 monospace !important; }
        .adml-int-url::placeholder { color: #71848e; }.adml-int-url:focus { outline: 1px solid #9bd4d7; }
        .adml-int-empty { padding: 32px 12px; color: #7f9299; text-align: center; font: 11px/1.7 monospace; border: 1px dashed rgba(155,212,215,.2); }
        .adml-int-inspector { margin-top: 12px; padding: 12px; white-space: pre-wrap; overflow-wrap: anywhere; color: #cbd9d6; background: #080d12; border: 1px solid rgba(155,212,215,.2); font: 11px/1.6 monospace; }
        .adml-int-file-button { margin-top: 8px !important; }
        @media (max-width: 620px) {
          #adml-int-overlay { align-items: flex-start; padding: 48px 8px 14px; }
          #adml-int-modal { max-height: calc(100vh - 62px); }
          .adml-int-head, .adml-int-body { padding-left: 14px; padding-right: 14px; }
          .adml-int-head { gap: 10px; }.adml-int-title { font-size: 20px !important; }.adml-int-close { flex: 0 0 auto; }
          .adml-int-card, .adml-int-install, .adml-int-forge-grid { grid-template-columns: 1fr; }
          .adml-int-actions { justify-content: flex-start; }.adml-int-primary, .adml-int-danger, .adml-int-secondary { min-width: 0; }
          .adml-int-forge-view { padding-left: 14px; padding-right: 14px; }.adml-int-forge-textarea { min-height: 210px; }
        }
      </style>
      <div id="adml-int-overlay">
        <section id="adml-int-modal" role="dialog" aria-modal="true" aria-labelledby="adml-int-title">
          <header class="adml-int-head"><div><div class="adml-int-kicker">ADML / INTEGRATED LOADER</div><h2 id="adml-int-title" class="adml-int-title">Plugin Manager <span class="adml-int-version">${this.version}</span></h2></div><div class="adml-int-actions"><button type="button" class="adml-int-secondary adml-int-help-open">HOW TO PLAY</button><button type="button" class="adml-int-secondary adml-int-catalog-open">GITHUB CATALOG</button><button type="button" class="adml-int-secondary adml-int-forge-open">FORGE MOD</button><button type="button" class="adml-int-close">CLOSE</button></div></header>
          <div class="adml-int-body"><div class="adml-int-warning"><strong>All plugins can be installed at your own risk.</strong><br />External plugins run in the game environment under user responsibility. CORS proxy fallbacks enabled for GitHub ZIP catalogs.</div><div class="adml-int-list"></div><div class="adml-int-install"><input class="adml-int-url" type="url" placeholder="Or enter a plugin ZIP URL" aria-label="Plugin ZIP URL" /><button class="adml-int-primary adml-int-url-install" type="button">INSTALL URL</button></div><input class="adml-int-file" type="file" accept=".zip,application/zip" hidden /><div class="adml-int-dropzone" role="button" tabindex="0">DROP A LOCAL ZIP HERE<br />or click to choose a file</div></div>
        </section>
      </div>`;
    document.body.appendChild(host);
    this.overlay = host;
    this.overlayRoot = root;
    const close = () => { host.remove(); if (this.overlay === host) { this.overlay = null; this.overlayRoot = null; } };
    const backdrop = root.querySelector("#adml-int-overlay");
    backdrop.addEventListener("click", event => { if (event.target === backdrop) close(); });
    root.querySelector(".adml-int-close").addEventListener("click", close);
    root.querySelector(".adml-int-help-open").addEventListener("click", () => this.openHelp());
    root.querySelector(".adml-int-catalog-open").addEventListener("click", () => this.openCatalog());
    root.querySelector(".adml-int-forge-open").addEventListener("click", () => this.openForge());
    const fileInput = root.querySelector(".adml-int-file");
    const dropzone = root.querySelector(".adml-int-dropzone");
    dropzone.addEventListener("click", () => fileInput.click());
    dropzone.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); fileInput.click(); } });
    ["dragenter", "dragover"].forEach(type => dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.add("is-over"); }));
    ["dragleave", "drop"].forEach(type => dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.remove("is-over"); }));
    dropzone.addEventListener("drop", event => this.installFile(event.dataTransfer?.files?.[0]));
    fileInput.addEventListener("change", event => this.installFile(event.target.files?.[0]));
    root.querySelector(".adml-int-url-install").addEventListener("click", () => this.installUrl(root.querySelector(".adml-int-url").value));
    this.renderList();
  }

  renderList() {
    const list = this.overlayRoot?.querySelector(".adml-int-list");
    if (!list) return;
    list.innerHTML = "";
    const mods = Object.values(this.installed);
    if (!mods.length) {
      list.innerHTML = `<div class="adml-int-empty">No ZIP plugins installed.<br />Select a sample ZIP or your own plugin to begin.</div>`;
      return;
    }
    for (const mod of mods) {
      const enabled = this.enabled.has(mod.id);
      const card = document.createElement("article");
      card.className = "adml-int-card";
      card.innerHTML = `<div><div class="adml-int-name"></div><div class="adml-int-meta"></div><div class="adml-int-description"></div><div class="adml-int-files"></div><div class="adml-int-inspector" hidden></div></div><div class="adml-int-actions"><button class="adml-int-secondary" type="button">INSPECT</button><button class="adml-int-primary" type="button">${enabled ? "DISABLE" : "ENABLE"}</button><button class="adml-int-danger" type="button">REMOVE</button></div>`;
      card.querySelector(".adml-int-name").textContent = mod.name;
      card.querySelector(".adml-int-meta").textContent = `v${mod.version} / ${mod.author || "Unknown author"}`;
      card.querySelector(".adml-int-description").textContent = mod.description || "No description.";
      card.querySelector(".adml-int-files").textContent = (mod.files || ["manifest.json", "plugin.js"]).join("  ·  ");
      card.querySelector(".adml-int-secondary").addEventListener("click", () => {
        const inspector = card.querySelector(".adml-int-inspector");
        inspector.hidden = !inspector.hidden;
        inspector.textContent = JSON.stringify(mod.manifest, null, 2);
      });
      card.querySelector(".adml-int-primary").addEventListener("click", () => this.toggle(mod.id));
      card.querySelector(".adml-int-danger").addEventListener("click", () => this.remove(mod.id));
      list.appendChild(card);
    }
  }

  openHelp() {
    const root = this.overlayRoot;
    if (!root) return;
    root.innerHTML = `<style>:host{all:initial}*,*::before,*::after{box-sizing:border-box}#adml-int-help-shell{position:absolute;inset:0;overflow-y:auto;padding:clamp(26px,6vh,64px) 18px 28px;background:rgba(5,9,13,.96);color:#edf1ec;font-family:Arial,Helvetica,sans-serif;text-align:left}#adml-int-help{width:min(820px,100%);margin:0 auto;background:#0d151c;border:1px solid #9bd4d7;box-shadow:18px 18px 0 rgba(155,212,215,.1)}#adml-int-help h2,#adml-int-help h3,#adml-int-help p,#adml-int-help button,#adml-int-help code{margin:0;font:inherit;line-height:1.4}.adml-int-help-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:20px 22px;border-bottom:1px solid rgba(155,212,215,.2)}.adml-int-help-kicker{color:#9bd4d7;font:10px/1.2 monospace!important;letter-spacing:.14em}.adml-int-help-title{margin-top:8px!important;color:#f3f1e8;font:700 25px/1.1 Arial,Helvetica,sans-serif!important}.adml-int-help-subtitle{margin-top:8px!important;color:#97a9ae;font:12px/1.5 Arial,Helvetica,sans-serif!important}.adml-int-help-actions{display:flex;flex-wrap:wrap;gap:8px}.adml-int-help-back,.adml-int-help-close{border:1px solid rgba(155,212,215,.45);background:transparent;color:#9bd4d7;padding:9px 11px;cursor:pointer;font:10px/1 monospace!important}.adml-int-help-body{padding:20px 22px 26px}.adml-int-help-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.adml-int-help-card{border:1px solid rgba(243,241,232,.16);background:rgba(255,255,255,.025);padding:15px}.adml-int-help-number{color:#e6a35c;font:11px/1 monospace!important}.adml-int-help-card h3{margin-top:9px!important;color:#f3f1e8;font:700 16px/1.25 Arial,Helvetica,sans-serif!important}.adml-int-help-card p{margin-top:8px!important;color:#b7c5c7;font:12px/1.55 Arial,Helvetica,sans-serif!important}.adml-int-help-card code{color:#9bd4d7;font:11px/1.45 monospace!important}.adml-int-help-note{margin-top:14px!important;padding:12px 14px;border-left:2px solid #e6a35c;background:rgba(230,163,92,.06);color:#b7c5c7;font:11px/1.55 Arial,Helvetica,sans-serif!important}@media(max-width:680px){#adml-int-help-shell{padding:12px 8px}.adml-int-help-head,.adml-int-help-body{padding-left:14px;padding-right:14px}.adml-int-help-grid{grid-template-columns:1fr}.adml-int-help-title{font-size:21px!important}}</style><div id="adml-int-help-shell"><section id="adml-int-help" role="dialog" aria-labelledby="adml-int-help-title"><header class="adml-int-help-head"><div><div class="adml-int-help-kicker">ADML / HOW TO PLAY</div><h2 id="adml-int-help-title" class="adml-int-help-title">Play, install, extend.</h2><p class="adml-int-help-subtitle">A short guide to the integrated game and its ZIP plugin workflow.</p></div><div class="adml-int-help-actions"><button class="adml-int-help-back" type="button">BACK TO MODS</button><button class="adml-int-help-close" type="button">CLOSE</button></div></header><div class="adml-int-help-body"><div class="adml-int-help-grid"><article class="adml-int-help-card"><div class="adml-int-help-number">01 / PLAY</div><h3>Start the game</h3><p>Open the integrated site and use the normal Antimatter Dimensions controls. Progress is saved by the game in your browser.</p></article><article class="adml-int-help-card"><div class="adml-int-help-number">02 / GET A MOD</div><h3>Use a ZIP from <code>adml-plugin</code></h3><p>Download a sample ZIP from the portal or open <strong>GITHUB CATALOG</strong>. The catalog only reads public repositories tagged with the official <code>adml-plugin</code> Topic.</p></article><article class="adml-int-help-card"><div class="adml-int-help-number">03 / INSTALL</div><h3>Drop the ZIP locally</h3><p>Open <strong>MODS</strong>, then drag a ZIP into <strong>DROP A LOCAL ZIP HERE</strong>, or click the zone to choose a local file. A bundle may contain multiple plugin folders.</p></article><article class="adml-int-help-card"><div class="adml-int-help-number">04 / VERIFY</div><h3>Inspect before enabling</h3><p>Choose <strong>INSPECT</strong> to read the manifest and file list. Only after you trust the code should you choose <strong>ENABLE</strong>.</p></article><article class="adml-int-help-card"><div class="adml-int-help-number">05 / CREATE</div><h3>Make a MOD of a MOD</h3><p>Choose <strong>FORGE MOD</strong>, select an installed parent, edit the manifest and plugin.js, then export a new ZIP. The parent is not overwritten.</p></article><article class="adml-int-help-card"><div class="adml-int-help-number">06 / REMOVE</div><h3>Disable or remove</h3><p>Use <strong>DISABLE</strong> to stop a plugin or <strong>REMOVE</strong> to delete its local installation. Reload the game if a plugin changed deep game internals.</p></article></div><p class="adml-int-help-note"><strong>Safety:</strong> A plugin runs JavaScript in the same page as the game. Only install ZIPs from sources you trust. The loader never silently enables a downloaded plugin.</p></div></section></div>`;
    const close = () => { this.overlay?.remove(); this.overlay = null; this.overlayRoot = null; };
    root.querySelector(".adml-int-help-close").addEventListener("click", close);
    root.querySelector(".adml-int-help-back").addEventListener("click", () => this.openManager());
  }

  openCatalog() {
    const root = this.overlayRoot;
    if (!root) return;
    root.innerHTML = `
      <style>
        :host { all: initial; } *, *::before, *::after { box-sizing: border-box; }
        #adml-int-catalog-shell { position: absolute; inset: 0; display: flex; align-items: flex-start; justify-content: center; padding: clamp(30px, 6vh, 68px) 18px 28px; overflow-y: auto; background: rgba(5, 9, 13, .94); color: #edf1ec; font-family: Arial, Helvetica, sans-serif; text-align: left; }
        #adml-int-catalog { width: min(820px, 100%); max-height: calc(100vh - 90px); overflow: auto; background: #0d151c; border: 1px solid #9bd4d7; box-shadow: 18px 18px 0 rgba(155,212,215,.1); }
        #adml-int-catalog h2, #adml-int-catalog p, #adml-int-catalog button, #adml-int-catalog input { margin: 0; font: inherit; line-height: 1.25; }
        #adml-int-catalog button { appearance: none; border-radius: 0; cursor: pointer; }
        .adml-int-catalog-head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; padding: 20px 22px; border-bottom: 1px solid rgba(155,212,215,.2); }.adml-int-catalog-kicker { color: #9bd4d7; font: 10px/1.2 monospace; letter-spacing: .14em; }.adml-int-catalog-title { margin-top: 8px !important; color: #f3f1e8; font: 700 25px/1.1 Arial, Helvetica, sans-serif !important; }.adml-int-catalog-subtitle { margin-top: 8px !important; color: #97a9ae; font: 12px/1.5 Arial, Helvetica, sans-serif !important; }.adml-int-catalog-actions { display: flex; flex-wrap: wrap; gap: 8px; }.adml-int-catalog-back, .adml-int-catalog-close, .adml-int-catalog-load { border: 1px solid rgba(155,212,215,.45); background: transparent; color: #9bd4d7; padding: 9px 11px; font: 10px/1 monospace !important; }.adml-int-catalog-load { border-color: #e6a35c; background: #e6a35c; color: #0b1016; font-weight: 700 !important; }.adml-int-catalog-body { padding: 20px 22px 24px; }.adml-int-catalog-query { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }.adml-int-catalog-topic { width: 100%; border: 1px solid rgba(155,212,215,.35); background: #080d12; color: #f3f1e8; padding: 11px !important; font: 12px/1 monospace !important; }.adml-int-catalog-help { margin-top: 10px !important; color: #7f9299; font: 11px/1.5 monospace !important; }.adml-int-catalog-list { display: grid; gap: 10px; margin-top: 18px; }.adml-int-catalog-card { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 16px; padding: 15px; border: 1px solid rgba(243,241,232,.15); background: rgba(255,255,255,.025); }.adml-int-catalog-name { color: #e6a35c; font: 700 16px/1.25 Arial, Helvetica, sans-serif; }.adml-int-catalog-meta, .adml-int-catalog-description { margin-top: 6px !important; color: #97a9ae; font: 11px/1.5 Arial, Helvetica, sans-serif !important; }.adml-int-catalog-actions { display: flex; align-items: flex-start; flex-wrap: wrap; justify-content: flex-end; gap: 7px; }.adml-int-catalog-install { border: 1px solid #e6a35c; background: #e6a35c; color: #0b1016; padding: 9px 11px; font: 700 10px/1 monospace !important; }.adml-int-catalog-repo { border: 1px solid rgba(155,212,215,.4); background: transparent; color: #9bd4d7; padding: 9px 11px; font: 10px/1 monospace !important; text-decoration: none; }.adml-int-catalog-empty, .adml-int-catalog-loading { padding: 28px 12px; border: 1px dashed rgba(155,212,215,.2); color: #7f9299; text-align: center; font: 11px/1.6 monospace; }.adml-int-catalog-trust { margin-top: 16px !important; padding: 10px 12px; border-left: 2px solid #f27c6b; background: rgba(242,124,107,.06); color: #b7c5c7; font: 11px/1.5 Arial, Helvetica, sans-serif !important; }
        @media (max-width: 680px) { #adml-int-catalog-shell { padding: 12px 8px; }.adml-int-catalog-head, .adml-int-catalog-body { padding-left: 14px; padding-right: 14px; }.adml-int-catalog-head, .adml-int-catalog-query, .adml-int-catalog-card { grid-template-columns: 1fr; display: grid; }.adml-int-catalog-title { font-size: 21px !important; }.adml-int-catalog-actions { justify-content: flex-start; } }
      </style>
      <div id="adml-int-catalog-shell"><section id="adml-int-catalog" role="dialog" aria-labelledby="adml-int-catalog-title"><header class="adml-int-catalog-head"><div><div class="adml-int-catalog-kicker">ADML / GITHUB CATALOG</div><h2 id="adml-int-catalog-title" class="adml-int-catalog-title">Discover community plugins</h2><p class="adml-int-catalog-subtitle">Search public repositories by Topic. Downloaded ZIPs are inspected before they can be enabled.</p></div><div class="adml-int-catalog-actions"><button class="adml-int-catalog-back" type="button">BACK TO MODS</button><button class="adml-int-catalog-close" type="button">CLOSE</button></div></header><div class="adml-int-catalog-body"><div class="adml-int-catalog-query"><input class="adml-int-catalog-topic" value="adml-plugin" readonly aria-label="Official GitHub Topic" /><button class="adml-int-catalog-load" type="button">REFRESH CATALOG</button></div><p class="adml-int-catalog-help">Official Topic: <code>adml-plugin</code> — use this Topic for every ADML plugin, including endgame content.</p><div class="adml-int-catalog-list"><div class="adml-int-catalog-loading">Loading GitHub Catalog…</div></div><p class="adml-int-catalog-trust" style="border-left-color:#e6a35c;background:rgba(230,163,92,.08)"><strong>Notice (Self-Responsibility):</strong> All plugins and third-party code are installed at your own risk. ADML provides robust multi-proxy and Contents API fallbacks for seamless installation.</p></div></section></div>`;
    const close = () => { this.overlay?.remove(); this.overlay = null; this.overlayRoot = null; };
    root.querySelector(".adml-int-catalog-close").addEventListener("click", close);
    root.querySelector(".adml-int-catalog-back").addEventListener("click", () => this.openManager());
    root.querySelector(".adml-int-catalog-load").addEventListener("click", () => this.loadGithubTopic(root.querySelector(".adml-int-catalog-topic").value));
    this.loadGithubTopic("adml-plugin");
  }

  async loadGithubTopic(rawTopic) {
    const root = this.overlayRoot;
    const topic = "adml-plugin";
    const list = root?.querySelector(".adml-int-catalog-list");
    if (!list) return;
    if (!topic) { list.innerHTML = `<div class="adml-int-catalog-empty">Enter a GitHub Topic first.</div>`; return; }
    list.innerHTML = `<div class="adml-int-catalog-loading">Loading topic: ${topic}…</div>`;
    try {
      const response = await fetch(`https://api.github.com/search/repositories?q=topic:${encodeURIComponent(topic)}+fork:false&sort=updated&order=desc&per_page=30`, { headers: { Accept: "application/vnd.github+json" } });
      if (!response.ok) throw new Error(`GitHub API HTTP ${response.status}`);
      const data = await response.json();
      list.innerHTML = "";
      if (!data.items?.length) { list.innerHTML = `<div class="adml-int-catalog-empty">No public repositories found for topic: ${topic}</div>`; return; }
      for (const repo of data.items) {
        const card = document.createElement("article");
        card.className = "adml-int-catalog-card";
        card.innerHTML = `<div><div class="adml-int-catalog-name"></div><p class="adml-int-catalog-meta"></p><p class="adml-int-catalog-description"></p></div><div class="adml-int-catalog-actions"><a class="adml-int-catalog-repo" target="_blank" rel="noopener noreferrer">VIEW REPO</a><button class="adml-int-catalog-install" type="button">INSTALL ZIP</button></div>`;
        card.querySelector(".adml-int-catalog-name").textContent = repo.full_name;
        card.querySelector(".adml-int-catalog-meta").textContent = `${repo.stargazers_count || 0} stars · updated ${new Date(repo.updated_at).toLocaleDateString()} · ${repo.language || "Unknown language"}`;
        card.querySelector(".adml-int-catalog-description").textContent = repo.description || "No repository description.";
        card.querySelector(".adml-int-catalog-repo").href = repo.html_url;
        card.querySelector(".adml-int-catalog-install").addEventListener("click", () => this.installGithubRepo(repo.full_name));
        list.appendChild(card);
      }
    } catch (error) { list.innerHTML = `<div class="adml-int-catalog-empty">Catalog request failed: ${error.message}<br />GitHub may be rate-limiting anonymous requests.</div>`; }
  }

  async installGithubRepo(fullName) {
    try {
      this.toast(`Resolving default branch and fetching ${fullName}...`);
      
      // Step 1: Fetch repository metadata to discover default branch (e.g. main or master)
      let defaultBranch = "main";
      try {
        const repoRes = await fetch(`https://api.github.com/repos/${fullName}`, { headers: { Accept: "application/vnd.github+json" } });
        if (repoRes.ok) {
          const repoData = await repoRes.json();
          if (repoData.default_branch) defaultBranch = repoData.default_branch;
        }
      } catch(e) {}

      // Step 2: Build candidate URLs for zipball and archive using the correct default branch
      const candidateUrls = [
        `https://api.github.com/repos/${fullName}/zipball/${defaultBranch}`,
        `https://corsproxy.io/?${encodeURIComponent(`https://api.github.com/repos/${fullName}/zipball/${defaultBranch}`)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://api.github.com/repos/${fullName}/zipball/${defaultBranch}`)}`,
        `https://github.com/${fullName}/archive/refs/heads/${defaultBranch}.zip`,
        `https://corsproxy.io/?${encodeURIComponent(`https://github.com/${fullName}/archive/refs/heads/${defaultBranch}.zip`)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://github.com/${fullName}/archive/refs/heads/${defaultBranch}.zip`)}`
      ];

      let zipBuffer = null;
      for (const url of candidateUrls) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            zipBuffer = await res.arrayBuffer();
            break;
          }
        } catch (err) {}
      }

      if (!zipBuffer) {
        this.toast(`Zipball endpoints blocked, packing via Contents API (${defaultBranch})...`);
        await this.installGithubSource(fullName, defaultBranch);
        return;
      }

      const sourceName = `${fullName.replace(/[^a-z0-9._-]/gi, "-")}-${defaultBranch}.zip`;
      await this.installZip(zipBuffer, sourceName);
    } catch (error) { this.toast(`GitHub install failed: ${error.message}`); }
  }

  async installGithubSource(fullName, branch = "main") {
    const apiUrl = `https://api.github.com/repos/${fullName}/git/trees/${branch}?recursive=1`;
    let data = null;
    
    for (const u of [apiUrl, `https://corsproxy.io/?${encodeURIComponent(apiUrl)}`, `https://api.allorigins.win/raw?url=${encodeURIComponent(apiUrl)}`]) {
      try {
        const r = await fetch(u, { headers: { Accept: "application/vnd.github+json" } });
        if (r.ok) { data = await r.json(); break; }
      } catch(e) {}
    }

    if (!data || !data.tree) throw new Error(`Failed to fetch repository tree for branch '${branch}' via Contents API.`);
    const tree = data.tree;

    const zip = new JSZip();
    let fileCount = 0;

    for (const item of tree) {
      if (item.type === "blob") {
        const rawUrl = `https://raw.githubusercontent.com/${fullName}/${branch}/${item.path}`;
        let contentRes = null;
        for (const proxyUrl of [rawUrl, `https://corsproxy.io/?${encodeURIComponent(rawUrl)}`, `https://api.allorigins.win/raw?url=${encodeURIComponent(rawUrl)}`]) {
          try {
            const r = await fetch(proxyUrl);
            if (r.ok) { contentRes = await r.arrayBuffer(); break; }
          } catch(e) {}
        }
        if (contentRes) {
          zip.file(item.path, contentRes);
          fileCount++;
        }
      }
    }

    if (!fileCount) throw new Error("No files found in repository tree.");
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    await this.installZip(zipBuffer, `${fullName.replace(/[^a-z0-9._-]/gi, "-")}-${branch}-source.zip`);
  }

  async installFile(file) {
    if (!file) return;
    try { await this.installZip(await file.arrayBuffer(), file.name); }
    catch (error) { this.toast(`Install failed: ${error.message}`); }
  }

  async installUrl(rawUrl) {
    const url = String(rawUrl || "").trim();
    if (!url) return this.toast("Enter a plugin ZIP URL first.");
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await this.installZip(await response.arrayBuffer(), url.split("/").pop() || "remote.zip");
    } catch (error) { this.toast(`URL download failed: ${error.message}`); }
  }

  async installZip(buffer, sourceName) {
    const JSZip = await this.ensureJSZip();
    const zip = await JSZip.loadAsync(buffer);
    const entries = Object.keys(zip.files).filter(name => !zip.files[name].dir);
    const manifestNames = entries.filter(name => /(^|\/)manifest\.json$/i.test(name));
    if (!manifestNames.length) throw new Error("manifest.json is required at the ZIP root or inside a plugin folder.");
    let installedCount = 0;
    for (const manifestName of manifestNames) {
      const prefix = manifestName.slice(0, -"manifest.json".length);
      const pluginName = `${prefix}plugin.js`;
      const manifestFile = zip.file(manifestName);
      const pluginFile = zip.file(pluginName);
      if (!manifestFile || !pluginFile) continue;
      const manifest = JSON.parse(await manifestFile.async("string"));
      if (!manifest.id || !manifest.name) throw new Error(`${manifestName} must contain id and name.`);
      const id = String(manifest.id);
      const pluginEntries = entries.filter(name => name.startsWith(prefix));
      this.installed[id] = { id, name: manifest.name, version: manifest.version || "0.0.0", author: manifest.author || "Unknown", description: manifest.description || "", manifest, files: pluginEntries, sourceName, code: await pluginFile.async("string") };
      installedCount += 1;
    }
    if (!installedCount) throw new Error("Each plugin folder must contain both manifest.json and plugin.js.");
    this.persist();
    this.renderList();
    this.toast(`${installedCount} plugin${installedCount === 1 ? "" : "s"} installed. Inspect before enabling.`);
  }

  openForge() {
    const root = this.overlayRoot;
    if (!root) return;
    const plugins = Object.values(this.installed);
    const options = plugins.map(plugin => `<option value="${String(plugin.id).replace(/&/g, "&amp;").replace(/\"/g, "&quot;")}">${String(plugin.name).replace(/&/g, "&amp;")} v${plugin.version}</option>`).join("");
    root.innerHTML = `
      <style>
        :host { all: initial; }
        *, *::before, *::after { box-sizing: border-box; }
        #adml-int-forge-shell { position: absolute; inset: 0; display: flex; align-items: flex-start; justify-content: center; padding: clamp(30px, 6vh, 68px) 18px 28px; overflow-y: auto; background: rgba(5, 9, 13, .92); color: #edf1ec; font-family: Arial, Helvetica, sans-serif; text-align: left; }
        #adml-int-forge { width: min(900px, 100%); max-height: calc(100vh - 90px); overflow: auto; background: #0d151c; border: 1px solid #e6a35c; box-shadow: 18px 18px 0 rgba(230,163,92,.12); }
        #adml-int-forge h2, #adml-int-forge p, #adml-int-forge button, #adml-int-forge input, #adml-int-forge select, #adml-int-forge textarea { margin: 0; font: inherit; line-height: 1.25; }
        #adml-int-forge button { appearance: none; border-radius: 0; cursor: pointer; }
        .adml-int-forge-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding: 20px 22px; border-bottom: 1px solid rgba(155,212,215,.2); }.adml-int-forge-kicker { color: #9bd4d7; font: 10px/1.2 monospace; letter-spacing: .14em; }.adml-int-forge-title { margin-top: 8px !important; color: #f3f1e8; font: 700 25px/1.1 Arial, Helvetica, sans-serif !important; }.adml-int-forge-subtitle { margin-top: 8px !important; color: #97a9ae; font: 12px/1.5 Arial, Helvetica, sans-serif !important; }.adml-int-forge-back, .adml-int-forge-close { border: 1px solid rgba(155,212,215,.4); background: transparent; color: #9bd4d7; padding: 8px 11px; font: 10px/1 monospace !important; }.adml-int-forge-body { padding: 20px 22px 24px; }.adml-int-forge-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }.adml-int-forge-label { display: block; margin-bottom: 6px; color: #9bd4d7; font: 10px/1.2 monospace; letter-spacing: .08em; }.adml-int-forge-select, .adml-int-forge-textarea, .adml-int-forge-input { width: 100%; border: 1px solid rgba(155,212,215,.32); background: #080d12; color: #f3f1e8; padding: 10px !important; font: 11px/1.45 monospace !important; }.adml-int-forge-select { min-height: 36px; }.adml-int-forge-textarea { min-height: 230px; resize: vertical; }.adml-int-forge-code { min-height: 330px; }.adml-int-forge-note { margin-top: 12px; padding: 10px 12px; border-left: 2px solid #e6a35c; background: rgba(230,163,92,.06); color: #b7c5c7; font: 11px/1.5 Arial, Helvetica, sans-serif; }.adml-int-forge-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }.adml-int-forge-primary { border: 1px solid #e6a35c; background: #e6a35c; color: #0b1016; padding: 10px 13px; font: 700 10px/1 monospace !important; }.adml-int-forge-secondary { border: 1px solid rgba(155,212,215,.4); background: transparent; color: #9bd4d7; padding: 10px 13px; font: 10px/1 monospace !important; }.adml-int-forge-primary:hover, .adml-int-forge-secondary:hover { filter: brightness(1.15); }
        @media (max-width: 680px) { #adml-int-forge-shell { padding: 12px 8px; }.adml-int-forge-head, .adml-int-forge-body { padding-left: 14px; padding-right: 14px; }.adml-int-forge-head, .adml-int-forge-grid { display: grid; grid-template-columns: 1fr; }.adml-int-forge-title { font-size: 21px !important; } }
      </style>
      <div id="adml-int-forge-shell"><section id="adml-int-forge" role="dialog" aria-labelledby="adml-int-forge-title"><header class="adml-int-forge-head"><div><div class="adml-int-forge-kicker">ADML / MOD FORGE</div><h2 id="adml-int-forge-title" class="adml-int-forge-title">Create a derived plugin</h2><p class="adml-int-forge-subtitle">Load an installed MOD, change its manifest or code, and export a new ZIP.</p></div><div><button class="adml-int-forge-back" type="button">BACK TO MODS</button><button class="adml-int-forge-close" type="button">CLOSE</button></div></header><div class="adml-int-forge-body"><label class="adml-int-forge-label" for="adml-forge-parent">PARENT MOD (OPTIONAL)</label><select class="adml-int-forge-select" id="adml-forge-parent"><option value="">Start from a blank plugin</option>${options}</select><div class="adml-int-forge-grid"><div><label class="adml-int-forge-label" for="adml-forge-id">PLUGIN ID</label><input class="adml-int-forge-input" id="adml-forge-id" value="my.derived.plugin" /></div><div><label class="adml-int-forge-label" for="adml-forge-name">NAME</label><input class="adml-int-forge-input" id="adml-forge-name" value="My Derived Plugin" /></div><div><label class="adml-int-forge-label" for="adml-forge-version">VERSION</label><input class="adml-int-forge-input" id="adml-forge-version" value="1.0.0" /></div><div><label class="adml-int-forge-label" for="adml-forge-author">AUTHOR</label><input class="adml-int-forge-input" id="adml-forge-author" value="ADML Forge User" /></div></div><div class="adml-int-forge-grid"><div><label class="adml-int-forge-label" for="adml-forge-description">DESCRIPTION</label><textarea class="adml-int-forge-textarea" id="adml-forge-description">A plugin created with ADML Mod Forge.</textarea></div><div><label class="adml-int-forge-label" for="adml-forge-code">PLUGIN.JS</label><textarea class="adml-int-forge-textarea adml-int-forge-code" id="adml-forge-code">class Plugin {\n  constructor(api) {\n    this.api = api;\n  }\n\n  onload() {\n    this.api.notify("Derived plugin enabled.");\n  }\n\n  onunload() {\n    this.api.notify("Derived plugin disabled.");\n  }\n}</textarea></div></div><div class="adml-int-forge-note"><strong>How “MOD of MOD” works:</strong> the selected parent is recorded in the new manifest as <code>parent</code>. The exported plugin is independent, so you can edit, inspect, enable, disable, and share it like any other ZIP.</div><div class="adml-int-forge-actions"><button type="button" class="adml-int-forge-primary adml-int-forge-export">EXPORT ZIP</button><button type="button" class="adml-int-forge-secondary adml-int-forge-reset">RESET TEMPLATE</button></div></div></section></div>`;
    const close = () => { this.overlay?.remove(); this.overlay = null; this.overlayRoot = null; };
    root.querySelector(".adml-int-forge-close").addEventListener("click", close);
    root.querySelector(".adml-int-forge-back").addEventListener("click", () => this.openManager());
    root.querySelector(".adml-int-forge-reset").addEventListener("click", () => this.resetForgeTemplate());
    root.querySelector("#adml-forge-parent").addEventListener("change", event => this.loadForgeParent(event.target.value));
    root.querySelector(".adml-int-forge-export").addEventListener("click", () => this.exportForgeZip());
  }

  resetForgeTemplate() {
    const root = this.overlayRoot;
    if (!root) return;
    root.querySelector("#adml-forge-id").value = "my.derived.plugin";
    root.querySelector("#adml-forge-name").value = "My Derived Plugin";
    root.querySelector("#adml-forge-version").value = "1.0.0";
    root.querySelector("#adml-forge-author").value = "ADML Forge User";
    root.querySelector("#adml-forge-description").value = "A plugin created with ADML Mod Forge.";
    root.querySelector("#adml-forge-code").value = `class Plugin {\n  constructor(api) {\n    this.api = api;\n  }\n\n  onload() {\n    this.api.notify("Derived plugin enabled.");\n  }\n\n  onunload() {\n    this.api.notify("Derived plugin disabled.");\n  }\n}`;
    root.querySelector("#adml-forge-parent").value = "";
  }

  loadForgeParent(id) {
    const root = this.overlayRoot;
    const parent = this.installed[id];
    if (!root || !parent) return this.resetForgeTemplate();
    root.querySelector("#adml-forge-id").value = `${parent.id}.derived`;
    root.querySelector("#adml-forge-name").value = `${parent.name} Derived`;
    root.querySelector("#adml-forge-version").value = "1.0.0";
    root.querySelector("#adml-forge-author").value = parent.author || "ADML Forge User";
    root.querySelector("#adml-forge-description").value = `Derived from ${parent.name}.`;
    root.querySelector("#adml-forge-code").value = parent.code || "";
  }

  async exportForgeZip() {
    const root = this.overlayRoot;
    if (!root) return;
    const id = root.querySelector("#adml-forge-id").value.trim();
    const name = root.querySelector("#adml-forge-name").value.trim();
    const code = root.querySelector("#adml-forge-code").value;
    if (!id || !name || !code.trim()) return this.toast("Plugin ID, name, and plugin.js are required.");
    try {
      const JSZip = await this.ensureJSZip();
      const parent = root.querySelector("#adml-forge-parent").value;
      const manifest = { id, name, version: root.querySelector("#adml-forge-version").value.trim() || "1.0.0", author: root.querySelector("#adml-forge-author").value.trim() || "ADML Forge User", description: root.querySelector("#adml-forge-description").value.trim(), main: "plugin.js", apiVersion: "1", type: "derived-plugin" };
      if (parent) manifest.parent = parent;
      const zip = new JSZip();
      zip.file("manifest.json", JSON.stringify(manifest, null, 2));
      zip.file("plugin.js", code);
      zip.file("README.md", `# ${name}\n\nCreated with ADML Mod Forge.${parent ? `\n\nParent plugin: ${parent}` : ""}\n`);
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${id.replace(/[^a-z0-9._-]/gi, "-")}.zip`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      this.toast(`${name} exported as a ZIP.`);
    } catch (error) { this.toast(`Forge export failed: ${error.message}`); }
  }

  endgameRegisterLayer(config) {
    if (!config?.id || !config?.name) throw new Error("Endgame layer requires id and name.");
    const layer = { ...config, id: String(config.id), resource: config.resource || `${config.id}.power` };
    this.endgameLayers.set(layer.id, layer);
    if (this.endgameState.resources[layer.resource] === undefined) this.endgameState.resources[layer.resource] = 0;
    this.persist();
    this.emit("endgameLayerRegistered", { id: layer.id, name: layer.name, resource: layer.resource });
    this.toast(`Endgame layer registered: ${layer.name}`);
    return layer.id;
  }

  endgameListLayers() {
    return [...this.endgameLayers.values()].map(({ unlock, onTick, ...layer }) => layer);
  }

  endgameGetResource(id) {
    return this.endgameState.resources[String(id)] || 0;
  }

  endgameAddResource(id, amount) {
    const key = String(id);
    const value = Number(amount);
    if (!Number.isFinite(value)) throw new Error("Resource amount must be a finite number.");
    this.endgameState.resources[key] = this.endgameGetResource(key) + value;
    this.persist();
    this.emit("endgameResourceChanged", { id: key, value: this.endgameState.resources[key] });
    return this.endgameState.resources[key];
  }

  apiFor(id) {
    const self = this;
    const cleanups = [];
    this.patches.set(id, cleanups);
    return {
      version: self.version,
      pluginId: id,
      patch(target, method, wrapper) {
        if (!target || typeof target[method] !== "function") throw new Error(`${method} is not a function.`);
        const original = target[method];
        target[method] = function(...args) { return wrapper.call(this, original.bind(this), ...args); };
        const cleanup = () => { target[method] = original; };
        cleanups.push(cleanup);
        return cleanup;
      },
      addStyle(css) {
        const scope = `adml-scope-${id.replace(/[^a-z0-9_-]/gi, "-")}`;
        document.body.classList.add(scope);
        const scoped = String(css).replace(/([^{}]+)\{/g, (full, selectors) => {
          if (selectors.trim().startsWith("@")) return full;
          const rewritten = selectors.split(",").map(selector => {
            const s = selector.trim();
            if (s === "body") return `body.${scope}`;
            if (s === ":root") return `html.${scope}`;
            return `body.${scope} ${s}`;
          }).join(", ");
          return `${rewritten}{`;
        });
        const styleNode = document.createElement("style");
        styleNode.dataset.admlPlugin = id;
        styleNode.textContent = scoped;
        document.head.appendChild(styleNode);
        if (!self.styles.has(id)) self.styles.set(id, []);
        self.styles.get(id).push({ node: styleNode, scope });
        return styleNode;
      },
      storage: {
        get(key) { return (self.installed[id]?.storage || {})[key]; },
        set(key, value) { self.installed[id].storage = { ...(self.installed[id].storage || {}), [key]: value }; self.persist(); }
      },
      on(event, callback) {
        if (!self.listeners.has(event)) self.listeners.set(event, []);
        self.listeners.get(event).push({ id, callback });
        cleanups.push(() => { self.listeners.set(event, self.listeners.get(event).filter(item => item.id !== id || item.callback !== callback)); });
      },
      onGameLoad(callback) { if (document.readyState === "complete") callback(); else window.addEventListener("load", callback, { once: true }); },
      notify(message) { self.toast(message); },
      updateUI() { window.GameUI?.update?.(); },
      injectData(path, data) { let current = window; const parts = path.split("."); for (let i = 0; i < parts.length - 1; i++) { if (!current?.[parts[i]]) return false; current = current[parts[i]]; } const key = parts.at(-1); if (Array.isArray(current[key])) current[key].push(data); else if (current[key] && typeof current[key] === "object") Object.assign(current[key], data); else current[key] = data; return true; },
      registerTab(config) { self.toast(`Tab adapter registered: ${config.label || config.id}`); },
      mods: {
        list() { return Object.values(self.installed).map(({ code, ...manifest }) => manifest); },
        get(pluginId) { const plugin = self.installed[pluginId]; if (!plugin) return undefined; return { ...plugin, manifest: { ...plugin.manifest }, code: plugin.code }; }
      },
      endgame: {
        registerLayer(config) { return self.endgameRegisterLayer(config); },
        listLayers() { return self.endgameListLayers(); },
        getResource(resourceId) { return self.endgameGetResource(resourceId); },
        addResource(resourceId, amount) { return self.endgameAddResource(resourceId, amount); }
      },
      github: {
        async search(topic = "adml-plugin") { const requestedTopic = String(topic || "adml-plugin").trim().toLowerCase(); if (requestedTopic !== "adml-plugin") throw new Error("ADML only accepts the official Topic: adml-plugin"); const response = await fetch("https://api.github.com/search/repositories?q=topic:adml-plugin+fork:false&sort=updated&order=desc&per_page=30", { headers: { Accept: "application/vnd.github+json" } }); if (!response.ok) throw new Error(`GitHub API HTTP ${response.status}`); return response.json(); },
        async install(fullName) { return self.installGithubRepo(fullName); },
        topics: { official: "adml-plugin" }
      },
      forge: {
        getParent(pluginId) { return self.installed[pluginId]; },
        createManifest(overrides = {}, parentId = null) { const manifest = { id: "my.derived.plugin", name: "My Derived Plugin", version: "1.0.0", author: "ADML Forge User", description: "A plugin created with ADML Mod Forge.", main: "plugin.js", apiVersion: self.version }; if (parentId) manifest.parent = parentId; return { ...manifest, ...overrides }; },
        async exportZip(manifest, code) { const JSZip = await self.ensureJSZip(); const zip = new JSZip(); zip.file("manifest.json", JSON.stringify(manifest, null, 2)); zip.file("plugin.js", code); return zip.generateAsync({ type: "blob", compression: "DEFLATE" }); }
      },
      i18n: {
        registerPack(locale, entries) { self.i18nPacks.set(locale, new Map(Object.entries(entries || {}))); },
        setLocale(locale) { if (!self.i18nPacks.has(locale)) throw new Error(`No language pack registered for ${locale}.`); self.i18nLocale = locale; self.i18nReplace(document.body); self.i18nObserve(); self.emit("localeChanged", { locale }); },
        disable() { self.i18nDisable(); },
        getLocale() { return self.i18nLocale; },
        translate(value) { return self.i18nTranslate(value); },
        replace(root = document.body) { self.i18nReplace(root); },
        observe(root = document.body) { self.i18nObserve(root); }
      },
      language: {
        register(locale, entries) { self.i18nPacks.set(locale, new Map(Object.entries(entries || {}))); },
        enable(locale) { if (!self.i18nPacks.has(locale)) throw new Error(`No language pack registered for ${locale}.`); self.i18nLocale = locale; self.i18nReplace(document.body); self.i18nObserve(); },
        disable() { self.i18nDisable(); },
        translate(value) { return self.i18nTranslate(value); }
      },
      get player() { return window.player; },
      get currency() { return window.Currency; },
      get db() { return window.GameDatabase; },
      get dc() { return window.DC; }
    };
  }

  i18nDisable() {
    this.i18nLocale = null;
    this.i18nObserver?.disconnect();
    this.i18nObserver = null;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const source = this.i18nOriginalText.get(walker.currentNode);
      if (source !== undefined) walker.currentNode.nodeValue = source;
    }
    document.body.querySelectorAll?.("[data-adml-original-placeholder], [data-adml-original-title], [data-adml-original-aria-label]").forEach(element => {
      for (const attribute of ["placeholder", "title", "aria-label"]) {
        const key = `data-adml-original-${attribute}`;
        if (element.hasAttribute(key)) element.setAttribute(attribute, element.getAttribute(key));
      }
    });
    this.emit("localeChanged", { locale: null });
  }

  i18nTranslate(value) {
    if (!this.i18nLocale) return value;
    const pack = this.i18nPacks.get(this.i18nLocale);
    if (!pack) return value;
    const exact = pack.get(String(value).trim());
    if (exact !== undefined) return exact;
    let output = String(value);
    for (const [from, to] of pack.entries()) output = output.split(from).join(to);
    return output;
  }

  i18nReplace(root) {
    if (!this.i18nLocale || !root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      if (!node.nodeValue.trim()) continue;
      const previous = this.i18nOriginalText.get(node);
      const source = previous && this.i18nTranslate(previous) === node.nodeValue ? previous : node.nodeValue;
      this.i18nOriginalText.set(node, source);
      node.nodeValue = this.i18nTranslate(source);
    }
    root.querySelectorAll?.("input[placeholder], [title], [aria-label]").forEach(element => {
      for (const attribute of ["placeholder", "title", "aria-label"]) {
        if (!element.hasAttribute(attribute)) continue;
        const key = `data-adml-original-${attribute}`;
        const source = element.getAttribute(key) || element.getAttribute(attribute);
        element.setAttribute(key, source);
        element.setAttribute(attribute, this.i18nTranslate(source));
      }
    });
  }

  i18nObserve(root = document.body) {
    this.i18nObserver?.disconnect();
    this.i18nObserver = new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) if (node.nodeType === Node.ELEMENT_NODE) this.i18nReplace(node);
    });
    this.i18nObserver.observe(root, { childList: true, subtree: true });
  }

  emit(event, data) { for (const listener of this.listeners.get(event) || []) { try { listener.callback(data); } catch (error) { console.error(`[ADML] ${listener.id}`, error); } } }

  async load(mod) {
    if (this.plugins.has(mod.id)) return;
    try {
      const api = this.apiFor(mod.id);
      const factory = new Function("api", `${mod.code}\nreturn typeof Plugin !== "undefined" ? Plugin : (typeof createPlugin !== "undefined" ? createPlugin : null);`);
      const Plugin = factory(api);
      if (typeof Plugin !== "function") throw new Error("plugin.js must provide a Plugin class or createPlugin function.");
      const instance = new Plugin(api);
      await instance.onload?.();
      this.plugins.set(mod.id, instance);
      this.toast(`${mod.name} enabled.`);
    } catch (error) { this.cleanup(mod.id); this.toast(`${mod.name} failed to start: ${error.message}`); }
  }

  async toggle(id) {
    if (this.enabled.has(id)) {
      await this.unload(id);
      this.enabled.delete(id);
    } else {
      this.enabled.add(id);
      await this.load(this.installed[id]);
    }
    this.persist();
    this.renderList();
  }

  async unload(id) {
    const instance = this.plugins.get(id);
    try { await instance?.onunload?.(); } finally { this.cleanup(id); this.plugins.delete(id); }
  }

  cleanup(id) {
    for (const cleanup of this.patches.get(id) || []) { try { cleanup(); } catch {} }
    this.patches.delete(id);
    for (const { node, scope } of this.styles.get(id) || []) { node.remove(); document.body.classList.remove(scope); }
    this.styles.delete(id);
    this.listeners.set(id, []);
  }

  remove(id) { this.unload(id); this.enabled.delete(id); delete this.installed[id]; this.persist(); this.renderList(); this.toast("Plugin removed."); }

  toast(message) { const node = document.createElement("div"); node.className = "adml-int-toast"; node.textContent = message; document.body.appendChild(node); window.setTimeout(() => node.remove(), 3800); }
}

window.addEventListener("load", () => {
  window.adml = new IntegratedADML();
  window.adml.init();
});
