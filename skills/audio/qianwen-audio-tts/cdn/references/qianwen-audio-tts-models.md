# Qwen Audio TTS Models

## Defaults

| Scope | Default model | Default voice | Notes |
|-------|---------------|---------------|-------|
| Overall / HTTP NRT | `qwen-audio-3.0-tts-plus` | `longanlingxin` | High-quality professional TTS; instruction control, voice cloning, multi-language; Token Plan and PAYG. |
| Qwen3-TTS built-in-voice synthesis when selected explicitly | `qwen3-tts-flash` | `Cherry` | The `Cherry` default applies only to Qwen3-TTS built-in voices. For style control, use Qwen-Audio-TTS with its own voice set and `instruction` (singular). |
| CosyVoice | `cosyvoice-v3-flash` | `longanyang` | High quality and fast; system voices supported. PAYG only. |

When no model preference is given, use `qwen-audio-3.0-tts-plus`. For `qwen-audio-3.0-tts-flash`, the default voice changes to `longanhuan_v3.6`.

## Model catalog and compatibility

### Qwen3-TTS and Qwen-Audio-TTS

| Model | Recommended use | Capabilities and constraints | Voice compatibility |
|-------|-----------------|------------------------------|---------------------|
| `qwen3-tts-flash` | General speech synthesis, announcements, navigation, notifications | Fast, multi-language | Qwen3-TTS system voices; default `Cherry` |
| `qwen3-tts-instruct-flash` | Audiobooks, game dubbing, radio dramas, style-controlled speech | Natural-language tone, emotion, rate, and character control through `instructions` | Qwen3-TTS Instruct-compatible system voices; default `Cherry` |
| `qwen3-tts-flash-realtime` | Realtime general speech synthesis | Streaming audio output with built-in voices | Qwen3-TTS system voices |
| `qwen3-tts-instruct-flash-realtime` | Realtime style-controlled speech | Streaming audio with natural-language instruction control | Qwen3-TTS Instruct-compatible system voices |
| `qwen3-tts-vd-2026-01-26` | Brand voice customization from a text description | Voice Design creates a new voice without an audio sample | Designed custom voice |
| `qwen3-tts-vc-2026-01-22` | Brand voice customization from an audio sample | High-fidelity Voice Cloning; the voice enrollment `target_model` must match the synthesis model | Cloned custom voice |
| `qwen3-tts-vd-realtime-2026-01-15` | Realtime synthesis with a designed voice | Voice Design target for realtime synthesis | Designed custom voice |
| `qwen3-tts-vc-realtime-2026-01-15` | Realtime synthesis with a cloned voice | Voice Cloning target for realtime synthesis | Cloned custom voice |
| `qwen-audio-3.0-tts-plus` | High-quality professional TTS | **Overall default**; HTTP NRT; instruction control, voice cloning, multi-language; Token Plan and PAYG | Plus voice set only; default `longanlingxin` |
| `qwen-audio-3.0-tts-flash` | Low-latency real-time interaction | HTTP NRT; instruction control and voice cloning; PAYG only; select explicitly | Flash voice set only; default `longanhuan_v3.6` |

`qwen3-tts-flash-realtime` and `qwen3-tts-instruct-flash-realtime` are real-time WebSocket models.

### Text limits and regional availability

- Qwen3-TTS HTTP synthesis accepts at most 600 characters per request.
- Legacy Qwen-TTS models accept at most 512 tokens per request.

### CosyVoice

| Model | API | Recommended use | Voice support | Instruction control |
|-------|-----|-----------------|---------------|---------------------|
| `cosyvoice-v3-flash` | WebSocket / HTTP NRT | High quality, fast | Broad system-voice catalog | Yes |
| `cosyvoice-v3-plus` | WebSocket / HTTP NRT | Highest quality | `longanyang`, `longanhuan` | No |
| `cosyvoice-v3.5-flash` | WebSocket / HTTP NRT | High-performance, multi-language (11 languages) | Custom voices only | Yes |
| `cosyvoice-v3.5-plus` | WebSocket / HTTP NRT | Ultra-expressive, multi-language (11 languages) | Custom voices only | Yes |

CosyVoice v3.5 supports Chinese, English, German, French, Russian, Japanese, Korean, Portuguese, Thai, Indonesian, and Vietnamese. Compared with v3, it adds free-style instruction control to both flash and plus, reduces first-packet latency, improves pronunciation and prosody, and improves voice-cloning fidelity. Both generations support voice cloning and voice design.

`cosyvoice-v3.5-flash` and `cosyvoice-v3.5-plus` do not support system voices. They require a custom voice ID created for Voice Cloning or Voice Design. `longanyang` and `longanhuan` work with both CosyVoice v3 models; `longhuhu_v3` works with `cosyvoice-v3-flash` only.

## Scenario recommendations

