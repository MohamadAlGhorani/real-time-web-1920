const { ncp } = require("ncp");
const path = require("path");
const fs = require("fs");

const srcDir = path.join(__dirname, "../src/images");
const outDir = path.join(__dirname, "../static");

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

ncp(srcDir, outDir, function (err) {
  if (err) {
    console.error(err);
    process.exit(1);
  }
});
