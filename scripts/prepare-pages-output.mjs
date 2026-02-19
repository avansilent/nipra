import fs from "node:fs";
import path from "node:path";

const root = ".open-next";
const workerSrc = path.join(root, "worker.js");
const workerDst = path.join(root, "_worker.js");
const assetsDir = path.join(root, "assets");

if (!fs.existsSync(workerSrc)) {
  throw new Error(`Missing ${workerSrc}`);
}

fs.copyFileSync(workerSrc, workerDst);

if (!fs.existsSync(assetsDir)) {
  throw new Error(`Missing ${assetsDir}`);
}

fs.cpSync(assetsDir, root, { recursive: true, force: true });

const nextStaticDir = path.join(root, "_next", "static");
if (!fs.existsSync(nextStaticDir)) {
  throw new Error(`Expected static assets at ${nextStaticDir}`);
}

console.log(`Created ${workerDst}`);
console.log(`Flattened ${assetsDir} into ${root}`);
