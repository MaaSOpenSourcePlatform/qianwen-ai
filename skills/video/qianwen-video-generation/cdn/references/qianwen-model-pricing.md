# QianWen Model Pricing (China)

> This catalog describes billing units and pricing structures. It does not include exact model-specific rates.

## Text generation (per 1M tokens)

**Commercial models**: qwen3.8-max, qwen3.8-max-0902, qwen3.8-flash, qwen3.7-max, qwen3.7-plus, qwen3.7-flash, qwen3.6-max-preview, qwen3.6-plus, qwen3.6-flash, qwen3-max, qwen3.5-plus, qwen3.5-flash, qwen-plus, qwen-flash, qwen-turbo, qwq-plus, qwen3-coder-next, qwen3-coder-plus, qwen3-coder-flash, qwen-plus-character, qwen-flash-character.

**Open-source models**: qwen3.8-27b, qwen3.8-2.4t-a95b, qwen3.6-35b-a3b, qwen3.6-27b, qwen3.5-397b-a17b, qwen3.5-122b-a10b, qwen3.5-27b, qwen3.5-35b-a3b, qwen3-235b-a22b, qwen3-32b, qwen3-30b-a3b, qwen3-8b.

**Third-party / partner models**: deepseek-v4.1-flash, deepseek-v4-pro-0813, deepseek-v4-pro, deepseek-v4-flash, deepseek-v4-flash-0731, glm-5.3, glm-5.2, glm-5.1, kimi-k3, kimi-k2.7-code, kimi-k2.6, MiniMax-M2.5.

- Billing unit: per 1M tokens; input and output are priced separately.
- Some models use tiered prices based on input context length, such as ≤32K, ≤128K, ≤256K, and ≤1M.
- Thinking tokens count as output tokens and are billed at the selected model's output rate.
- Batch API calls receive a 50% discount for supported models.
- Third-party models are hosted on QianWen but billed and maintained by their providers; tiers and free quotas may differ.

## Vision understanding (per 1M tokens)

**Models**: qwen3.8-max, qwen3.8-flash, qwen3.7-plus, qwen3.7-flash, qwen3.6-plus, qwen3.6-flash, qwen3.5-plus, qwen3.5-flash, qwen3.5-ocr, qwen3-vl-plus, qwen3-vl-flash, qwen-vl-ocr, qvq-max.

- Billing unit: per 1M tokens.
- Some models use tiered prices based on input context length.

## Omni models (per 1M tokens)

**Models**: qwen3.5-omni-plus, qwen3.5-omni-flash, qwen3.5-omni-plus-realtime, qwen3.5-omni-flash-realtime, qwen3-omni-flash, qwen3-omni-flash-realtime, qwen-audio-3.0-realtime-plus, qwen-audio-3.0-realtime-flash, qwen-omni-turbo.

- Billing unit: per 1M tokens.
- Text input, audio input, image/video input, text output, and audio output have separate rates.

## Image generation (per image)

**Wan series**: wan2.7-image-pro, wan2.7-image, wan2.6-t2i, wan2.5-t2i-preview, wan2.2-t2i-flash, wan2.2-t2i-plus, wan2.5-i2i-preview, wan2.6-image.

**Qwen Image series**: qwen-image-3.0-pro, qwen-image-3.0, qwen-image-2.0-pro, qwen-image-2.0-pro-2026-06-22, qwen-image-2.0, qwen-image-edit-max, qwen-image-edit-plus, qwen-image-edit, qwen-image-plus, qwen-image-max, qwen-image.

**Other**: z-image-turbo.

- Billing unit: per input image where the selected model charges for input, plus each successfully generated output image.
- Multi-image output (`n > 1`) is billed per successful output image.

## Video generation (per second)

**Wan series**: wan3.0-video, wan3.0-video-prime, wan2.7-t2v, wan2.7-i2v, wan2.7-r2v, wan2.7-videoedit, wan2.6-t2v, wan2.6-i2v-flash, wan2.6-i2v, wan2.6-r2v-flash, wan2.6-r2v, wan2.5-t2v-preview, wan2.5-i2v-preview, wan2.2-t2v-plus, wan2.2-i2v-flash, wan2.2-i2v-plus, wan2.2-kf2v-flash, wanx2.1-vace-plus.

**HappyHorse series**: happyhorse-1.1-t2v, happyhorse-1.1-i2v, happyhorse-1.1-r2v, happyhorse-1.0-t2v, happyhorse-1.0-i2v, happyhorse-1.0-r2v, happyhorse-1.0-video-edit.

- Billing unit: per second of generated video.
- Price varies by resolution (480P, 720P, or 1080P).
- Audio-enabled and silent variants may use different rates.
- Video output is billed by generated duration; reference-video and video-editing models may also bill input-video duration.

## Speech synthesis / TTS (per 10K characters)

**Models**: qwen-audio-3.0-tts-plus, qwen-audio-3.0-tts-flash, qwen3-tts-flash, qwen3-tts-instruct-flash, qwen3-tts-flash-realtime, qwen3-tts-instruct-flash-realtime, qwen3-tts-vc-2026-01-22, qwen3-tts-vd-2026-01-26, qwen3-tts-vc-realtime-2026-01-15, qwen3-tts-vd-realtime-2026-01-15, cosyvoice-v3.5-plus, cosyvoice-v3.5-flash, cosyvoice-v3-plus, cosyvoice-v3-flash, MiniMax/speech-2.8-hd, MiniMax/speech-2.8-turbo.

- Billing unit: per 10,000 characters.

## Speech recognition / ASR (per second of audio)

**Models**: qwen-audio-3.0-asr-flash, qwen-audio-3.0-asr-flash-filetrans, qwen-audio-3.0-asr-flash-streaming, qwen3-asr-flash, qwen3-asr-flash-filetrans, qwen3-asr-flash-realtime, fun-asr, fun-asr-realtime.

- Billing unit: per second of audio.

## Text embedding (per 1M tokens)

**Models**: qwen3.7-text-embedding, qwen3.7-text-embedding-flash, text-embedding-v4, text-embedding-v3.

- Billing unit: per 1M input tokens.

## Multimodal embedding (per 1M tokens)

**Models**: qwen3-vl-embedding, tongyi-embedding-vision-plus, tongyi-embedding-vision-flash.

- Billing unit: per 1M input tokens.

## Rerank (per 1M tokens)

**Models**: qwen3.7-text-rerank, qwen3-vl-rerank, qwen3-rerank.

- Billing unit: per 1M input tokens.

## Translation (per 1M tokens)

**Models**: qwen-mt-plus, qwen-mt-flash, qwen-mt-lite, qwen-mt-turbo.

- Billing unit: per 1M tokens; input and output are priced separately.

## Pricing notes

- Limited free quotas may apply and are not included in this structural overview.
- Batch calls for supported models receive a 50% input/output discount.
- Eligible models receive input-token discounts from context caching.
- Some models cost more as input length increases.
