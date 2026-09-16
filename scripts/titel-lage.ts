// Wo liegt der Titel mit seinen Schwuengen, gemessen an der Versalhoehen-Mitte?
// Ziel wie auf dem Poster: Unterkante Schwung ~84,3 %, Oberkante Namen ~86,9 %.
import { setzeZeile } from "../src/engine/schrift";
const H = 297;
for (const text of ["Zuhause", "Home", "Unser Nest", "Familie"]) {
  const z = setzeZeile({ text, schrift: "Bacalisties.ttf", versalhoeheMm: H * 0.07, sperrungEm: 0, mitteX: 105, mitteY: 0, maxBreiteMm: 1e9 });
  const ys = z.ringe.flat().map((p) => p.y);
  const oben = Math.min(...ys), unten = Math.max(...ys);
  console.log(text.padEnd(12), `ueber Mitte ${(-oben / H * 100).toFixed(1)} %`, `| unter Mitte ${(unten / H * 100).toFixed(1)} %`,
    `| Mitte fuer Unterkante 84,3 %: ${(84.3 - unten / H * 100).toFixed(1)} %`);
}
const n = setzeZeile({ text: "FAMILIE HOFFMANN", schrift: "AvantGardeCE-Demi.otf", versalhoeheMm: H * 0.017, sperrungEm: 0.06, mitteX: 105, mitteY: 0, maxBreiteMm: 1e9 });
console.log("Namen: Oberkante bei Mitte 87,8 % =", (87.8 + Math.min(...n.ringe.flat().map((p) => p.y)) / H * 100).toFixed(1), "%");
