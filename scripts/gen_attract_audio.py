"""用 ElevenLabs API 產生 idle attract MP3。

預設讀 repo 根目錄的 .env；找不到時 fallback 到 ~/Video/OpenMontage/.env（共用 key）。
.env 解析會自動 strip inline `# comment`（dotenv 預設不處理，會把註解吃進 value）。

預設 voice = Anna Su (9lHjugDhwqoxA5MhX0az, Casual/Friendly/Bright)，適合零售吸客；
要換到 Tiffy / LeeTingTing / Amy 在下面 VOICE_ID 改一行即可。

執行：
    pip install requests python-dotenv
    python scripts/gen_attract_audio.py

想改廣告詞：編輯下方 PHRASES、重跑即可。
"""
import os
import pathlib
import requests
from dotenv import dotenv_values

REPO_ROOT = pathlib.Path(__file__).parent.parent
ENV_CANDIDATES = [
    REPO_ROOT / ".env",
    pathlib.Path.home() / "Video" / "OpenMontage" / ".env",
]

def load_key(name: str) -> str:
    for path in ENV_CANDIDATES:
        if not path.exists():
            continue
        raw = dotenv_values(path).get(name)
        if raw:
            return raw.split(" #")[0].rstrip()
    raise RuntimeError(f"{name} not found in any of: {ENV_CANDIDATES}")

API_KEY = load_key("ELEVENLABS_API_KEY")

VOICE_ID = "9lHjugDhwqoxA5MhX0az"  # Anna Su — Casual, Friendly, Bright
MODEL = "eleven_multilingual_v2"

# 零售吸客調性：比 B2B narration 更有活力、語氣起伏大
VOICE_SETTINGS = {
    "stability": 0.4,         # 低 stability = 較多語氣起伏
    "similarity_boost": 0.75,
    "style": 0.5,             # 高 style = 更戲劇化
    "use_speaker_boost": True, # 提高音量穿透力，店門口環境噪音下更清楚
}

PHRASES = [
    ("attract_1.mp3", "來玩猜拳～通通有獎喔～"),
    ("attract_2.mp3", "贏家抽五百元折價券！"),
    ("attract_3.mp3", "免費的喔～來玩看看～"),
]

out_dir = REPO_ROOT / "assets" / "audio"
out_dir.mkdir(parents=True, exist_ok=True)

for filename, text in PHRASES:
    r = requests.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}",
        headers={"xi-api-key": API_KEY, "Content-Type": "application/json"},
        json={"text": text, "model_id": MODEL, "voice_settings": VOICE_SETTINGS},
    )
    r.raise_for_status()
    (out_dir / filename).write_bytes(r.content)
    print(f"✓ {filename}  ({len(r.content)/1024:.1f} KB)  — {text}")
