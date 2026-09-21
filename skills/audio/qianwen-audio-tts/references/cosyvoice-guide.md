# CosyVoice TTS Guide

CosyVoice models use **WebSocket API** (real-time) or **HTTP NRT API** (non-real-time). The bundled script calls the PAYG HTTP NRT API directly and uses the DashScope SDK for WebSocket requests.

## Models

Fetch and read the current [Qwen audio TTS model catalog](https://alioth.alicdn.com/skills-info/models/references/qianwen-audio-tts-models.md) for the CosyVoice model list, defaults, generation differences, and voice compatibility. If CDN access fails, use the [local fallback](../cdn/references/qianwen-audio-tts-models.md).

## Prerequisites

- **DashScope SDK** (venv recommended):
  ```bash
  python3 -m venv .venv
  source .venv/bin/activate  # Windows: .venv\Scripts\activate
  pip install dashscope>=1.25.17
  ```
- **API Key**: Same as Qwen TTS (`DASHSCOPE_API_KEY` or `QIANWEN_API_KEY`)

> **SDK version**: The bundled script requires `dashscope>=1.25.17` for its WebSocket path. PAYG HTTP NRT requests use the public HTTP API directly.

## Run Script

**Discovery:** `python3 <this-skill-dir>/scripts/tts_cosyvoice.py --help`

```bash
python3 scripts/tts_cosyvoice.py --text "Hello, world!"
```

| Argument | Description |
|----------|-------------|
| `--text`, `-t` | **Required** — text to synthesize |
| `--model`, `-m` | Model ID; fetch the CDN model catalog linked above for the current default |
| `--voice`, `-v` | Voice ID (default: `longanyang`) |
| `--output`, `-o` | Output file (default: `output/qianwen-audio-tts/cosyvoice.mp3`) |
| `--format`, `-f` | Audio format: mp3, wav, pcm (default: mp3) |
| `--instruction` | Free-style instruction for speech control (v3.5 and v3-flash) |
| `--language-hints` | Target language hint (e.g. `zh`, `en`) |

## Available Voices

> **Note**: Model-to-voice compatibility changes over time. Fetch the CDN model catalog linked above before choosing a system voice.

| Voice | Description |
|-------|-------------|
| longanyang | Sunny young man (male) |
| longanhuan | Energetic cheerful female |
| longhuhu_v3 | Innocent lively girl |

> See [voice-list](https://platform.qianwenai.com/docs/api-reference/speech-synthesis/voice-list) for full list.

## Examples

```bash
# Basic synthesis (v3, default — system voice)
python3 scripts/tts_cosyvoice.py -t "Hello, world!"

# Chinese with specific voice (v3)
python3 scripts/tts_cosyvoice.py -t "你好世界" -v longanhuan

# CosyVoice v3.5 (requires custom voice ID)
python3 scripts/tts_cosyvoice.py -t "Professional narration" -m cosyvoice-v3.5-plus -v <your-custom-voice-id>

# With instruction control (v3.5 + custom voice)
python3 scripts/tts_cosyvoice.py -t "欢迎光临我们的店铺" -m cosyvoice-v3.5-flash -v <id> --instruction "用热情洋溢的声音，语速稍快"

# Legacy v3 models still supported
python3 scripts/tts_cosyvoice.py -t "Hello" -m cosyvoice-v3-plus

# Multiple files (use --output to avoid overwriting)
python3 scripts/tts_cosyvoice.py -t "First sentence" -o output/qianwen-audio-tts/part1.mp3
python3 scripts/tts_cosyvoice.py -t "Second sentence" -o output/qianwen-audio-tts/part2.mp3
```

> **Tip**: Default output overwrites previous file. Use `-o` with different filenames for batch tasks.

> **Note**: Qwen-Audio-TTS models are handled by `scripts/tts.py`; fetch the CDN model catalog linked above for the current model list and see `SKILL.md` or `api-guide.md` for usage.

## Error Handling

| Error Pattern | Resolution |
|---------------|------------|
| `dashscope SDK not installed` | Run `pip install dashscope>=1.25.17` |
| `does not support system voices` | Check the CDN model catalog linked above; models marked custom-voice-only require Voice Cloning or Voice Design. |
| `WebSocket connection failed` | Check network; verify API key |
| `Invalid voice` | Use CosyVoice voices, not Qwen TTS voices (Cherry, Ethan, etc.). Each model has its own voice set — do not mix. |
| `InvalidParameter` / `Engine error [411]` | Voice not supported by the selected model. Check voice list for your model. |
| `HTTP 418` | A system voice was used with a custom-voice-only model. Check the CDN model catalog and provide a compatible voice. |

## Character Counting & Billing

CosyVoice models are billed per character. Fetch the [CDN model-pricing reference](https://alioth.alicdn.com/skills-info/models/references/qianwen-model-pricing.md) for the current model list and billing units. If CDN access fails, use the [local fallback](../cdn/references/qianwen-model-pricing.md). Character counting rules:

- Chinese characters = **2 characters**
- Other characters (punctuation, letters, digits) = **1 character**
- SSML tags are **not counted**
