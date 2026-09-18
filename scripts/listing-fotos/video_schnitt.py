#!/usr/bin/env python3
"""Video-Ads aus zwei Clips (Marcel 17.09.2026): erst der Nahflug um das Herz, dann der Dollyzoom zum ganzen Bild.

Kein KI-Schritt, keine Kosten: ffmpeg blendet die Clips weich ineinander – der Nahflug endet am Herz, der Dollyzoom
beginnt dort – und legt eine stille Tonspur an, falls eine Plattform eine verlangt.
Vorher: video.py fuer die Clips. Aufruf: python3 scripts/listing-fotos/video_schnitt.py
Ergebnis: export/produktfoto/video/<ad>/<ad>.mp4
"""
import subprocess

from video import pfad

ADS = {"ad-koeln-a4": ["koeln-flug-herz", "koeln-herz-zu-rahmen"], "ad-koeln-a3": ["koeln-a3-flug-herz", "koeln-a3-herz-zu-rahmen"]}
CLIP_S, BLENDE_S = 8, 0.6

if __name__ == "__main__":
    for ad, (erster, zweiter) in ADS.items():
        ziel = pfad(ad, ad + ".mp4")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", pfad(erster, erster + ".mp4"), "-i", pfad(zweiter, zweiter + ".mp4"),
                        "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000", "-filter_complex",
                        f"[0:v][1:v]xfade=transition=fade:duration={BLENDE_S}:offset={CLIP_S - BLENDE_S},format=yuv420p[v]",
                        "-map", "[v]", "-map", "2:a", "-shortest", "-c:v", "libx264", "-preset", "slow", "-crf", "16",
                        "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", ziel], check=True)
        print(ziel)
