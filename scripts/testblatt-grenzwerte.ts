// Grenzwert-Testblatt fuer das Netz aus 2-mm-Acryl: Spalt, Strassenbreite, Keile, kleine Bloecke.
// Aufruf: npx tsx scripts/testblatt-grenzwerte.ts   -> export/<zeit>_testblatt-grenzwerte/
import fs from "node:fs";
import path from "node:path";
import { bogenSvg } from "../src/engine/produktion";
import { standardSchichtkarte } from "../src/engine/standard";
import { baueTestblatt, TESTWERTE } from "../src/engine/testblatt";

const jetzt = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
const datum = jetzt.toISOString().slice(0, 16).replace("T", " ");
const ordner = path.join("export", `${jetzt.toISOString().slice(0, 16).replace(/[-:]/g, "").replace("T", "-")}_testblatt-grenzwerte`);
fs.mkdirSync(ordner, { recursive: true });

const t = baueTestblatt();
const k = standardSchichtkarte();
const liste = (werte: number[]) => werte.map((w) => String(w).replace(".", ",")).join(" / ");

fs.writeFileSync(
  path.join(ordner, "testblatt-grenzwerte.svg"),
  // Beschriftung als gefuellte Flaeche: bei "Mittellinie" wuerde jede Schraffurlinie ein eigener Weg.
  bogenSvg({ breiteMm: t.breiteMm, hoeheMm: t.hoeheMm }, [{ lage: t.lage, dx: 0, dy: 0 }], {
    titel: "Grenzwert-Testblatt Netz",
    beschreibung: `Acrylglas 2 mm; Platte ${t.breiteMm} x ${t.hoeheMm} mm; Sollmasse ohne Schnittfuge; erstellt ${datum}`,
  }, { art: "flaeche", strahlMm: 0.15 }),
);

fs.writeFileSync(
  path.join(ordner, "uebersicht.txt"),
  [
    `Grenzwert-Testblatt Netz – erstellt ${datum}`,
    ``,
    `Platte ${t.breiteMm} x ${t.hoeheMm} mm, Acrylglas 2 mm. Einmal in Weiss schneiden; wird das schwarze Netz genutzt, auch in Schwarz.`,
    `Laser wie fuer die Karte einstellen, ohne Schnittfugen-Korrektur – alle Masse sind Sollmasse wie in den Exportdateien.`,
    `Ebenen: "1 Gravur" (Beschriftung, Skala), "3 Schnitt innen" (Bloecke), "4 Schnitt aussen" (Platte, zuletzt).`,
    ``,
    `A  Spalt zwischen parallelen Strassen: ${liste(TESTWERTE.spaltMm)} mm, je drei Spalte 14 mm lang, Strassen 1 mm.`,
    `   Heute gibt es dafuer keine Grenze: jeder Spalt wird geschnitten, auch unter 0,5 mm.`,
    `   Pruefen: faellt das Stueck heraus, bleibt der Spalt offen und gerade, ist nichts wieder verschmolzen?`,
    `B  Strassenbreite zwischen Spalten von 1,5 mm: ${liste(TESTWERTE.strasseMm)} mm, je drei Strassen.`,
    `   Heute: Netz mindestens ${String(k.netzMinBreiteMm).replace(".", ",")} mm. Pruefen: Steg ganz, gerade, nicht verbrannt oder verzogen?`,
    `C  Zusammenlaufende Strassen, Keil ${TESTWERTE.keile.map((x) => `${x.grad}°`).join(" und ")}, Strassen 1 mm.`,
    `   Die Striche unter dem Keil stehen dort, wo der Block dazwischen so breit ist wie angeschrieben.`,
    `   Pruefen: bis zu welchem Strich ist die Spitze offen und sauber? Links davon ist sie zu oder verschmolzen.`,
    `D  Kleine Bloecke: ${liste(TESTWERTE.blockMm2)} mm², je vier Quadrate, Strassen 1 mm.`,
    `   Heute: Bloecke unter ${String(k.netzMinLochMm2).replace(".", ",")} mm² bleiben Material. Pruefen: fallen sie sauber heraus?`,
    ``,
    `Ergebnis (bitte eintragen):`,
    `  A Spalt sauber ab ____ mm   B Strasse haelt ab ____ mm   C Spitze offen ab ____ mm   D Block faellt ab ____ mm²`,
    ``,
  ].join("\n"),
);

console.log(`${ordner}: ${t.breiteMm} x ${t.hoeheMm} mm, ${t.lage.teile.length} Teil, ${t.lage.teile[0]?.loecher.length ?? 0} Bloecke`);
