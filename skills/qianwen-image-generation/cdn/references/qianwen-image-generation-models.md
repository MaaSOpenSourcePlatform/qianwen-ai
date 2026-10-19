# Qwen Image Generation Models

## Default and recommendations

- Default model: `qwen-image-3.0-pro` (latest recommended image model with both PAYG and Token Plan support).
- Never use `wan2.6-image` for pure text-to-image: it requires reference images or interleaved-output mode.

| Scenario | Recommended model | Notes |
|---|---|---|
| General creative work / realistic photography | `qwen-image-3.0-pro` or `qwen-image-3.0` | `qwen-image-3.0-pro` is the default; use 3.0 for faster generation. |
| Dedicated text-to-image | `wan2.6-t2i` | Dedicated t2i model with sync and async support. |
| Open-source / lowest-cost text-to-image | `z-image-turbo` | Sync-only; one output; no reference images. |
| Fast drafts | `wan2.2-t2i-flash` | Lower latency. |
| Image editing / style transfer | `qwen-image-3.0-pro`, `wan2.7-image-pro`, or `wan2.7-image` | Qwen Image 3.0 supports 1–3 references; Wan 2.7 accepts 0–9. |
| Subject consistency | `wan2.7-image-pro`, `wan2.7-image`, or `wan2.6-image` | Maintains subject identity across generated images. |
| Multi-image composition | `wan2.7-image-pro`, `wan2.7-image`, or `wan2.6-image` | Combines subjects, style, and backgrounds from references. |
| Sequential images with the same character or story | `wan2.7-image-pro` or `wan2.7-image` | Coherent sequences of 1–12 images. |
| Region-based interactive editing | `wan2.7-image-pro` or `wan2.7-image` | Supports bounding-box editing. |
| Straightforward single-image editing / object fusion | `wan2.5-i2i-preview` | Subject-consistent editing; up to 3 references; async-only. |
| Interleaved text-image output | `wan2.6-image` | Intended for tutorials, guides, and similar mixed output. |
| Posters / complex Chinese and English text | `qwen-image-3.0-pro` or `qwen-image-3.0` | Latest Qwen-Image generation with strong text rendering. `qwen-image-2.0-pro` and `wan2.6-t2i` remain suitable alternatives. |
| Precise text replacement or element manipulation | `qwen-image-3.0-pro`, `qwen-image-3.0`, or `qwen-image-2.0-pro` | Fused generation and multi-image editing. |

## Wan series

| Model | Basic capability | Important limits / compatibility |
|---|---|---|
| `wan2.7-image-pro` | Multi-function text-to-image and image editing; sequential multi-image; interactive editing; thinking mode; color palette | 0–9 references; up to 4K for t2i and 2K for editing; sync and async. |
| `wan2.7-image` | Multi-function text-to-image and image editing | Faster than pro; 0–9 references; up to 2K; sync and async. |
| `wan2.6-t2i` | Dedicated text-to-image | Sync and async; maximum prompt length 2,100 characters. |
| `wan2.6-image` | Image editing, style transfer, subject consistency, multi-image composition, interleaved text-image output | Not for pure t2i unless interleaved mode is enabled; 1–4 references for editing; up to 2K; maximum prompt length 2,000 characters. |
| `wan2.5-i2i-preview` | General image editing, subject consistency, multi-image fusion | 1–3 references; async-only; China region; output up to 1280×1280 total pixels. |
| `wan2.5-t2i-preview` | Preview text-to-image | Free size within model constraints. |
| `wan2.2-t2i-flash` | Fast text-to-image | Optimized for lower latency. |
| `wan2.2-t2i-plus` | Professional text-to-image | Improved stability. |

For `wan2.7-image-pro` and `wan2.7-image`, the default resolution is 2K. Pro alone supports 4K in text-to-image mode. Non-sequential generation supports 1–4 outputs; sequential generation supports 1–12.

## Qwen Image series

| Model | Basic capability | Important limits / compatibility |
|---|---|---|
| `qwen-image-3.0-pro` | **Recommended default.** Latest flagship; high-quality text-to-image and 1–3-reference editing; strong text rendering | Sync and async; `size` has no default and may be omitted for automatic recommendation; 1–6 outputs; recommended prompt length ≤4500 tokens. |
| `qwen-image-3.0` | Latest general-purpose generation and editing tier | Same 3.0 parameters and resolution behavior as pro; 1–6 outputs. |
| `qwen-image-2.0-pro` | Fused generation and editing; enhanced text rendering; realistic textures; multi-image fusion | 1–3 inputs and 1–6 outputs; prompt limit 1300 tokens. Snapshot: `qwen-image-2.0-pro-2026-06-22`. |
| `qwen-image-2.0-pro-2026-04-22`, `qwen-image-2.0-pro-2026-03-03` | Earlier pinned Qwen Image 2.0 Pro snapshots | Same generation-and-editing API family; prefer the current base model or latest snapshot for new work. |
| `qwen-image-2.0` | Accelerated fused generation and editing | Supports pure t2i and 1–3-reference editing; 1–6 outputs. |
| `qwen-image-2.0-2026-03-03` | Pinned Qwen Image 2.0 snapshot | Same generation-and-editing API family. |
| `qwen-image-edit-max` | Image editing | 1–3 references; 1–6 outputs. |
| `qwen-image-edit-max-2026-01-16` | Pinned Image Edit Max snapshot | 1–3 references; 1–6 outputs. |
| `qwen-image-edit-plus` | Image editing | 1–3 references; 1–6 outputs. |
| `qwen-image-edit-plus-2025-12-15`, `qwen-image-edit-plus-2025-10-30` | Pinned Image Edit Plus snapshots | 1–3 references; 1–6 outputs. |
| `qwen-image-edit` | Image editing | 1–3 references; exactly 1 output. |
| `qwen-image-plus` | Legacy text-to-image | Sync and async; exactly 1 output; fixed resolutions only. |
| `qwen-image-max` | Legacy text-to-image | Sync; exactly 1 output; fixed resolutions only. |
| `qwen-image-max-2025-12-30` | Pinned Qwen Image Max snapshot | Sync; exactly 1 output; fixed resolutions only. |
| `qwen-image` | Legacy text-to-image | Sync and async; exactly 1 output; fixed resolutions only. |

The 3.0 series supports continuous output sizes from 512×512 through 2048×2048 total-pixel tiers, with aspect ratios from 1:8 to 8:1. The 2.0 and edit series support sizes from 512×512 through 2048×2048. `qwen-image-plus`, `qwen-image-max`, and `qwen-image` support only 1664×928, 1472×1104, 1328×1328, 1104×1472, and 928×1664.

## Other model

| Model | Basic capability | Important limits / compatibility |
|---|---|---|
| `z-image-turbo` | Lightweight open-source text-to-image model | Sync-only; one text item; no `n`; no reference images; supports only size, prompt extension, and seed controls. |

## Plan compatibility and billing

- PAYG keys can use the full available catalog.
- Token Plan supports only a specific subset.
- Billing depends on the model: each successfully generated output image is billable, and models with priced image input also charge per input image.
- `wan2.6-image` interleaved output is billed per generated image; its maximum generated-image count is 1–5.
- `z-image-turbo` does not accept `n` and therefore produces a single image per request.
