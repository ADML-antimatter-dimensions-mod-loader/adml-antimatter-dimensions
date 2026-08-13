/**
 * ADML Plugin Build Script
 * 
 * Bundles a plugin directory (containing manifest.json and plugin.js) into a ready-to-use .zip file.
 * Usage: node build-plugin.mjs [plugin-dir] [output-dir]
 */

import fs from "fs";
import path from "path";
import JSZip from "jszip";

const targetDir = process.argv[2] || "./templates/plugin-template";
const outputDir = process.argv[3] || "./dist";

async function buildPlugin() {
  if (!fs.existsSync(targetDir)) {
    console.error(`Error: Plugin directory '${targetDir}' not found.`);
    process.exit(1);
  }

  const manifestPath = path.join(targetDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    console.error(`Error: 'manifest.json' missing in '${targetDir}'.`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  const pluginId = manifest.id || "adml.plugin";
  const pluginVersion = manifest.version || "1.0.0";

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const zip = new JSZip();
  const files = fs.readdirSync(targetDir);

  for (const file of files) {
    const filePath = path.join(targetDir, file);
    if (fs.statSync(filePath).isFile()) {
      zip.file(file, fs.readFileSync(filePath));
    }
  }

  const zipName = `${pluginId.replace(/[^a-z0-9._-]/gi, "-")}-${pluginVersion}.zip`;
  const outputPath = path.join(outputDir, zipName);

  const content = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  fs.writeFileSync(outputPath, content);

  console.log(`[SUCCESS] Plugin ZIP generated: ${outputPath}`);
}

buildPlugin().catch(err => {
  console.error("[FATAL]", err);
  process.exit(1);
});
