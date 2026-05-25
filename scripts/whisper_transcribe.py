"""
Whisper 批量转录脚本
用法：在 back_end/ 目录下运行
    python scripts/whisper_transcribe.py

会扫描 public/audio/ 下所有 .mp3 文件，
用 Whisper 转录后把结果保存到 transcripts/ 目录，
每个 mp3 对应一个同名 .json 文件。

json 格式：
[
  { "order_index": 1, "content": "...", "start": 3.2, "end": 5.8 },
  ...
]
"""

import os
import json
import whisper

# ── 配置 ──────────────────────────────────────────────────────────────────────

AUDIO_DIR      = "public/audio"        # mp3 所在目录
OUTPUT_DIR     = "transcripts"         # 转录结果输出目录
# 模型选择：tiny(最快) / base / small(推荐) / medium / large(最准但很慢)
MODEL_NAME     = "large-v3"
LANGUAGE       = "en"                  # 指定英语，避免乱识别

# ── 主逻辑 ────────────────────────────────────────────────────────────────────

def main():
    print(f"Loading Whisper model: {MODEL_NAME} ...")
    model = whisper.load_model(MODEL_NAME)
    print("Model loaded.\n")

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # 统计数量
    total, done, skipped = 0, 0, 0

    # 递归扫描所有 mp3
    for root, _, files in os.walk(AUDIO_DIR):
        for filename in sorted(files):
            if not filename.endswith(".mp3"):
                continue

            total += 1
            mp3_path = os.path.join(root, filename)
            title    = filename.replace(".mp3", "")           # 如 C9T4S2
            out_path = os.path.join(OUTPUT_DIR, title + ".json")

            # 已转录过则跳过（支持断点续跑）
            if os.path.exists(out_path):
                print(f"  [skip] {title} (already transcribed)")
                skipped += 1
                continue

            print(f"  [transcribing] {mp3_path} ...")
            try:
                result = model.transcribe(
                    mp3_path,
                    language=LANGUAGE,
                    # word_timestamps=True,  # 需要更大模型，先不开
                    verbose=False,
                )

                # 把 segments 整理成我们需要的格式
                sentences = []
                for i, seg in enumerate(result["segments"]):
                    text = seg["text"].strip()
                    if not text:
                        continue
                    sentences.append({
                        "order_index": i + 1,
                        "content":     text,
                        "start":       round(seg["start"], 2),
                        "end":         round(seg["end"],   2),
                    })

                with open(out_path, "w", encoding="utf-8") as f:
                    json.dump(sentences, f, ensure_ascii=False, indent=2)

                print(f"  [done] {title} → {len(sentences)} sentences → {out_path}")
                done += 1

            except Exception as e:
                print(f"  [error] {title}: {e}")

    print(f"\n✅ 完成！共 {total} 个文件，转录 {done} 个，跳过 {skipped} 个。")
    print(f"转录结果保存在 ./{OUTPUT_DIR}/ 目录下。")
    print("接下来运行: npx ts-node prisma/seed_sentences.ts")


if __name__ == "__main__":
    main()