const fs = require("fs");
const path = require("path");
const CleanCSS = require("clean-css");
const autoprefixer = require("autoprefixer");
const postcss = require("postcss");

const srcDir = path.join(__dirname, "../src/css");
const outDir = path.join(__dirname, "../static");

const files = fs.readdirSync(srcDir).filter((f) => f.endsWith(".css"));
const combined = files.map((f) => fs.readFileSync(path.join(srcDir, f), "utf8")).join("\n");

postcss([autoprefixer])
  .process(combined, { from: undefined })
  .then((result) => {
    const minified = new CleanCSS().minify(result.css).styles;
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "index.css"), minified);
  });
