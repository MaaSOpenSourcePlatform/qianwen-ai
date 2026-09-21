# QianWen Model Pricing (China)

> **Source**: [Official pricing page](https://platform.qianwenai.com/docs/developer-guides/getting-started/pricing) — check for the latest rates.
>
> **Important**: This file provides stable billing guidance. Model lists and model-specific billing information are in the [CDN model-pricing reference](https://alioth.alicdn.com/skills-info/models/references/qianwen-model-pricing.md). Specific prices, free quota amounts, and availability are subject to change without notice. Always refer to the official pricing page for authoritative, up-to-date pricing data. If CDN access fails, use the [local fallback](../cdn/references/qianwen-model-pricing.md).
>
> All prices in **CNY**.

## Text Generation (per 1M tokens)

> Third-party models are hosted on the QianWen platform but billed/maintained by their respective providers. Pricing tiers and free quotas may differ from first-party Qwen models. Always verify via `qianwen models info <id>` before estimating cost.

- Billing unit: **per 1M tokens** (input and output priced separately)
- Some models have **tiered pricing** based on input context length (e.g. ≤32K, ≤128K, ≤256K, ≤1M)
- Thinking mode output may be priced differently from non-thinking output
- **Batch API**: 50% off for supported models
- Some models may offer a limited free quota — **do not assume the user has remaining free quota**; use the **qianwen-usage** skill to check, or verify in the [QianWen console](https://platform.qianwenai.com/home/benefits)

For per-token pricing, see each model's detail page, e.g. [qwen3.8-max](https://www.qianwenai.com/models/qwen3.8-max).

## Vision Understanding (per 1M tokens)

- Billing unit: **per 1M tokens**
- Tiered pricing by input context length for some models

## Omni Models (per 1M tokens)

- Billing unit: **per 1M tokens**
- Separate rates for text input, audio input, image/video input, text output, and audio output

## Image Generation (per image)

- Billing unit: **per image generated**
- Multi-image output (`n > 1`) is billed per image

## Video Generation (per second)

- Billing unit: **per second of generated video**
- Price varies by resolution (480P / 720P / 1080P)
- Audio-enabled models may have different rates than silent variants
- Video editing is billed on the output video duration

For per-second pricing, see each model's detail page, e.g. [wan2.7-t2v](https://www.qianwenai.com/models/wan2.7-t2v).

## Speech Synthesis / TTS (per 10K characters)

- Billing unit: **per 10,000 characters**

For per-character pricing, see each model's detail page, e.g. [qwen-audio-3.0-tts-plus](https://www.qianwenai.com/models/qwen-audio-3.0-tts-plus).

## Speech Recognition / ASR (per second of audio)

- Billing unit: **per second of audio**

## Text Embedding (per 1M tokens)

- Billing unit: **per 1M input tokens**

## Multimodal Embedding (per 1M tokens)

- Billing unit: **per 1M input tokens**

## Text Rerank (per 1M tokens)

- Billing unit: **per 1M input tokens**

## Translation (per 1M tokens)

- Billing unit: **per 1M tokens** (input and output priced separately)

## Notes

- **API Key must be created from the** [QianWen Console](https://platform.qianwenai.com/home/api-keys).
- **Free quota**: Some models include a limited free quota after activating QianWen. **However**: free quota amounts, eligibility, and validity periods are subject to change without notice. Quotas may have already been consumed or expired. **Never assume the user has remaining free quota** — always present the paid unit price as the primary reference. Use the **qianwen-usage** skill to check remaining free tier quota, or direct the user to the [QianWen console](https://platform.qianwenai.com/home/benefits).
- **Batch calling**: Supported models get 50% off (both input and output).
- **Context cache**: Eligible models get input token discounts.
- **Tiered pricing**: Some models have higher per-token cost as input length increases.
- **For the latest prices**: Always check the [official pricing page](https://platform.qianwenai.com/docs/developer-guides/getting-started/pricing).
- **View actual usage and bills**: Use the **qianwen-usage** skill (standard `sk-` keys only), or visit the console: [Usage Analytics](https://platform.qianwenai.com/home/analytics) | [Pay-as-you-go Billing](https://platform.qianwenai.com/home/billing/pay-as-you-go) | [Token Plan Subscription](https://platform.qianwenai.com/home/billing/subscription/token-plan).
