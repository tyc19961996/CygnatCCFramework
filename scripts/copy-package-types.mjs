import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const miniGameTypeFiles = [
  "lib.ali.api.d.ts",
  "lib.bytedance.api.d.ts",
  "lib.kuaishou.api.d.ts",
  "lib.wx.api.d.ts"
];

const sourceDir = join("MiniGame", "types");
const targetDir = join("dist", "MiniGame", "types");

await mkdir(targetDir, { recursive: true });

for (const file of miniGameTypeFiles) {
  await copyFile(join(sourceDir, file), join(targetDir, file));
}

const miniGameIndexPath = join("dist", "MiniGame", "index.d.ts");
const references = miniGameTypeFiles
  .map((file) => `/// <reference path="./types/${file}" />`)
  .join("\n");
const currentIndex = await readFile(miniGameIndexPath, "utf8");

if (!currentIndex.startsWith(references)) {
  await writeFile(miniGameIndexPath, `${references}\n${currentIndex}`);
}
