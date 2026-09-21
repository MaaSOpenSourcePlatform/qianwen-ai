# Model List

> Sources: https://www.qianwenai.com/models and the manifest-listed official model documentation
> Updated: 2026-09-17

## Text Generation — Commercial

| Model ID          | Context                             | Thinking         | Key Info                                                                                                                           |
|-------------------|-------------------------------------|------------------|------------------------------------------------------------------------------------------------------------------------------------|
| qwen3.8-max        | 1M                                  | Yes (default on) | **Strongest flagship overall.** 2.4T params MoE. Multimodal (text + image + video). Surpasses 3.7 series significantly. |
| qwen3.8-max-0902   | 1M                                  | Yes (default on) | Latest pinned Max snapshot. Improved coding, multi-agent collaboration, and visual understanding. |
| qwen3.8-flash      | 1M                                  | Yes (default on) | **Recommended default.** Latest general-purpose Qwen model; 125B MoE with 6B active parameters; multimodal and fast. |
| qwen3.7-max        | 1M                                  | Yes (default on) | Qwen3.7 Max. Text-only. Strong agentic coding and long-horizon execution.                                         |
| qwen3.7-plus       | 1M                                  | Yes (default on) | Balanced Qwen3.7 Plus. Multimodal vision-language. Enhanced Agent execution & coding, GUI perception. Tiered pricing. |
| qwen3.7-flash      | 1M                                  | Yes (default on) | Qwen3.7 Flash. Multimodal. Enhanced Agent execution, object recognition, spatial intelligence. Tiered pricing.                      |
| qwen3.6-plus      | 1M                                  | Yes (default on) | Multimodal (text + image + video). Strong coding & universal recognition. Surpasses qwen3-vl series. Tiered pricing. |
| qwen3.6-flash     | 1M                                  | Yes (default on) | Fastest Qwen3.6. Multimodal. Tiered pricing.                                                                                       |
| qwen3.5-plus      | 1M                                  | Yes (default on) | Multimodal (text + image + video input). On par with qwen3-max for text; surpasses qwen3-vl series for vision. Tiered pricing. |
| qwen3.5-flash     | 1M                                  | Yes (default on) | Fastest Qwen3.5. Tiered pricing.                                                                                                   |
| qwen3.6-max-preview | 256K                              | Yes (hybrid)     | Preview. Multimodal. Built-in tools (web search, code interpreter). Tiered pricing. |
| qwen3-max         | 262K                                | Yes (hybrid)     | Legacy. Built-in tools (web search, code interpreter). Tiered pricing.                                                   |
| qwen-plus         | 1M                                  | Yes (hybrid)     | General purpose (Qwen3 series). Tiered pricing.                                                                                    |
| qwen-flash        | 1M                                  | Yes (hybrid)     | Economy. Tiered pricing. Context cache supported.                                                                                  |
| qwen-turbo        | 131K                                | Yes (hybrid)     | Cheapest per-token.                                                                                                                |
| qwq-plus          | 131K                                | Always-on CoT    | Reasoning specialist. Max CoT 32K, response 8K.                                                                                    |
| qwen3-coder-next  | 262K                                | No               | Specialized agentic coding model balancing quality, speed, and cost; supports multi-turn tool calling.                             |
| qwen3-coder-plus  | 1M                                  | No               | High-quality specialized code generation. Tiered pricing. Context cache supported.                                                  |
| qwen3-coder-flash | 1M                                  | No               | Fast code model. Tiered pricing.                                                                                                   |
| qwen-plus-character | 32K                               | No               | Role-playing, character restoration, empathetic dialog.                                                                            |
| qwen-flash-character | 8K                               | No               | Role-playing, fast, lower cost.                                                                                                    |

## Text Generation — Open Source / Third Party

