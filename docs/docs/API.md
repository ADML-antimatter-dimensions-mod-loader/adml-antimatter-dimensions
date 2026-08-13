# Antimatter Dimensions MOD Loader (ADML) API Reference

This document provides the complete API reference for the Antimatter Dimensions MOD Loader (ADML) v1 runtime [1]. All APIs are accessible inside `plugin.js` via the `api` instance passed to `constructor(api)` or `onload(api)`.

---

## 1. Plugin Structure & Manifest

A plugin is packaged as a standard `.zip` archive containing a `manifest.json` file and a entrypoint script (`plugin.js`) at the root [1].

### `manifest.json` Specification
```json
{
  "id": "my.sample.mod",
  "name": "Sample Plugin",
  "version": "1.0.0",
  "author": "Creator Name",
  "description": "Short description of plugin capabilities.",
  "main": "plugin.js",
  "apiVersion": "1",
  "topics": ["adml-plugin"]
}
```

### `plugin.js` Boilerplate
```javascript
class Plugin {
  constructor(api) {
    this.api = api;
    this.cleanupTasks = [];
  }

  onload() {
    this.api.logger.info("Plugin initialized.");
  }

  onunload() {
    this.cleanupTasks.forEach(task => task());
  }
}
```

---

## 2. Core API Summary

| Category | API Method / Property | Signature | Description |
| :--- | :--- | :--- | :--- |
| **Patching** | `api.patch` | `api.patch(targetObj, methodName, wrapperFn)` | Wraps a host method and returns an unpatch function |
| **Styling** | `api.addStyle` | `const remove = api.addStyle(cssString)` | Injects scoped CSS and returns a cleanup function |
| **UI** | `api.registerTab` | `api.registerTab(tabId, tabName, renderFn)` | Adds a custom tab to the host sidebar |
| **Injection** | `api.injectData` | `api.injectData(targetPath, dataObj)` | Injects custom records (achievements, upgrades) into master data |
| **Access** | `api.player` / `api.db` | `api.player.reality`, `api.db` | Direct access to host save state and databases |
| **Storage** | `api.storage` | `api.storage.get(key)`, `api.storage.set(key, val)` | Persistent key-value storage scoped per plugin |
| **Events** | `api.on` / `api.off` | `api.on("update", delta => { ... })` | Subscribes to tick updates and lifecycle events |
| **GitHub** | `api.github` | `await api.github.search("adml-plugin")` | Searches and installs public repositories via official Topic [2] |
| **Endgame** | `api.endgame` | `api.endgame.registerLayer(config)` | Adds post-Reality layers and custom resources |

---

## 3. Patching & Styling

### `api.patch(target, method, wrapper)`
Wraps an existing game method. Executing the returned unpatch function restores original behavior.

```javascript
const unpatch = api.patch(GameLogic.prototype, "getTickspeed", original => {
  return function(...args) {
    return original.apply(this, args).times(0.5);
  };
});
this.cleanupTasks.push(unpatch);
```

### `api.addStyle(css)`
Injects CSS automatically scoped within `.adml-scope-<pluginId>`.

```javascript
const removeStyle = api.addStyle(`
  .tab-button {
    border-color: #e6a35c !important;
    color: #e6a35c !important;
  }
`);
this.cleanupTasks.push(removeStyle);
```

---

## 4. UI & Data Injection

### `api.registerTab(tabId, tabName, renderFn)`
Registers a sidebar tab and renders content into the provided container element.

```javascript
api.registerTab("my-custom-tab", "ECHOES", container => {
  container.innerHTML = `<div style="padding: 20px;"><h3>Custom Tab</h3></div>`;
});
```

### `api.injectData(path, data)`
Adds custom records to master database tables.

```javascript
api.injectData("GameDatabase.achievements.normal", {
  id: 999,
  name: "Custom Achievement",
  description: "Achieved via plugin.",
  check: () => player.antimatter.exponent >= 100
});
```

---

## 5. Storage & Events

### `api.storage.get(key)` / `api.storage.set(key, value)`
Saves state persistently across browser sessions under a plugin-specific namespace.

```javascript
const val = api.storage.get("counter") || 0;
api.storage.set("counter", val + 1);
```

### `api.on(eventName, callback)`
Subscribes to game loop events (`"update"` receives delta seconds).

```javascript
this.api.on("update", delta => {
  // Tick logic here
});
```

---

## 6. GitHub Catalog & Endgame APIs

- **`api.github.search(topic)`**: Queries public repositories tagged with `adml-plugin` [2].
- **`api.github.install(fullName)`**: Fetches the latest release asset or source zip.
- **`api.endgame.registerLayer(config)`**: Registers custom endgame layers and resources.

---

## References

- [1] EDBP-inspired Antimatter Dimensions MOD Loader (ADML) Architecture [1].
- [2] GitHub Topics: `adml-plugin` [2].
