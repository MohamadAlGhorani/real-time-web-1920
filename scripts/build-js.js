const fs = require("fs");
const path = require("path");

const srcDir = path.join(__dirname, "../src/js");
const outDir = path.join(__dirname, "../static");

const files = fs.readdirSync(srcDir).filter((f) => f.endsWith(".js"));
const combined = files.map((f) => fs.readFileSync(path.join(srcDir, f), "utf8")).join("\n");

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "index.js"), combined);
