# ADML User Guide & Installation

This guide explains how to play the integrated Antimatter Dimensions game and install or manage external ZIP plugins [1].

---

## 1. Starting the Game

1. Launch the integrated ADML website or open the local playable build (`index.html`).
2. Play Antimatter Dimensions normally. Your game progress is saved automatically in your browser's local storage.

---

## 2. Installing ZIP Plugins

ADML plugins are packaged as `.zip` archives containing `manifest.json` and `plugin.js` [1].

1. **Get a Plugin**: Download a sample ZIP from the portal or discover community repositories via the in-game **GitHub Catalog** tagged with **`adml-plugin`** [2].
2. **Open Mod Manager**: Click the **`MODS`** button in the top header of the game screen.
3. **Drop or Select ZIP**: Drag and drop your `.zip` file into the **`DROP A LOCAL ZIP HERE`** dropzone, or click the box to select a file from your computer.
4. **Inspect Package**: Click **`INSPECT`** to review the manifest, author details, description, and included files.
5. **Enable Plugin**: Once you trust the code, click **`ENABLE`**. You can pause a plugin at any time using **`DISABLE`** or delete it using **`REMOVE`**.

---

## 3. Security Warning

> **Security Note**: Plugins execute arbitrary JavaScript within the same page context as the host game. Only install ZIP packages from creators and repositories you fully trust. The loader never automatically or silently enables a downloaded plugin.

---

## References

- [1] EDBP-inspired Antimatter Dimensions MOD Loader (ADML) Architecture [1].
- [2] GitHub Topics: `adml-plugin` [2].