| Scenario | Recommended model | Reason |
|----------|-------------------|--------|
| General speech synthesis / announcements | `qwen3-tts-flash` | Fast and multi-language |
| Audiobooks / game dubbing / radio dramas | `qwen-audio-3.0-tts-plus` | Controls emotion, rate, and character through `instruction` (singular); default voice `longanlingxin`; Token Plan and PAYG |
| Realtime built-in-voice synthesis | `qwen3-tts-flash-realtime` | Streaming audio output |
| Realtime style-controlled synthesis | `qwen3-tts-instruct-flash-realtime` | Streaming audio with natural-language instruction control |
| High-quality professional TTS | `qwen-audio-3.0-tts-plus` | Default; instruction control, voice cloning, multi-language |
| Low-latency real-time interaction | `qwen-audio-3.0-tts-flash` | Optimized for speed; select explicitly |
| High-performance multi-language TTS | `cosyvoice-v3.5-flash` | Instruction control and 11 languages; custom voice required |
| Ultra-expressive multi-language TTS | `cosyvoice-v3.5-plus` | Expressive output and instruction control; custom voice required |
| Brand voice from a text description | `cosyvoice-v3.5-plus` | Voice Design without an audio sample; create a custom voice for this exact model; PAYG only |
| Brand voice from an audio sample | `cosyvoice-v3.5-plus` | Voice Cloning; create a custom voice for this exact model; PAYG only |

## Model, parameter, and voice compatibility

| Capability | Compatible models | Notes |
|------------|-------------------|-------|
| `instructions` (plural) | `qwen3-tts-instruct-flash`, `qwen3-tts-instruct-flash-realtime` | Chinese and English; maximum 1,600 tokens |
| `instruction` (singular) | `cosyvoice-v3.5-plus`, `cosyvoice-v3.5-flash`, `cosyvoice-v3-flash`, `qwen-audio-3.0-tts-plus`, `qwen-audio-3.0-tts-flash` | Free-style control for dialect, emotion, pace, or character |
| System voices | `qwen3-tts-flash`; `qwen3-tts-instruct-flash`; legacy Qwen-TTS; `cosyvoice-v3-flash`; `cosyvoice-v3-plus`; model-specific Qwen-Audio-TTS voices | Voice sets are model-specific and are not interchangeable; Qwen3-TTS Voice Design and Voice Cloning models use custom voices |
| Custom voices | Qwen3-TTS VC/VD targets; CosyVoice v3/v3.5; Qwen-Audio-TTS | CosyVoice v3.5 requires a custom voice |

### Qwen3-TTS system voices

| Voice | Description | Supported models |
|-------|-------------|------------------|
| `Cherry` | Sunny, positive, friendly, and natural | Instruct + Flash + Qwen-TTS |
| `Serena` | Gentle | Instruct + Flash + Qwen-TTS |
| `Ethan` | Sunny, warm, energetic, and vibrant | Instruct + Flash + Qwen-TTS |
| `Chelsie` | Two-dimensional virtual girlfriend | Instruct + Flash + Qwen-TTS |
| `Momo` | Playful and mischievous | Instruct + Flash |
| `Vivian` | Confident, cute, and slightly feisty | Instruct + Flash |
| `Moon` | Bold and handsome | Instruct + Flash |
| `Maia` | A blend of intellect and gentleness | Instruct + Flash |
| `Kai` | A soothing audio spa for your ears | Instruct + Flash |
| `Nofish` | A designer who cannot pronounce retroflex sounds | Instruct + Flash |
| `Bella` | Playful little girl | Instruct + Flash |
| `Jennifer` | Premium, cinematic-quality American English | Flash only |
| `Ryan` | Full of rhythm, bursting with dramatic flair | Flash only |
| `Katerina` | A mature-woman voice with rich, memorable rhythm | Flash only |
| `Aiden` | An American English young man | Flash only |
| `Eldric Sage` | A calm and wise elder | Flash only |

These voices support Chinese (Mandarin), English, French, German, Russian, Italian, Spanish, Portuguese, Japanese, and Korean.

### Qwen-Audio-TTS voices

Qwen-Audio-TTS Plus and Flash voice sets are not interchangeable.

| Model | Default voice | Other example voices |
|-------|---------------|----------------------|
| `qwen-audio-3.0-tts-plus` | `longanlingxin` | `longanlufeng` |
| `qwen-audio-3.0-tts-flash` | `longanhuan_v3.6` | `longjielidou_v3.6`, `loongeva_v3.6`, `loongjohn` |

### CosyVoice system voices

The first two system voices below work with both CosyVoice v3 models. `longhuhu_v3` is available only with `cosyvoice-v3-flash`.

| Voice | Description |
|-------|-------------|
| `longanyang` | Sunny young man (male) |
| `longanhuan` | Energetic cheerful female |
| `longhuhu_v3` | Innocent lively girl |
