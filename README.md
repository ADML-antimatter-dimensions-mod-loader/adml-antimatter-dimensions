# Antimatter Dimensions MOD Loader (ADML)

ADML is a lightweight, secure plugin loader and integrated development framework for **Antimatter Dimensions**, inspired by modular bot-builder architectures [1]. It allows players and creators to load external mods into the game without embedding game data or risking untrusted code execution.

---

## Features

- **Shadow DOM UI Isolation**: The in-game Mod Manager and developer tools are completely isolated inside a Shadow DOM container, preventing the host game's CSS or reset rules from breaking modal layouts.
- **Local ZIP Import**: Drop any plugin ZIP directly onto the load zone or choose a file locally. Supports standard single-plugin packages and multi-plugin bundles.
- **GitHub Catalog Integration**: Search and install community plugins directly from the game interface using the official **`adml-plugin`** repository Topic [2].
- **Inspect-Before-Enable Security**: Downloaded plugins are never executed automatically. Users must review `manifest.json`, file lists, and metadata via the `INSPECT` view before explicitly enabling them [1].
- **MOD Forge (Mod-of-a-Mod)**: Select any installed plugin as a parent, edit its manifest and `plugin.js` inside the game, and export a brand-new derived plugin ZIP instantly.
- **Endgame Extension API (`api.endgame`)**: Exposes dedicated namespaces for adding post-Reality resources and parallel-world progression layers cleanly [1].

---

## Getting Started

1. Open the integrated game client.
2. Click the **`MODS`** button in the top header.
3. Drop a plugin ZIP into **`DROP A LOCAL ZIP HERE`** or open **`GITHUB CATALOG`** to browse repositories tagged with `adml-plugin` [2].
4. Click **`INSPECT`** to verify the package, then click **`ENABLE`** to activate it [1].

---

## Documentation

The official documentation hub is available at [`docs/index.html`](./docs/index.html). It links to every maintained guide and should be the first page opened by developers and users.

- [Documentation Portal](./docs/index.html): Index of the API, manifest, security, save, user, and MOD Forge documents.
- [API v1.1 Reference](./docs/API.md): Complete plugin-facing and runtime API tables, examples, lifecycle hooks, i18n, GitHub Catalog, MOD Forge, endgame, manifest dependencies, and compatibility metadata.
- [Manifest & Distribution](./docs/MANIFEST.md): ZIP layout, manifest fields, dependencies, compatibility, and root.json catalog rules.
- [Standard Save & MOD Data](./docs/SAVE.md): Export/Import save integration, MOD storage, enabled state, and import behavior.
- [Security Guide](./docs/SECURITY.md): Inspect-before-enable rules, embedded code warnings, dependency checks, and recovery guidance.
- [User Guide & Installation](./docs/GUIDE.md): Step-by-step instructions for installing local ZIPs, understanding security warnings, and browsing the GitHub Catalog.
- [Mod Forge Guide](./docs/FORGE.md): Guide to creating derivative mods (mods of mods) and exporting custom ZIP packages.

---

## Sample Plugins

Five built-in sample plugins demonstrate various plugin categories:

| ID | Name | Category | Description |
| :--- | :--- | :--- | :--- |
| `01` | **Dark Neon Theme** | Visual System | Scoped CSS theme modifying game aesthetics safely. |
| `02` | **Auto Booster** | Gameplay Patch | Demonstrates `patch` and `onunload` cleanup hooks. |
| `03` | **Multiverse Echoes Lite** | System Module | Combines custom tabs, persistent storage, and tick events. |
| `04` | **Japanese Language Pack** | Language Pack | Translates host game UI elements without altering loader text. |
| `05` | **Endgame: Multiverse Layer** | Endgame Content | Adds post-Reality resources and parallel layer extensions. |

---

## License

Distributed under the MIT License. See `LICENSE` for more information.

---

## References

- [1] EDBP-inspired Antimatter Dimensions MOD Loader (ADML) Architecture [1].
- [2] GitHub Topics: `adml-plugin` [2].
