/**
 * tsc 会把源码里无扩展名的相对导入原样输出到 dist，
 * 而严格 ESM 环境（Node、Cocos Creator 的模块解析）要求说明符必须带扩展名。
 * 本脚本在构建后把 dist/**\/*.js 里的相对说明符改写为显式路径：
 *   "./Core/index"  -> "./Core/index.js"
 *   "./Core"        -> "./Core/index.js"（目录时）
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const distDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "dist");

const SPECIFIER_RE = /(from\s+|import\s*\(\s*|import\s+)(["'])(\.\.?\/[^"']+)\2/g;

function listJsFiles(dir) {
    const out = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) out.push(...listJsFiles(full));
        else if (entry.name.endsWith(".js")) out.push(full);
    }
    return out;
}

function rewriteSpecifier(fromFile, specifier) {
    if (/\.(js|mjs|cjs|json)$/.test(specifier)) return specifier;
    const base = resolve(dirname(fromFile), specifier);
    if (existsSync(`${base}.js`)) return `${specifier}.js`;
    if (existsSync(base) && statSync(base).isDirectory() && existsSync(join(base, "index.js"))) {
        return `${specifier.replace(/\/$/, "")}/index.js`;
    }
    throw new Error(`无法解析相对导入 "${specifier}"（来自 ${fromFile}）`);
}

let fileCount = 0;
let rewriteCount = 0;
for (const file of listJsFiles(distDir)) {
    const src = readFileSync(file, "utf8");
    let changed = false;
    const next = src.replace(SPECIFIER_RE, (whole, lead, quote, spec) => {
        const fixed = rewriteSpecifier(file, spec);
        if (fixed === spec) return whole;
        changed = true;
        rewriteCount++;
        return `${lead}${quote}${fixed}${quote}`;
    });
    if (changed) {
        writeFileSync(file, next);
        fileCount++;
    }
}
console.log(`[fix-esm-extensions] 已改写 ${fileCount} 个文件中的 ${rewriteCount} 处相对导入`);
