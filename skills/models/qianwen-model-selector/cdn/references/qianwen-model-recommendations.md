# Qwen Cross-Domain Model Recommendations

For Token Plan, restrict recommendations to models listed in the [Token Plan model catalog](qianwen-token-plan-models.md); PAYG-only models are not available.

## Canonical defaults

When there is no clear signal, use the default for the domain. Quality, speed, and cost columns are alternatives when that priority is explicit.

| Domain | Default | Quality | Speed | Cost |
|--------|---------|---------|-------|------|
| text.chat | `qwen3.8-flash` | `qwen3.8-max` | `qwen3.8-flash` | `qwen3.8-flash` |
| text.chat (balanced) | `qwen3.7-plus` | `qwen3.7-max` | `qwen3.7-flash` | `qwen3.7-flash` |
| vision.analyze | `qwen3.8-flash` | `qwen3.8-max` | `qwen3.8-flash` | `qwen3.8-flash` |
| omni (voice + vision) | `qwen3.5-omni-plus` | `qwen3.5-omni-plus` | `qwen3.5-omni-flash` | — |
| image.generate | `qwen-image-3.0-pro` | `qwen-image-3.0-pro` | `qwen-image-3.0` | `z-image-turbo` (open source) |
| image.edit | `qwen-image-3.0-pro` | `qwen-image-3.0-pro` | `qwen-image-3.0` | — |
| video.t2v | `happyhorse-1.1-t2v` | `wan3.0-video` | `wan3.0-video-prime` | — |
| video.i2v | `happyhorse-1.1-i2v` | `wan3.0-video` | `wan3.0-video-prime` | — |
| video.edit | `happyhorse-1.0-video-edit` | `wan3.0-video` | `wan3.0-video-prime` | — |
| audio.tts | `qwen-audio-3.0-tts-plus` | `qwen-audio-3.0-tts-plus` | `cosyvoice-v3.5-flash` | `qwen3-tts-flash` |

## Requirement-based selection

| Signal | Keywords / task shape | Primary recommendation |
|--------|-----------------------|------------------------|
| Text reasoning | think step by step, reason, analyze | `qwen3.8-max` |
| Visual reasoning | math, charts, complex visual analysis | `qwen3.8-max` |
| Coding | write code, implement, debug | `qwen3.8-max`; use `qwen3.7-plus` for a quality/speed/cost balance |
| OCR / document | extract text, OCR, scan | `qwen3.8-flash` across PAYG and Token Plan; use `qwen3.5-ocr` on PAYG for specialized extraction |
| Long context | long document, large file | `qwen3.7-plus` (1M context) |
| Multimodal understanding | image or video plus text | `qwen3.8-flash` |
| Voice interaction / omni | voice chat, speak, listen | `qwen3.5-omni-plus-realtime`; use `qwen-audio-3.0-realtime-plus` for speech-only interaction |
| Built-in tools | web search, code interpreter, tools | `qwen3.8-max` |
| Highest-quality / 4K image | high resolution, maximum quality | `wan2.7-image-pro` |
| Image editing / style transfer | reference image, edit, style transfer | `qwen-image-3.0-pro`; `wan2.5-i2i-preview` is an alternative |
| Image-to-image fusion | combine images, place an object, fuse images | `qwen-image-3.0-pro` or `wan2.5-i2i-preview` |
| Open-source / lowest-cost T2I | open source, fast iteration | `z-image-turbo` |
| Video with audio | text-to-video or image-to-video | `happyhorse-1.1-t2v` / `happyhorse-1.1-i2v`; `wan3.0-video` for the latest Wan all-in-one model |
| Reference-to-video | character or subject references | `happyhorse-1.1-r2v`; `wan3.0-video` for mixed image/video/audio references |
| Video editing | edit, modify, or repaint video | `happyhorse-1.0-video-edit`; use `wan3.0-video` for the latest all-in-one workflow or `wan2.7-videoedit` for effect/camera-motion replication |
| Style-controlled TTS | emotion, tone, pace | `qwen-audio-3.0-tts-plus`; use `instruction` (singular) and its model-specific voice set, default `longanlingxin` |
| Highest-quality TTS | professional speech | `qwen-audio-3.0-tts-plus` |
| Realtime speech recognition | ASR, transcription | `qwen-audio-3.0-asr-flash-streaming` (PAYG only); use `qwen3-asr-flash-realtime` when emotion recognition is required |

### Scenario tuning

| Pattern | Signals | Guidance |
|---------|---------|----------|
| Interactive / real-time | chat, real-time, interactive | Prefer flash/turbo variants and enable streaming. |
| Batch / offline | batch, offline, background | Prefer the suitable quality model and Batch API where supported. |
| One-off trial | try, test, experiment | Prefer quality for a limited trial. |
| High-volume production | production, at scale, high volume | Cost-optimize with lower-cost variants and context caching. |
| Repeated context | template, same prompt, repeated | Enable context caching for input-token discounts. |

### Cost optimization

- Batch API calls receive a 50% input/output discount where the selected model supports batch.
- Context caching can reduce repeated-input cost.
- Some models use tiered pricing by input length.
- When cost is the primary concern, recommend the cheapest viable model.

## Thinking mode

| Model | Thinking default | Notes |
|-------|------------------|-------|
| `qwen3.8-max` | **On** | Strongest flagship; set `enable_thinking: false` to disable. |
| `qwen3.8-max-0902` | **On** | Latest pinned Max snapshot; set `enable_thinking: false` to disable. |
| `qwen3.8-flash` | **On** | Fast multimodal Qwen3.8; set `enable_thinking: false` to disable. |
| `qwen3.8-27b` | **On** | Open-source hybrid-thinking model. |
| `qwen3.8-2.4t-a95b` | Always on | Open-source thinking-only model. |
| `qwen3.7-max` | **On** | Text-only flagship; set `enable_thinking: false` to disable. |
| `qwen3.7-plus` | **On** | Multimodal; set `enable_thinking: false` to disable. |
| `qwen3.7-flash` | **On** | Multimodal. |
| `qwen3.6-plus` | **On** | Multimodal; set `enable_thinking: false` to disable. |
| `qwen3.6-flash` | **On** | Multimodal; set `enable_thinking: false` to disable. |
| `qwen3.5-plus` | **On** | Set `enable_thinking: false` to disable. |
| `qwen3.5-flash` | **On** | Thinking is enabled by default. |
| `qwen3-max` | Off | Set `enable_thinking: true` for complex reasoning; built-in tools are available in thinking mode. |
| `qwen-plus`, `qwen-flash`, `qwen-turbo` | Off | Hybrid thinking; enabling it improves deep reasoning at higher latency and output cost. |
| `qwen3-vl-plus`, `qwen3-vl-flash` | Off | Enable thinking for complex visual analysis. |
| `qwen3-omni-flash` | Off | Thinking is supported, but audio output is unavailable in thinking mode. |
| `qwq-plus`, `qvq-max` | Always on | Pure reasoning models; chain-of-thought is always active. |