| Model ID          | Context | Thinking         | Source        | Key Info                                                                                  |
|-------------------|---------|------------------|---------------|-------------------------------------------------------------------------------------------|
| qwen3.8-27b       | 1M      | Yes (default on) | Open source   | Qwen3.8 open-source model. Multimodal capabilities aligned with the qwen3.8 series.       |
| qwen3.8-2.4t-a95b | 1M      | Always-on CoT    | Open source   | Qwen3.8 open-source flagship. 2.4T params MoE (95B active). Strong reasoning & coding.     |
| qwen3.6-27b       | 262K    | Yes (default on) | Open source   | Qwen3.6 open-source model. Multimodal capabilities aligned with qwen3.6-plus.             |
| qwen3.5-27b       | 262K    | Yes (default on) | Open source   | Qwen3.5 open-source model. Strong text+vision baseline.                                   |
| deepseek-v4.1-flash | 1M    | Yes (`thinkingFormat: qwen`) | Third party (DeepSeek) | Latest lightweight DeepSeek model; native vision; 384K shared thinking/output budget. |
| deepseek-v4-flash | 1M      | Yes (`thinkingFormat: qwen`) | Third party (DeepSeek) | DeepSeek V4 Flash, hosted on QianWen.                                         |
| deepseek-v4-flash-0731 | 1M | Yes (`thinkingFormat: qwen`) | Third party (DeepSeek) | Lightweight MoE (284B/13B active). Native 1M context. Fast, low cost. Balanced general use. |
| deepseek-v4-pro   | 1M      | Yes (`thinkingFormat: qwen`) | Third party (DeepSeek) | DeepSeek V4 Pro. Deep reasoning model, thinking mode. |
| deepseek-v4-pro-0813 | 1M   | Yes (`thinkingFormat: qwen`) | Third party (DeepSeek) | Latest v4-pro snapshot. |
| glm-5.3           | 1M      | Always-on CoT    | Third party (Zhipu) | Latest GLM flagship; 128K output and three reasoning-effort levels.                          |
| glm-5.2           | 1M      | Yes              | Third party (Zhipu) | GLM-5.2 flagship. Long-horizon tasks. Strong reasoning, code, long-text understanding.       |
| glm-5.1           | 202K    | Yes              | Third party (Zhipu) | GLM-5.1, Anthropic + OpenAI compatible. Max output 128K.                          |
| kimi-k3           | 1M      | Yes              | Third party (Moonshot) | Kimi K3. 2.8T params. Native vision. Long-horizon coding, reasoning, knowledge.     |
| kimi-k2.7-code    | 262K    | Yes              | Third party (Moonshot) | Kimi K2.7 coding specialist. Multimodal (text+image+video).                    |
| kimi-k2.6         | 262K    | Yes              | Third party (Moonshot) | Kimi K2.6 long-context model.                                                  |
| MiniMax-M2.5      | 204K    | Yes              | Third party (MiniMax) | MiniMax M2.5. budgetTokens + output ≤ 32,768.                                   |

