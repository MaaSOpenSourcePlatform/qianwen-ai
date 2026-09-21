# Qwen Token Plan Models

Token Plan (`sk-sp-...`) supports only the exact model IDs listed for each edition. Team includes all Personal models plus the Team-only additions listed below; PAYG-only model IDs are outside Token Plan.

## Text models

### Personal version: 11 models

| Model | Context window | Notes |
|-------|---------------:|-------|
| `qwen3.8-max` | 1M | Strongest flagship; multimodal; thinking mode. |
| `qwen3.8-flash` | 1M | Fast multimodal model; thinking mode. |
| `qwen3.7-max` | 1M | Text-only; strongest agentic coding and long-horizon execution. |
| `qwen3.7-plus` | 1M | Multimodal vision-language; coding, tools, and productivity. |
| `qwen3.6-flash` | 1M | Fast multimodal model with vision understanding. |
| `glm-5.3` | 1M | Third-party Zhipu flagship for coding and long-horizon tasks. |
| `glm-5.2` | 1M | Third-party Zhipu model for long-horizon tasks. |
| `deepseek-v4-pro` | 1M | Third-party DeepSeek model with thinking mode. |
| `deepseek-v4-pro-0813` | 1M | Latest v4-pro snapshot from DeepSeek. |
| `deepseek-v4-flash-0731` | 1M | Lightweight DeepSeek MoE; not available through the Responses API. |
| `deepseek-v4.1-flash` | 1M | Latest lightweight DeepSeek model; native visual understanding. |

### Team version: 20 models total

Team includes the 11 Personal models and these 9 additional models:

| Model | Context window | Notes |
|-------|---------------:|-------|
| `qwen3.6-plus` | 1M | Multimodal text, image, and video. |
| `deepseek-v4-flash` | 1M | Third-party DeepSeek model. |
| `deepseek-v3.2` | 128K | Third-party DeepSeek model. |
| `kimi-k2.7-code` | 256K | Third-party Moonshot coding specialist. |
| `kimi-k2.6` | 256K | Third-party Moonshot model. |
| `kimi-k2.5` | 256K | Third-party Moonshot model. |
| `glm-5.1` | 198K | Third-party Zhipu model. |
| `glm-5` | 198K | Third-party Zhipu model. |
| `MiniMax-M2.5` | 204K | Third-party MiniMax model. |

## Image generation models

Personal has 3 models; Team has all 5. The two Qwen Image 2.0 models are Team-only.

| Model | Editions | Notes |
|-------|----------|-------|
| `qwen-image-3.0-pro` | Personal + Team | Latest flagship image model; high quality and strong text rendering. |
| `wan2.7-image` | Personal + Team | Multi-style model. The Token Plan API may return four images when `n` is omitted. |
| `wan2.7-image-pro` | Personal + Team | Supports 4K sizes: 2048×2048, 1440×2560, and 2560×1440. |
| `qwen-image-2.0` | Team only | General-purpose default in its family; strong Chinese text rendering. |
| `qwen-image-2.0-pro` | Team only | Higher quality and slightly slower. |

The Token Plan API documents `1024*1024` as its native default among the common sizes `1024*1024`, `720*1280`, and `1280*720`. `wan2.7-image-pro` also supports the 4K sizes above. Image-generation models use image-generation endpoints and are not available through the standard text `/chat/completions` API.

## Video generation models: 3 models

| Model | Notes |
|-------|-------|
| `happyhorse-1.1-t2v` | Text-to-video; 480P/720P/1080P; 3–15 seconds; audio output. |
| `happyhorse-1.1-i2v` | Image-to-video; 480P/720P/1080P; 3–15 seconds; audio output. |
| `happyhorse-1.1-r2v` | Reference-to-video with multiple references; 480P/720P/1080P; 3–15 seconds; audio output. |

Video-generation models use video-generation endpoints and are not available through the standard text `/chat/completions` API.

## Audio models

| Model | Type | Availability and notes |
|-------|------|--------------------------------|
| `qwen-audio-3.0-tts-plus` | TTS | Token Plan; highest-quality TTS with multiple languages and Chinese dialects. |
| `qwen-audio-3.0-realtime-plus` | Realtime | Token Plan realtime audio model. |
| `qwen-audio-3.0-asr-flash` | ASR | Token Plan speech-recognition model. |

TTS uses speech-synthesis endpoints and is not available through the standard text `/chat/completions` API.

## Excluded models and modalities

- General vision model IDs such as `qwen3-vl-*`, `qwen3.5-ocr`, `qwen-vl-ocr`, and `qvq-max` are not in the Token Plan catalog. Vision tasks must use a vision-capable model from the text lists above.
- Embedding, rerank, and translation models are not supported.
- PAYG-only TTS families such as CosyVoice and `qwen3-tts-flash` are not supported.
- `qwen-audio-3.0-asr-flash` is included; other ASR models are outside this catalog.
- A model not listed for an edition is outside that edition's Token Plan scope and cannot be replaced by a PAYG-only model within Token Plan.
