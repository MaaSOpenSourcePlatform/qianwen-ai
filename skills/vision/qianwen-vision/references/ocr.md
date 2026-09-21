# Qwen OCR Text Extraction Guide

> **Content validity**: 2026-08 | **Source**: [Qwen-VL-OCR](https://platform.qianwenai.com/docs/developer-guides/multimodal/ocr)

---

## Overview

Fetch and read the current [Qwen vision model catalog](https://alioth.alicdn.com/skills-info/models/references/qianwen-vision-models.md) for OCR model recommendations, defaults, supported models, regions, and basic capabilities. If CDN access fails, use the [local fallback](../cdn/references/qianwen-vision-models.md).

---

## API Reference

Same endpoint: `POST /compatible-mode/v1/chat/completions`

### Pixel Control Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `min_pixels` | int | Minimum pixel threshold. Default: `32*32*3` (3,072). Controls minimum resolution. |
| `max_pixels` | int | Maximum pixel threshold. Default: `32*32*8192` (8,388,608). Controls max tokens consumed. |

Pass these inside the `image_url` object:

```json
{
  "type": "image_url",
  "image_url": {
    "url": "https://img.alicdn.com/imgextra/i2/O1CN01ktT8451iQutqReELT_!!6000000004408-0-tps-689-487.jpg",
    "min_pixels": 3072,
    "max_pixels": 8388608
  }
}
```

### Token Calculation

For `qwen-vl-ocr-2025-11-20`, `token_pixels = 32*32 = 1024`. Formula:

```
tokens = (h_bar × w_bar) / token_pixels + 2
```

Where `h_bar` and `w_bar` are the image dimensions after resizing to fit within pixel bounds.

### Default Behavior

If no prompt is provided, the model uses: *"Please output only the text content from the image without any additional descriptions or formatting."*

---

## Code Examples

### Basic OCR (Python)

```python
from openai import OpenAI
import os

client = OpenAI(
    api_key=os.getenv("DASHSCOPE_API_KEY"),
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
)

completion = client.chat.completions.create(
    model="qwen-vl-ocr",
    messages=[{
        "role": "user",
        "content": [
            {"type": "image_url", "image_url": {
                "url": "https://img.alicdn.com/imgextra/i2/O1CN01ktT8451iQutqReELT_!!6000000004408-0-tps-689-487.jpg",
                "min_pixels": 3072,
                "max_pixels": 8388608,
            }},
            {"type": "text", "text": "Extract all text from this image."},
        ],
    }],
)
print(completion.choices[0].message.content)
```

### Structured Extraction — Train Ticket (Python)

```python
PROMPT = """Extract the following fields from this train ticket image and return as JSON:
{"invoice_number": "...", "train_number": "...", "departure_station": "...",
 "destination_station": "...", "departure_time": "...", "seat": "...",
 "ticket_price": "...", "passenger_name": "..."}"""

completion = client.chat.completions.create(
    model="qwen-vl-ocr-2025-11-20",
    messages=[{
        "role": "user",
        "content": [
            {"type": "image_url", "image_url": {
                "url": "https://img.alicdn.com/imgextra/i1/NotRealJustExample/ticket.jpg",
                "min_pixels": 3072,
                "max_pixels": 8388608,
            }},
            {"type": "text", "text": PROMPT},
        ],
    }],
)
print(completion.choices[0].message.content)
```

### curl

```bash
curl -X POST https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions \
  -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen-vl-ocr",
    "messages": [{
      "role": "user",
      "content": [
        {"type": "image_url", "image_url": {"url": "https://img.alicdn.com/imgextra/i1/NotRealJustExample/doc.jpg", "min_pixels": 3072, "max_pixels": 8388608}},
        {"type": "text", "text": "Extract all text from this image."}
      ]
    }]
  }'
```

---

## Capabilities

- **Multi-language**: Chinese, English, Japanese, Korean, and many more
- **Skewed images**: Automatic rotation correction (DashScope SDK)
- **Tables**: Structured table data extraction
- **Formulas**: Mathematical formula recognition
- **Text localization**: Bounding box coordinates for detected text regions
- **Documents**: Receipts, invoices, ID cards, contracts, handwritten notes

---

## Important Notes

1. **Use a dedicated OCR model for text-heavy images.** Fetch the CDN model catalog linked above for the current recommendation and alternatives.
2. **Pixel parameters control cost.** Higher `max_pixels` = more tokens = better accuracy but higher cost. For simple text, lower values suffice.
3. **SDK version requirements**: DashScope Python SDK >= 1.22.2, Java SDK >= 2.21.8.
4. **DashScope-only features**: Image rotation correction and built-in OCR task types are only available through the DashScope native API, not through the OpenAI-compatible API.