> Open-source models can be downloaded from [ModelScope](https://modelscope.cn) or HuggingFace. Third-party models are hosted on the QianWen platform; pricing and availability may differ from first-party Qwen models.

## Vision — Commercial

| Model ID | Context | Thinking | Key Info |
|----------|---------|----------|----------|
| qwen3-vl-plus | 262K | Yes (hybrid) | Best Qwen3-VL tier. Tiered pricing. Context cache supported. Max 16K tokens/image. (legacy, use qwen3.8-max/flash for new projects) |
| qwen3-vl-flash | 262K | Yes (hybrid) | Fast Qwen3-VL tier. Tiered pricing. Context cache supported. (legacy, use qwen3.8-max/flash for new projects) |
| qvq-max | 131K | Always-on CoT | Legacy visual reasoning specialist (math, charts). |
| qwen3.5-ocr | 65K\* | No | Latest OCR. PDF parsing, multi-turn, enhanced card/ID recognition. |
| qwen-vl-ocr | 38K | No | Legacy OCR specialist. Max 30K tokens/image. |
| qwen-vl-max | 131K | No | Best in Qwen2.5-VL series. |
| qwen-vl-plus | 131K | No | Qwen2.5-VL. Faster, good balance, 11 languages. |

\* The model marketplace currently shows 65K for `qwen3.5-ocr`, while the 2026-06-16 release note says 128K. Verify the live model limit before depending on the upper boundary.

## Omni — Commercial

| Model ID | Context | Thinking | Key Info |
|----------|---------|----------|----------|
| qwen3-omni-flash | 65K | Yes (hybrid) | Text/image/audio/video → text or speech. 49 voices, 10 languages. |
| qwen3.5-omni-plus | 262K | No | Latest omni. Text/image/audio/video input, text + audio output. Full Omni capabilities. |
| qwen3.5-omni-flash | 262K | No | Fast latest omni. Text/image/audio/video input, text + audio output. |
| qwen3.5-omni-plus-realtime | 262K | No | Latest realtime multimodal model; streaming audio input, controllable speech output, web search, and function calling. |
| qwen3.5-omni-flash-realtime | 262K | No | Faster latest realtime multimodal model with the same input/output modalities. |
| qwen-omni-turbo | 32K | No | Legacy omni, max 2K output. Use qwen3-omni-flash instead. |
| qwen3-omni-flash-realtime | 128K | No | Streaming audio input + VAD. 49 voices, 10 languages. |
| qwen-omni-turbo-realtime | 32K | No | Legacy realtime. Use qwen3-omni-flash-realtime instead. |
| qwen-audio-3.0-realtime-plus | — | No | Realtime speech conversation with semantic VAD and function calling; Token Plan and PAYG. |
| qwen-audio-3.0-realtime-flash | — | No | Lower-latency realtime speech conversation; PAYG only. |

## Translation — Commercial

| Model ID | Context | Key Info |
|----------|---------|----------|
| qwen-mt-plus | 16K | Highest quality. 92 languages. |
| qwen-mt-flash | 16K | Fast. |
| qwen-mt-lite | 16K | Cheapest. |
| qwen-mt-turbo | 16K | Balanced. |

## Image Generation

| Model ID | Key Info |
|----------|----------|
| qwen-image-3.0-pro | **Recommended default.** Latest flagship image model; high quality, strong text rendering, fused generation + multi-image editing |
| qwen-image-3.0 | Latest-generation image model; general-purpose generation + editing, strong text rendering |
| wan2.7-image-pro | **Multi-function** (4K support) — text-to-image, image editing (0–9 images), sequential multi-image, interactive editing (bbox), thinking mode, color palette. Max 4K for t2i, 2K for editing |
| wan2.7-image | **Multi-function** (faster) — same as pro but max 2K, no 4K support |
| wan2.6-t2i | Text-to-image, sync+async, best quality in wan2.6 series (legacy) |
| wan2.6-image | Image **editing** (NOT for pure text-to-image): style transfer, subject consistency (1–4 refs), interleaved text-image output, 2K. Requires reference_images or enable_interleave=true (legacy) |
| wan2.5-i2i-preview | Image editing: single-image editing, multi-image fusion (1–3 refs), subject consistency, async-only |
| wan2.5-t2i-preview | Flexible resolution text-to-image |
| wan2.2-t2i-flash | Fast text-to-image |
| wan2.2-t2i-plus | Quality text-to-image |
| qwen-image-2.0-pro | Fused generation + editing, text rendering, multi-image (1–3 input, 1–6 output) |
| qwen-image-2.0-pro-2026-06-22 | Latest snapshot: enhanced text rendering (1K token prompt), improved realism & semantic following |
| qwen-image-2.0 | Accelerated generation + editing |
| qwen-image-edit-max | Image editing, 1–6 output images |
| qwen-image-edit-plus | Image editing, 1–6 output images |
| qwen-image-edit | Image editing, 1 output image only |
| qwen-image-plus | Legacy text-to-image, five fixed resolutions, sync + async, exactly one output |
| qwen-image-max | Legacy text-to-image, five fixed resolutions, sync only, exactly one output |
| qwen-image | Legacy text-to-image, five fixed resolutions, sync + async, exactly one output |
| z-image-turbo | Lightweight open-source T2I. Sync-only; single text content; no `n`; no reference images. Parameters: `size`, `prompt_extend`, `seed`. |

## Video Generation

| Model ID | Key Info |
|----------|----------|
| wan2.7-t2v | Text-to-video, ratio control, automatic soundtrack or sound effects, 5000-character prompt, 720P/1080P |
| wan2.7-i2v | Image-to-video, unified media[] protocol: first/last frame, video continuation, audio sync |
| wan2.7-videoedit | **Video editing.** Uses `media[]` with `video` and optional `reference_image` items. No `function` field. |
| wan2.7-r2v | Reference-to-video. Up to 5 image/video refs plus optional `reference_voice`; 2–15s with images only or 2–10s with video. |
| wan3.0-video | **Wan 3.0** all-in-one generation, multimodal reference, video editing, and extension; optional audio; up to 30 seconds. |
| wan3.0-video-prime | Faster Wan 3.0 variant with the same modes, parameters, and limits. |
| wan2.6-t2v | Text-to-video, audio, multi-shot, 2–15s |
| wan2.6-i2v / wan2.6-i2v-flash | Image-to-video, audio, multi-shot, 2–15s |
| wan2.6-r2v / wan2.6-r2v-flash | Reference-based, multi-character, 2–10s |
| wan2.2-kf2v-flash | First+last frame, 5s, silent |
| wanx2.1-vace-plus | Video editing (repainting, extension, outpainting), ≤5s, silent |
| happyhorse-1.1-t2v | **HappyHorse 1.1** text-to-video. 480P/720P/1080P, 3–15s, with audio. Uses `resolution` + `ratio` parameters. |
| happyhorse-1.1-i2v | **HappyHorse 1.1** image-to-video. 480P/720P/1080P, 3–15s, with audio. Uses `resolution` + `ratio` parameters. |
| happyhorse-1.1-r2v | **HappyHorse 1.1** reference-to-video. Multi-ref images, 480P/720P/1080P, 3–15s, with audio. |
| happyhorse-1.0-t2v | HappyHorse 1.0 text-to-video. Uses `resolution` + `ratio` parameters. |
| happyhorse-1.0-i2v | HappyHorse 1.0 image-to-video. Uses `resolution` + `ratio` parameters. |
| happyhorse-1.0-r2v | HappyHorse 1.0 reference-to-video. Up to 9 reference images via `media[{type:"reference_image", url}]`. |
| happyhorse-1.0-video-edit | HappyHorse video editing. Same `media[]` protocol as wan2.7-videoedit. |

## TTS / ASR

| Model ID | Key Info |
|----------|----------|
| qwen-audio-3.0-tts-plus | **Highest quality.** Multi-language + Chinese dialects, instruction control, fine-grained tags. Professional scenarios. |
| qwen-audio-3.0-tts-flash | **Low-latency streaming TTS.** Multi-language + Chinese dialects and instruction control. |
| cosyvoice-v3.5-plus | Ultra-high expressiveness. Voice clone + synthesis. 11 languages. Free-style instruction. |
| cosyvoice-v3.5-flash | High-performance TTS. Voice clone + synthesis. 11 languages. Reduced first-packet latency. |
| cosyvoice-v3-plus | CosyVoice v3 quality. Voice clone + synthesis. |
| cosyvoice-v3-flash | CosyVoice v3 fast. Voice clone + synthesis. |
| MiniMax/speech-2.8-hd | Third-party high-quality TTS with custom voices. |
| MiniMax/speech-2.8-turbo | Third-party faster TTS with custom voices. |
| qwen3-tts-flash | Fast multi-language TTS |
| qwen3-tts-flash-realtime | Realtime Qwen3-TTS with built-in voices |
| qwen3-tts-instruct-flash | Instruction-controlled TTS |
| qwen3-tts-instruct-flash-realtime | Realtime instruction-controlled Qwen3-TTS |
| qwen3-tts-vc-2026-01-22 | Non-realtime synthesis target for cloned voices |
| qwen3-tts-vd-2026-01-26 | Non-realtime synthesis target for designed voices |
| qwen3-tts-vc-realtime-2026-01-15 | Realtime synthesis target for cloned voices |
| qwen3-tts-vd-realtime-2026-01-15 | Realtime synthesis target for designed voices |
| qwen-audio-3.0-asr-flash-streaming | Recommended realtime ASR with hotwords, prompt context, languages, and dialects |
| qwen-audio-3.0-asr-flash-filetrans | Recommended non-realtime file transcription; up to 12 hours / 2 GB |
| qwen-audio-3.0-asr-flash | Non-realtime short-audio transcription; up to 5 minutes / 2 GB |
| qwen3-asr-flash-realtime | Realtime ASR with emotion recognition |
| qwen3-asr-flash-filetrans | Non-realtime file transcription with emotion recognition |
| qwen3-asr-flash | Non-realtime short-audio transcription with emotion recognition |

## Embedding / Rerank

| Model ID | Key Info |
|----------|----------|
| qwen3.7-text-embedding | Recommended text/code embedding; 128K context; dense, sparse, or combined output |
| qwen3.7-text-embedding-flash | Lower-cost text/code embedding; 128K context; dense, sparse, or combined output |
| text-embedding-v4 | Faster, lower-cost text embedding with flexible dimensions |
| qwen3-vl-embedding | Multimodal embedding for text, images, and video |
| qwen3.7-text-rerank | Recommended text reranking |
| qwen3-vl-rerank | Multimodal reranking |
| qwen3-rerank | Earlier-generation text reranking |
