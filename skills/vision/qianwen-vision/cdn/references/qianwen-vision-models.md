# Qwen Vision Models

## Defaults

| Task | Default model | Notes |
|------|---------------|-------|
| General image/video understanding | `qwen3.8-flash` | Latest fast multimodal model; thinking on by default; Token Plan and PAYG |
| Visual reasoning | `qwen3.8-max` | Strongest current vision-language model; thinking on by default; Token Plan and PAYG |
| OCR | `qwen3.8-flash` | Latest PAYG + Token Plan default; use `qwen3.5-ocr` on PAYG for specialized document extraction. |

## Main model catalog

| Model | Recommended use | Core model information |
|-------|-----------------|------------------------|
| `qwen3.8-max` | Most complex image/video understanding and reasoning | Strongest flagship; 2.4T-parameter MoE; top-tier text+image+video; 1M context; thinking on by default |
| `qwen3.8-max-0902` | Latest pinned Qwen3.8 Max snapshot | Improved coding, multi-agent collaboration, and visual understanding; 1M context; thinking on by default; PAYG only |
| `qwen3.8-flash` | **Preferred general vision default** | Latest fast Qwen model; text+image+video; 1M context; thinking on by default |
| `qwen3.8-27b` | Open-source multimodal work | 27B dense vision-language model; improved coding and office tasks; hybrid thinking on by default |
| `qwen3.7-plus` | Balanced multimodal tasks | Enhanced Agent execution, coding, and GUI perception; 1M context; thinking on by default |
| `qwen3.7-flash` | Fast, high-performance vision and multimodal Agent tasks | Enhanced universal recognition, Search Agent, CI Agent, and vibe coding; 1M context; thinking on by default |
| `qwen3.6-plus` | General image/video understanding | Previous-generation balanced text+image+video model; strong coding and universal recognition; thinking on by default |
| `qwen3.6-flash` | Fast general multimodal understanding | Text+image+video; thinking on by default |
| `qwen3.5-plus` | General multimodal understanding | Unified text+image+video; 1M context; thinking on by default |
| `qwen3.5-flash` | Fast multimodal understanding | Faster general text+image+video model; thinking on by default |
| `qwen3.5-omni-plus` | Multimodal understanding with audio input/output | Text, image, audio, and video input; text and audio output; 256K context |
| `qwen3.5-omni-flash` | Faster multimodal understanding with audio input/output | Text, image, audio, and video input; text and audio output; 256K context |
| `qwen3-vl-plus` | High-precision localization and document/webpage parsing | 2D/3D object localization, agent tool calling, QwenVL HTML/Markdown parsing; thinking off by default |
| `qwen3-vl-flash` | High-throughput, low-latency vision | 33 languages and tool calling; thinking off by default |
| `qvq-max` | Legacy deep visual reasoning | Thinking-only chain-of-thought for math, charts, and complex scenes; streaming output only |
| `qwen3.5-ocr` | Dedicated OCR on PAYG | Latest specialized OCR model; PDF parsing, multi-turn, enhanced card/ID recognition |
| `qwen-vl-ocr` | Legacy OCR | Text extraction, table parsing, document scanning; select explicitly |
| `qwen-vl-max` | Qwen2.5-VL generation | Best-performing model in the Qwen2.5-VL series |
| `qwen-vl-plus` | Qwen2.5-VL generation | Faster balance of performance and throughput; 11 languages |

## Scenario recommendations

| Scenario | Recommended model(s) | Notes |
|----------|----------------------|-------|
| General image/video understanding | `qwen3.8-flash` | Latest general-purpose model with Token Plan and PAYG support |
| Strongest image/video reasoning | `qwen3.8-max` | Strongest flagship |
| Fast high-performance vision | `qwen3.8-flash` | Latest fast multimodal model with full tool support |
| High-precision localization / document parsing | `qwen3-vl-plus` | 2D/3D localization and QwenVL HTML/Markdown parsing |
| High throughput / low latency | `qwen3.8-flash` | Latest fast multimodal model; 1M context and tool calling; Token Plan and PAYG |
| Deep visual reasoning | `qwen3.8-max` | Strongest current general visual reasoner with thinking and built-in tools |
| OCR text recognition | `qwen3.8-flash` or `qwen3.5-ocr` | Use `qwen3.8-flash` as the cross-plan default; use `qwen3.5-ocr` on PAYG for specialized OCR |
| Chart / table extraction | `qwen3.8-max`, `qwen3.8-flash`, or `qwen3.7-plus` | Qwen3.8/3.7 support structured output with thinking on or off |
| Video understanding | `qwen3.8-flash` or `qwen3.8-max` | Supports videos up to two hours |
| Video reasoning | `qwen3.8-max` or `qwen3.8-flash` | Supports videos up to two hours |
| Agent tool calling | `qwen3.8-max`/`flash`, `qwen3.7-plus`/`flash`, `qwen3.6-plus`/`flash`, `qwen3.5-plus`/`flash`, `qwen3-vl-plus` | Function calling supported |
| Multimodal Agent (Search/CI) | `qwen3.8-max` or `qwen3.8-flash` | Latest models with built-in tools and multimodal Agent capability |

