import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const svgPath = path.join(root, "public", "iamge", "dromi logo.svg");

const svgBase = fs.readFileSync(svgPath, "utf8");
const svgWhite = svgBase.replace(/#000000/g, "#ffffff");

async function pngFromSvg(svg, size) {
  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
}

const sizes = [16, 32, 48];
const darkPngs = await Promise.all(sizes.map((s) => pngFromSvg(svgBase, s)));
const lightPngs = await Promise.all(sizes.map((s) => pngFromSvg(svgWhite, s)));

// Pestaña clara (prefers-color-scheme: light) → icono oscuro
fs.writeFileSync(
  path.join(root, "public", "dromi-favicon.ico"),
  await pngToIco(darkPngs),
);
// Pestaña / tema oscuro → glifo claro (blanco)
fs.writeFileSync(
  path.join(root, "public", "dromi-favicon-white.ico"),
  await pngToIco(lightPngs),
);

// Apple / PWA típico (fondo claro en el asset)
await sharp(Buffer.from(svgBase))
  .resize(180, 180)
  .png()
  .toFile(path.join(root, "public", "apple-touch-icon.png"));

console.log("Favicons written: dromi-favicon.ico, dromi-favicon-white.ico, apple-touch-icon.png");
