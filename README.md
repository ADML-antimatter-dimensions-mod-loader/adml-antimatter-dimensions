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

Comprehensive developer and user guides are available under the `docs/` directory:

- [API Reference](./docs/API.md): Complete method signatures, classes, and code examples for core APIs (`patch`, `addStyle`, `registerTab`, `injectData`, `storage`, `github`, `endgame`).
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
