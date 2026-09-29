/** Dateisystem-Adapter fuer das lokale Laser-Studio. Der Customizer registriert seine Bytes selbst. */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setzeSchriftQuelle } from "./schrift-datei";
const orte = [path.join(process.cwd(), "schriften"), path.join(os.homedir(), "Library/Fonts"), "/Library/Fonts", "/System/Library/Fonts/Supplemental", "/System/Library/Fonts"];
setzeSchriftQuelle((name) => {
  const datei = orte.map((ort) => path.join(ort, name)).find((p) => fs.existsSync(p));
  return datei ? fs.readFileSync(datei) : undefined;
});
