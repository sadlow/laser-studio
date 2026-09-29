import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
for (const name of readdirSync("../../src/engine")) {
  if (!name.endsWith(".ts")) continue;
  const text = readFileSync(`../../src/engine/${name}`, "utf8").replace('import "@papierschmiede/laser-engine/schrift-system";\n', "");
  if (text !== `export * from "@papierschmiede/laser-engine/${name.slice(0, -3)}";\n`)
    throw new Error(`${name}: Berechnungen gehoeren ausschliesslich ins gemeinsame Paket.`);
}
const files = readdirSync("src").filter(n => n.endsWith(".ts") && n !== "version.ts").sort();
const hash = createHash("sha256");
for (const name of files) hash.update(name).update(readFileSync(`src/${name}`));
for (const name of ["package.json", "tsconfig.json", "build.mjs"]) hash.update(name).update(readFileSync(name));
const fingerprint = hash.digest("hex");
writeFileSync("src/version.ts", `export const ENGINE_VERSION = "1.0.0";\nexport const ENGINE_FINGERPRINT = "${fingerprint}";\nexport const ENGINE_STAND = ENGINE_VERSION + ":" + ENGINE_FINGERPRINT;\n`);
rmSync("dist", { recursive: true, force: true });
execFileSync("tsc", ["-p", "tsconfig.json"], { stdio: "inherit" });
// Node-ESM und Bundler erhalten dieselben Module, ohne TypeScript-Laufzeit im Deployment.
for (const name of readdirSync("dist")) {
  if (!name.endsWith(".js") && !name.endsWith(".d.ts")) continue;
  const file = `dist/${name}`;
  writeFileSync(file, readFileSync(file, "utf8").replace(/(from\s+["']|import\s+["'])(\.\/[^"']+)(["'])/g, (_, a, b, c) => `${a}${b.endsWith(".js") ? b : b + ".js"}${c}`));
}

// Derselbe Parser samt CFF-Korrektur in beiden Anwendungen; keine abweichenden postinstall-Patches.
const require = createRequire(import.meta.url);
const ordner = dirname(require.resolve("opentype.js"));
let parser = readFileSync(join(ordner, "opentype.mjs"), "utf8");
const start = parser.indexOf("function parseCFFEncoding(data, start)");
if (start < 0) throw new Error("Unbekannter opentype-Parser: CFF-Korrektur pruefen.");
const ende = parser.indexOf("if (format === 0)", start);
const alt = parser.slice(start, ende);
if (!alt.includes("parser.parseCard8()")) throw new Error("CFF-Format nicht gefunden.");
parser = parser.slice(0, start) + alt.replace(/parser\.parseCard8\(\)(?: & 0x7f)?/, "parser.parseCard8() & 0x7f") + parser.slice(ende);
writeFileSync("dist/opentype.js", parser);
writeFileSync("dist/OPENTYPE-LICENSE", readFileSync(join(ordner, "../LICENSE")));
