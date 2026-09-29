import { rechteck, ringeInMm, schliesse, vereinige, versatz, verschiebe, ziehAb, type Flaeche } from "./geometrie";
import { zeilenBezugMm } from "./formate";
import { setzeSchnittText } from "./schnitt-text";
import type { Layout, Schichtkarte } from "./typen";
import { schnittRegeln, zeilenAusEingabe, type GesetzteZeile, type Textblock } from "./zeilen";

// Zwischen den Buchstaben laufen keine Strassen: dort blieben nur lose Stummel (Entwurf 25.09.2026: 19 Stueck).
const LUECKEN_SCHLIESSEN_ANTEIL = 0.25;
// Der Titel greift so weit in den Rahmen, dass er sicher mit ihm verschmilzt.
const AUFSETZEN_MM = 1;

/**
 * Titel auf der Kante (Marcel 25.09.2026, Vorbild Kettle Falls): der Titel steht in Versalien als Material auf der
 * Innenkante des unteren Rahmens, links, mittig oder rechts, hoechstens ein Drittel der Breite. Um ihn ein Graben ohne
 * Strassen. Namen und letzte Zeile stehen als eine Zeile negativ im breiten unteren Rand, links, mittig oder rechts.
 *
 * Positive Buchstaben brauchen keine Stege: ihre Innenraeume (A, B, R) fallen heraus. Umlautpunkte haengen nirgends
 * an und werden als lose Textteile gemeldet – sie werden auf den Hintergrund geklebt.
 */
export function setzeKante(k: Schichtkarte, layout: Layout): Textblock {
  const { platte: p, kartenfenster: f } = layout;
  const kt = k.kante;
  const warnungen: string[] = [];
  const texte = zeilenAusEingabe(k);
  const titelText = k.kunde.titel.trim().toLocaleUpperCase("de-DE");
  const regeln = schnittRegeln(k, k.zeilenStil);
  const zeilen: GesetzteZeile[] = [];
  let titel: Flaeche = [];
  let freiraum: Flaeche = [];
  let traeger: Flaeche = [];

  if (titelText) {
    const satz = { schrift: kt.titelSchrift, sperrungEm: kt.titelSperrung, mitteX: 0, mitteY: 0 };
    const t = setzeSchnittText({ ...satz, text: titelText, versalhoeheMm: p.hoeheMm * kt.titelVersalAnteil, maxBreiteMm: p.breiteMm * kt.titelMaxBreiteAnteil }, "druck", regeln);
    const versal = p.hoeheMm * kt.titelVersalAnteil * t.faktor;
    // Aufsetzen nach dem Fuss des H: so steht jede Schrift auf ihrer Grundlinie, egal wie die Datei sie beschreibt.
    const h = setzeSchnittText({ ...satz, text: "H", versalhoeheMm: versal, maxBreiteMm: 1e4 }, "druck", regeln);
    const b = umriss(t.flaeche);
    const lage = k.kunde.titelLage ?? "rechts";
    const x = lage === "links" ? f.xMm + kt.einzugMm - b.x0 : lage === "rechts" ? f.xMm + f.breiteMm - kt.einzugMm - b.x1 : p.breiteMm / 2 - (b.x0 + b.x1) / 2;
    const y = f.yMm + f.hoeheMm + AUFSETZEN_MM - umriss(h.flaeche).y1;
    titel = verschiebe(t.flaeche, x, y);
    const rahmen = ziehAb(rechteck(0, 0, p.breiteMm, p.hoeheMm), rechteck(f.xMm, f.yMm, f.breiteMm, f.hoeheMm));
    const geschlossen = schliesse(titel, versal * LUECKEN_SCHLIESSEN_ANTEIL);
    if (k.aufbau === "netz-schwarz") {
      // Deckschicht: der Titel ist weiss auf dem weissen Grund – eine schwarze Umrandung im Netz darunter gibt ihm
      // Kontrast, und die Strassen laufen bis an sie heran statt in einen Graben (Marcel 25.09.2026).
      freiraum = ziehAb(geschlossen, rahmen);
      traeger = ziehAb(versatz(titel, kt.konturMm), rahmen);
    } else {
      freiraum = ziehAb(versatz(geschlossen, kt.grabenMm), rahmen);
    }
    zeilen.push({ name: "Titel", flaeche: titel, schnitt: [], versalhoeheMm: versal, zugabeMm: t.zugabeMm, stege: 0, zugefuellt: 0, ohneSteg: 0 });
  }

  // Namen und letzte Zeile nebeneinander, mittig im sichtbaren Rand – den aeusseren Streifen deckt der Holzrahmen.
  const zeileText = [texte.zeile1, texte.zeile2].filter(Boolean).join("   ");
  if (zeileText) {
    // So gross wie die Zeilen der anderen Layouts, bei 60 x 60 wie beim 30 x 30 (zeilenBezugMm).
    const versal = zeilenBezugMm(k.format, p.hoeheMm) * k.zeilenStil.hoeheAnteil;
    const maxBreite = f.breiteMm - 2 * kt.einzugMm;
    const z = setzeSchnittText({ text: zeileText, schrift: k.zeilenStil.schrift, versalhoeheMm: versal, sperrungEm: kt.zeileSperrung, mitteX: 0, mitteY: 0, maxBreiteMm: maxBreite }, "druck", regeln);
    if (z.faktor < 0.999) warnungen.push(`Namen und letzte Zeile passen nicht in den Rand und wurden auf ${Math.round(z.faktor * 100)} % verkleinert.`);
    const b = umriss(z.flaeche);
    const lage = k.kunde.zeilenLage ?? "links";
    const x = lage === "links" ? f.xMm + kt.einzugMm - b.x0 : lage === "rechts" ? f.xMm + f.breiteMm - kt.einzugMm - b.x1 : p.breiteMm / 2 - (b.x0 + b.x1) / 2;
    const ueberstand = (k.kunde.holzrahmen ?? "ohne") === "ohne" ? 0 : k.holzrahmenProfil.ueberstandMm;
    const unten = p.hoeheMm - f.yMm - f.hoeheMm;
    const y = p.hoeheMm - (unten + ueberstand) / 2;
    zeilen.push({
      name: "Zeile im Rand",
      flaeche: verschiebe(z.flaeche, x, y),
      schnitt: verschiebe(z.schnitt, x, y),
      versalhoeheMm: versal * z.faktor,
      zugabeMm: z.zugabeMm,
      stege: z.stege,
      zugefuellt: z.zugefuellt,
      ohneSteg: z.ohneSteg,
    });
  }

  return {
    zeilen,
    texte,
    schutz: titel,
    textBereich: vereinige(...zeilen.map((z) => z.flaeche)),
    freiraum,
    traeger,
    warnungen,
  };
}

function umriss(fl: Flaeche) {
  let [x0, x1, y1] = [Infinity, -Infinity, -Infinity];
  for (const r of ringeInMm(fl)) {
    for (const q of r) {
      x0 = Math.min(x0, q.x);
      x1 = Math.max(x1, q.x);
      y1 = Math.max(y1, q.y);
    }
  }
  return { x0, x1, y1 };
}