For Token Plan availability, use a vision-capable model from this documented set: `qwen3.8-max`, `qwen3.8-flash`, `qwen3.7-plus`, `qwen3.6-flash`, and `deepseek-v4.1-flash` for personal and team plans; `qwen3.6-plus`, `kimi-k2.7-code`, `kimi-k2.6`, and `kimi-k2.5` are additional team-plan options. The dedicated `qwen3.5-ocr` model is PAYG-only. Use `qwen3.8-flash` for general OCR or lightweight reasoning, and `qwen3.8-max` for the best general OCR quality or visual reasoning; specialized ID-card, coordinate, or formula extraction can be less accurate than with the dedicated OCR model.

## Thinking-model compatibility

### Thinking-only models

| Model | Region | Notes |
|-------|--------|-------|
| `qvq-max` | China (`cn-beijing`) | Streaming output only; `incremental_output` defaults to true |
| `qvq-plus` | China (`cn-beijing`) | Streaming output only |
| `qwen3-vl-235b-a22b-thinking` | China, Global | Open source; streaming only |
| `qwen3-vl-32b-thinking` | China, Global | Open source; streaming only |
| `qwen3-vl-30b-a3b-thinking` | China, Global | Open source |
| `qwen3-vl-8b-thinking` | China, Global | Open source |

### Hybrid-thinking models

| Model | Thinking default | Notes |
|-------|------------------|-------|
| `qwen3-vl-plus` | Off | Set `enable_thinking: true` to activate |
| `qwen3-vl-flash` | Off | Set `enable_thinking: true` to activate |
| `qwen3.8-max` | On | Set `enable_thinking: false` to disable |
| `qwen3.8-max-0902` | On | Latest pinned Max snapshot; set `enable_thinking: false` to disable |
| `qwen3.8-flash` | On | Set `enable_thinking: false` to disable |
| `qwen3.8-27b` | On | Open-source hybrid-thinking model |
| `qwen3.7-plus` | On | Set `enable_thinking: false` to disable |
| `qwen3.7-flash` | On | Set `enable_thinking: false` to disable |
| `qwen3.6-plus` | On | Strong all-rounder; set `enable_thinking: false` to disable |
| `qwen3.6-flash` | On | Set `enable_thinking: false` to disable |
| `qwen3.5-plus` | On | Set `enable_thinking: false` to disable |
| `qwen3.5-flash` | On | Set `enable_thinking: false` to disable |

QVQ models and models explicitly marked as streaming-only in the table above require streaming. Thinking-only status by itself does not imply a streaming requirement. Qwen3.8 and Qwen3.7 support structured output in thinking and non-thinking modes; Qwen3.6, Qwen3.5, and Qwen3-VL require thinking to be disabled for structured output. Hybrid-thinking models can use `enable_thinking`; `thinking_budget` controls reasoning depth.

## OCR models and capabilities

| Model | Region | Notes |
|-------|--------|-------|
| `qwen3.5-ocr` | China (`cn-beijing`) | Latest dedicated OCR model; PDF parsing, multi-turn, and enhanced card/ID recognition; PAYG only |
| `qwen-vl-ocr` (stable) | China (`cn-beijing`) | Legacy OCR model |
| `qwen-vl-ocr-2025-11-20` | China (`cn-beijing`) | Pinned version of qwen-vl-ocr |

Dedicated OCR models support multilingual text, skewed images, tables, formulas, text localization with bounding boxes, and documents such as receipts, invoices, ID cards, contracts, and handwritten notes. For text-heavy images, prefer `qwen3.5-ocr` or `qwen-vl-ocr` over general VL models.

## Input and capability limits by model family

| Capability | Model family | Limit / compatibility |
|------------|--------------|-----------------------|
| Image input by URL | Qwen3.8/3.7/3.6/3.5 and Qwen3-VL | Up to 20 MB |
| Image input by URL | Other vision models | Up to 10 MB |
| Image input by Base64 (OpenAI-compatible / DashScope) | Qwen3.8/3.7/3.6/3.5 and Qwen3-VL | Original image up to 20 MB and encoded data URI up to 20 MB |
| Image input by Base64 (OpenAI-compatible / DashScope) | Other vision models | Original image up to 10 MB and encoded data URI up to 20 MB |
| Image input by Base64 (Anthropic-compatible) | All vision models | Entire request body up to 6 MB |
| Video input by URL | Qwen3.8/3.7/3.6/3.5, Qwen3-VL, and `qwen-vl-max` (`latest`, `2025-04-08`, or later) | Up to 2 GB |
| Video input by URL | qwen-vl-plus, earlier qwen-vl-max snapshots, Qwen2.5-VL, and QVQ | Up to 1 GB |
| Video input by URL | Other vision models | Up to 150 MB |
| Video input by Base64 | All vision models | Encoded data URI below 10 MB |
| Video understanding | Qwen3.8/3.7/3.6/3.5 | 2 seconds–2 hours |
| Video understanding | Qwen3-VL | 2 seconds–1 hour |
| Video understanding | QVQ and Qwen2.5-VL models where video input is supported | 2 seconds–10 minutes |
| Video audio | All vision models | Audio is not processed; models analyze sampled frames only |
| Structured output | Qwen3.8 and Qwen3.7 | Supported with thinking on or off |
| Structured output | Qwen3.6, Qwen3.5, and Qwen3-VL | Requires non-thinking mode |
| Function calling | Qwen3.8/3.7/3.6/3.5 plus and flash; Qwen3-VL plus and flash | Supported |
