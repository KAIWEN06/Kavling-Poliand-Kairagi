"""Membuat nada chime notifikasi (WAV 16-bit mono 44.1 kHz, ~1.2 detik).

Jalankan: python scripts/generate_notif_sound.py
Keluaran: android/app/src/main/res/raw/notif_alert.wav
Dua nada naik (E6 -> A6) dengan harmonik lembut dan peluruhan eksponensial.
"""
import math
import struct
import wave
from pathlib import Path

RATE = 44100
DURATION = 1.2
OUT = Path(__file__).resolve().parent.parent / "android/app/src/main/res/raw/notif_alert.wav"

# (frekuensi Hz, waktu mulai detik, amplitudo)
NOTES = [(1318.51, 0.00, 0.55), (1760.00, 0.18, 0.60)]
HARMONICS = [(1, 1.0), (2, 0.30), (3, 0.10), (4, 0.04)]


def sample(t: float) -> float:
    total = 0.0
    for freq, start, amp in NOTES:
        if t < start:
            continue
        dt = t - start
        attack = min(1.0, dt / 0.008)           # klik-bebas
        decay = math.exp(-dt * 3.6)             # peluruhan alami
        tone = sum(w * math.sin(2 * math.pi * freq * h * dt) for h, w in HARMONICS)
        total += amp * attack * decay * tone
    fade_out = min(1.0, (DURATION - t) / 0.06)  # akhiri halus
    return total * fade_out


def main() -> None:
    n = int(RATE * DURATION)
    data = [sample(i / RATE) for i in range(n)]
    peak = max(abs(x) for x in data) or 1.0
    scale = 0.85 / peak
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUT), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", int(x * scale * 32767)) for x in data))
    print(f"OK: {OUT} ({OUT.stat().st_size} bytes, {n / RATE:.2f}s)")


if __name__ == "__main__":
    main()
