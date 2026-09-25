// Rendert dieselbe Vorlage an allen Referenzorten und meldet, wo Grenzwerte brechen.
// Aufruf: npx tsx scripts/referenzorte.ts [zielordner] [netz-weiss|netz-schwarz] [km] [viel|ausgewogen|wenig]
import fs from "node:fs";
import path from "node:path";
import { berechneLayout, mapboxTokenQuelle, rendereSchichtkarte, standardSchichtkarte, type Schichtkarte, type Teil } from "../src/engine";
import { ladeKartenRohdaten } from "../src/engine/kacheln";
import { REFERENZORTE } from "../src/referenzorte";

type P = { x: number; y: number };
const laenge = (l: P[], zu = false) =>
  l.reduce((s, p, i) => (i ? s + Math.hypot(p.x - l[i - 1].x, p.y - l[i - 1].y) : s), 0) +
  (zu && l.length > 1 ? Math.hypot(l[0].x - l[l.length - 1].x, l[0].y - l[l.length - 1].y) : 0);
const schnittM = (teile: Teil[]) =>
  teile.reduce((s, t) => s + laenge(t.aussen, true) + t.loecher.reduce((a, r) => a + laenge(r, true), 0), 0) / 1000;

async function main() {
  const ziel = process.argv[2] ?? "export/referenzorte";
  const aufbau = (process.argv[3] ?? "netz-weiss") as Schichtkarte["aufbau"];
  const km = Number(process.argv[4] ?? 3.5);
  const stufe = (process.argv[5] ?? "ausgewogen") as Schichtkarte["kunde"]["strassenStufe"];
  fs.mkdirSync(ziel, { recursive: true });
  const token = fs.readFileSync(".env.local", "utf8").match(/MAPBOX_ACCESS_TOKEN=(.*)/)?.[1]?.trim() ?? "";
  const zeilen: string[] = [];
  const karten: string[] = [];

  for (const ort of REFERENZORTE) {
    const basis = standardSchichtkarte();
    const k: Schichtkarte = {
      ...basis,
      aufbau,
      ausschnittKm: km,
      lon: ort.lon,
      lat: ort.lat,
      kunde: { ...basis.kunde, adresse: ort.name, ortText: ort.ortText, strassenStufe: stufe },
    };
    const r = await rendereSchichtkarte(k, token);
    fs.writeFileSync(path.join(ziel, `${ort.id}.svg`), r.vorschauSvg);

    // Strassenmix im Fenster in km Wirklichkeit (Kacheln kommen aus dem Cache).
    const layout = berechneLayout(k);
    const roh = await ladeKartenRohdaten({ lon: k.lon, lat: k.lat, ausschnittBreiteM: km * 1000, fenster: layout.kartenfenster, zugabeMm: 0, quelle: mapboxTokenQuelle(token) });
    const mProMm = (km * 1000) / layout.kartenfenster.breiteMm;
    const mix = k.strassen
      .map((g) => ({ g, km: g.klassen.flatMap((kl) => roh.strassen.get(kl) ?? []).reduce((s, l) => s + laenge(l), 0) * mProMm / 1000 }))
      .filter((m) => m.km > 0.05);

    const netzLage = r.lagen.find((l) => l.key === "netz")!;
    const bloecke = netzLage.teile.reduce((s, t) => s + t.loecher.length, 0);
    const gravurM = r.lagen.flatMap((l) => l.gravur).reduce((s, g) => s + g.linien.reduce((a, l) => a + laenge(l), 0), 0) / 1000;
    const kz = r.kennzahlen;
    const werte = {
      netz: `${Math.round(kz.netzAnteilFenster * 100)} %`,
      bloecke,
      zugefuellt: kz.netzLoecherZugefuellt,
      lose: kz.loseNetzstuecke,
      hintergrund: kz.hintergrundTeile,
      wasser: kz.wasserFlaechenGeschnitten,
      schnittNetz: `${schnittM(netzLage.teile).toFixed(1)} m`,
      gravur: `${gravurM.toFixed(1)} m`,
      herabgestuft: kz.herabgestuft.join(", ") || "-",
      nachgerueckt: kz.nachgerueckt.join(", ") || "-",
      loseZurGravur: kz.loseZurGravur,
      inselnWeg: kz.wasserInselnGeflutet,
      zeit: `${(kz.rechenzeitMs / 1000).toFixed(1)} s`,
    };
    const mixText = mix.map((m) => `${m.g.titel} ${m.km.toFixed(1)}`).join(" | ");
    console.log(`${ort.name.padEnd(26)} ${JSON.stringify(werte)}\n${"".padEnd(26)} km: ${mixText}`);
    zeilen.push(`${ort.name}\t${Object.values(werte).join("\t")}\t${mixText}`);
    karten.push(
      `<figure><img src="${ort.id}.svg"><figcaption><b>${ort.name}</b> – ${ort.pruefung}<br>` +
        `Netz ${werte.netz} · ${bloecke} Bloecke · ${werte.zugefuellt} zugefuellt · lose ${werte.lose} · Hintergrund ${werte.hintergrund} Teile · Wasser ${werte.wasser}<br>` +
        `Schnitt Netz ${werte.schnittNetz} · Gravur ${werte.gravur} · graviert statt geschnitten: ${werte.herabgestuft} · nachgerueckt: ${werte.nachgerueckt}<br>` +
        `<small>km: ${mixText}</small></figcaption></figure>`,
    );
  }

  fs.writeFileSync(
    path.join(ziel, "uebersicht.tsv"),
    ["Ort\tNetz\tBloecke\tzugefuellt\tlose\tHintergrund\tWasser\tSchnitt Netz\tGravur\therabgestuft\tnachgerueckt\tlose zur Gravur\tInseln weg\tZeit\tStrassen km", ...zeilen].join("\n") + "\n",
  );
  fs.writeFileSync(
    path.join(ziel, "kontaktbogen.html"),
    `<!doctype html><meta charset="utf-8"><style>body{font:12px Helvetica;margin:16px;display:grid;grid-template-columns:repeat(4,1fr);gap:16px}` +
      `img{width:100%;display:block;background:#eee}figure{margin:0}figcaption{margin-top:6px;line-height:1.4}</style>${karten.join("")}`,
  );
}
void main();
