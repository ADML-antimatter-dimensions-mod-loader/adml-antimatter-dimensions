# ADML Plugin Template

This is a starter template for building plugins for **Antimatter Dimensions MOD Loader (ADML) v1**.

## Structure
- `manifest.json`: Plugin metadata, ID, author, and `apiVersion: "1"`.
- `plugin.js`: Entrypoint class implementing `constructor(api)`, `onload()`, and `onunload()`.

## Building the ZIP
Run the build script from the repository root:
```bash
node build-plugin.mjs ./templates/plugin-template ./dist
```
This will generate `adml-plugin-template-1.0.0.zip` inside the `dist/` folder, ready to be dropped into the ADML Mod Manager.
