#!/usr/bin/env python3
"""Generate or edit images using Wan and Qwen Image models via DashScope API.

Supports configuration-driven defaults plus sync and async generation modes.
wan2.6-image supports image editing (multi-image input) and interleaved
text-image output. Qwen Image series supports text rendering, image editing,
and text-to-image with fixed resolutions.
Self-contained, stdlib only.
"""
from __future__ import annotations

import sys

if sys.version_info < (3, 9):
    print(f"Error: Python 3.9+ required (found {sys.version}). "
          "Install: https://www.python.org/downloads/", file=sys.stderr)
    sys.exit(1)

import argparse
import http.client
import json
import re
from pathlib import Path
from urllib.parse import urlparse
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))

from qianwen_lib import (  # noqa: E402
    download_file,
    http_request,
    load_request,
    native_base_url,
    poll_task,
    require_api_key,
    run_update_signal,
    sanitize_diagnostic,
    validate_token_plan_model,
)
from image_lib import (  # noqa: E402
    SYNC_PATH,
    ASYNC_PATH,
    I2I_ASYNC_PATH,
    T2I_ASYNC_PATH,
    default_model,
    i2i_default_model,
    is_image_edit_model,
    is_i2i_model,
    is_qwen_image_edit_model,
    is_qwen_t2i_model,
    is_z_image_model,
    build_payload,
    build_i2i_payload,
    build_t2i_payload,
    extract_image_urls,
    extract_i2i_urls,
    extract_interleaved_content,
    extract_usage,
)

# ---------------------------------------------------------------------------
# Generation calls (sync / async)
# ---------------------------------------------------------------------------

_DOWNLOAD_ERRORS = (OSError, RuntimeError, ValueError, http.client.HTTPException)
_QUERY_OR_FRAGMENT = re.compile(r"([?#])[^\s<>\"']+")


def _download_image(
        url: str,
        destination: Path,
        index: int,
        total: int,
        failures: list[dict[str, Any]],
) -> bool:
    """Download one image and record a sanitized failure for the caller."""
    try:
        download_file(url, destination)
    except _DOWNLOAD_ERRORS as exc:
        error = sanitize_diagnostic(str(exc))
        error = _QUERY_OR_FRAGMENT.sub(r"\1[REDACTED]", error)
        failures.append({"index": index, "error": error})
        print(f"Failed to download image {index}/{total}: {error}", file=sys.stderr)
        return False
    return True


def _call_generate_sync(req: dict[str, Any], api_key: str) -> dict[str, Any]:
    model = req["model"] if "model" in req else default_model()
    url = f"{native_base_url().rstrip('/')}{SYNC_PATH}"
    payload = build_payload(req, model, api_key)
    model = req.get("model", model)

    enable_interleave = req.get("enable_interleave", False)
    is_edit = is_image_edit_model(model) or is_qwen_image_edit_model(model)

    if is_image_edit_model(model) and enable_interleave:
        raise ValueError(
            "Interleaved text-image sync mode requires streaming, which is not "
            "supported by this script. Use --async mode instead for interleaved output."
        )

    resp = http_request("POST", url, api_key, payload, timeout=180)
    width, height = extract_usage(resp)

    if is_edit:
        image_urls = extract_image_urls(resp)
        return {
            "image_urls": image_urls, "image_url": image_urls[0],
            "image_count": len(image_urls), "width": width, "height": height,
            "seed": req.get("seed"),
        }

    image_urls = extract_image_urls(resp)
    return {
        "image_urls": image_urls, "image_url": image_urls[0],
        "image_count": len(image_urls), "width": width, "height": height,
        "seed": req.get("seed"),
    }


def _call_generate_async(req: dict[str, Any], api_key: str) -> dict[str, Any]:
    model = req["model"] if "model" in req else default_model()
    url = f"{native_base_url().rstrip('/')}{ASYNC_PATH}"
    payload = build_payload(req, model, api_key)
    model = req.get("model", model)

    resp = http_request(
        "POST", url, api_key, payload,
        extra_headers={"X-DashScope-Async": "enable"}, timeout=60,
    )
    task_id = (resp.get("output") or {}).get("task_id")
    if not task_id:
        raise RuntimeError("No task_id in async response")

    result = poll_task(
        task_id, api_key,
        timeout_s=int(req.get("timeout_s", 600)),
        interval=int(req.get("poll_interval_s", 10)),
    )
    task_status = (result.get("output") or {}).get("task_status", "")
    if task_status != "SUCCEEDED":
        msg = (result.get("output") or {}).get("message", "Unknown error")
        code = (result.get("output") or {}).get("code", "")
        error_detail = f"{code}: {msg}" if code else msg
        print(f"Task failed ({task_status}): {error_detail}", file=sys.stderr)
        raise RuntimeError(f"Async task failed: {task_status} -- {msg}")

    width, height = extract_usage(result)

    is_edit = is_image_edit_model(model) or is_qwen_image_edit_model(model)
    enable_interleave = req.get("enable_interleave", False)

    if is_image_edit_model(model) and enable_interleave:
        interleaved = extract_interleaved_content(result)
        image_urls = [item["image"] for item in interleaved if item["type"] == "image"]
        return {
            "interleaved_content": interleaved, "image_urls": image_urls,
            "image_url": image_urls[0] if image_urls else None,
            "image_count": len(image_urls), "width": width, "height": height,
        }
    if is_edit:
        image_urls = extract_image_urls(result)
        return {
            "image_urls": image_urls, "image_url": image_urls[0],
            "image_count": len(image_urls), "width": width, "height": height,
            "seed": req.get("seed"),
        }

    image_urls = extract_image_urls(result)
    return {
        "image_urls": image_urls, "image_url": image_urls[0],
        "image_count": len(image_urls), "width": width, "height": height,
        "seed": req.get("seed"),
    }


def _call_i2i_async(req: dict[str, Any], api_key: str) -> dict[str, Any]:
    model = req["model"] if "model" in req else i2i_default_model()
    url = f"{native_base_url().rstrip('/')}{I2I_ASYNC_PATH}"
    payload = build_i2i_payload(req, model, api_key)

    resp = http_request(
        "POST", url, api_key, payload,
        extra_headers={"X-DashScope-Async": "enable"}, timeout=60,
    )
    task_id = (resp.get("output") or {}).get("task_id")
    if not task_id:
        raise RuntimeError("No task_id in i2i async response")

    result = poll_task(
        task_id, api_key,
        timeout_s=int(req.get("timeout_s", 600)),
        interval=int(req.get("poll_interval_s", 10)),
    )
    task_status = (result.get("output") or {}).get("task_status", "")
    if task_status != "SUCCEEDED":
        msg = (result.get("output") or {}).get("message", "Unknown error")
        code = (result.get("output") or {}).get("code", "")
        error_detail = f"{code}: {msg}" if code else msg
        print(f"Task failed ({task_status}): {error_detail}", file=sys.stderr)
        raise RuntimeError(f"i2i task failed: {task_status} -- {msg}")

    image_urls = extract_i2i_urls(result)
    usage = result.get("usage") or {}
    return {
        "image_urls": image_urls, "image_url": image_urls[0],
        "image_count": usage.get("image_count", len(image_urls)),
        "seed": req.get("seed"),
    }


def _call_t2i_async(req: dict[str, Any], api_key: str) -> dict[str, Any]:
    model = req.get("model")
    if not model:
        raise ValueError(
            "Legacy text-to-image requires an explicit model; use the general "
            "image generation route for the current default."
        )
    url = f"{native_base_url().rstrip('/')}{T2I_ASYNC_PATH}"
    payload = build_t2i_payload(req, model)

    resp = http_request(
        "POST", url, api_key, payload,
        extra_headers={"X-DashScope-Async": "enable"}, timeout=60,
    )
    task_id = (resp.get("output") or {}).get("task_id")
    if not task_id:
        raise RuntimeError("No task_id in text2image async response")

    result = poll_task(
        task_id, api_key,
        timeout_s=int(req.get("timeout_s", 600)),
        interval=int(req.get("poll_interval_s", 10)),
    )
    task_status = (result.get("output") or {}).get("task_status", "")
    if task_status != "SUCCEEDED":
        msg = (result.get("output") or {}).get("message", "Unknown error")
        code = (result.get("output") or {}).get("code", "")
        error_detail = f"{code}: {msg}" if code else msg
        print(f"Task failed ({task_status}): {error_detail}", file=sys.stderr)
        raise RuntimeError(f"text2image task failed: {task_status} -- {msg}")

    image_urls = extract_i2i_urls(result)
    usage = result.get("usage") or {}
    return {
        "image_urls": image_urls, "image_url": image_urls[0],
        "image_count": usage.get("image_count", len(image_urls)),
        "seed": req.get("seed"),
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    run_update_signal(caller=__file__)
    help_requested = any(arg in {"-h", "--help"} for arg in sys.argv[1:])
    help_default_model = default_model() if help_requested else None
    help_default_model_text = help_default_model or "loaded at runtime"
    help_epilog = """\
request JSON fields (--request / --file):
  prompt              (required) Text description of the desired image
  reference_images    Array of image URLs/paths for editing (wan2.6-image, wan2.5-i2i,
                      qwen-image-edit series)
  reference_image     Single image URL/path (alternative to reference_images)
  enable_interleave   true — interleaved text+image output (wan2.6-image only)
  max_images          Max images in interleaved mode (default: 5)
  n                   Number of output images (default: 1)
  size                Output size, e.g. "1280*1280", "1K", "2K" (model-dependent)
  negative_prompt     What to avoid in the image
  seed                Reproducibility seed
  prompt_extend       true/false — auto-enhance prompt (default: true)
  watermark           true/false — add watermark (default: false)

default model (loaded from CDN/fallback config):
  __CONFIGURED_DEFAULT_MODEL__

models (Wan series):
  wan2.7-image        Multi-function — text-to-image, image editing, interleaved output
  wan2.7-image-pro    Multi-function (higher quality) — text-to-image, image editing,
                      multi-image composition, interleaved output
  wan2.6-t2i          Text-to-image ONLY — dedicated t2i model, sync + async
  wan2.6-image        Image editing ONLY — requires reference_images or
                      enable_interleave=true. NOT for pure text-to-image!
  wan2.5-i2i-preview  Image editing + multi-image fusion (1-3 ref images, async-only)
  wan2.5-t2i-preview  Text-to-image with custom aspect ratios
  wan2.2-t2i-flash    Fast text-to-image generation

models (Qwen Image series):
  qwen-image-3.0-pro  Latest flagship — fused generation + multi-image
                      editing (1-3 ref, 1-6 output), strong text rendering
  qwen-image-3.0      Latest generation — general-purpose text-to-image + editing
  qwen-image-2.0-pro  Fused generation + editing — text rendering, multi-image
                      (1-3 ref, 1-6 output)
  qwen-image-2.0      Accelerated generation + editing
  qwen-image-edit-max  Image editing — 1-6 output images
  qwen-image-edit-plus Image editing — 1-6 output images
  qwen-image-edit      Image editing — 1 output image only
  qwen-image-plus     Text-to-image — fixed resolutions only (async-only)
  qwen-image-max      Text-to-image — fixed resolutions only

models (other):
  z-image-turbo       Open-source SOTA T2I — sync-only; single text content;
                      no `n`; no reference images. Parameters: size, prompt_extend, seed.

local files:
  Local image paths in reference_images are auto-uploaded to DashScope
  temporary storage (oss://, 48h TTL). No manual upload step needed.

environment variables:
  DASHSCOPE_API_KEY   (required) API key — also loaded from .env file
  QIANWEN_API_KEY        (alternative) Alias for DASHSCOPE_API_KEY
  QWEN_REGION         cn-beijing (default)

examples:
  # Text-to-image (configured default: __CONFIGURED_DEFAULT_MODEL__)
  python scripts/image.py --request '{"prompt":"a cat sitting on a windowsill"}'

  # Text-to-image with wan2.7-image-pro (4K, thinking mode)
  python scripts/image.py --request '{"prompt":"a flower shop with delicate windows",
    "size":"4K","thinking_mode":true}' --model wan2.7-image-pro

  # Sequential multi-image with wan2.7 (up to 12 images)
  python scripts/image.py --request '{"prompt":"A stray orange cat through four seasons",
    "enable_sequential":true,"n":4}' --model wan2.7-image-pro

  # Image editing with wan2.7 (0-9 reference images)
  python scripts/image.py --request '{"prompt":"Apply graffiti from image 2 to the car in image 1",
    "reference_images":["car.jpg","graffiti.jpg"]}' --model wan2.7-image-pro

  # Interactive editing with bbox (wan2.7)
  python scripts/image.py --request '{"prompt":"Place the clock from image 1 at the marked location in image 2",
    "reference_images":["clock.jpg","room.jpg"],
    "bbox_list":[[],[[989,515,1138,681]]]}' --model wan2.7-image-pro

  # Image editing with wan2.6-image
  python scripts/image.py --request '{"prompt":"Apply watercolor style",
    "reference_images":["photo.jpg"]}' --model wan2.6-image

  # Image editing with qwen-image-2.0-pro
  python scripts/image.py --request '{"prompt":"Make the girl wear the dress from Image 2",
    "reference_images":["girl.jpg","dress.jpg"],"n":2}' --model qwen-image-2.0-pro

  # Text-to-image with qwen-image-plus (fixed resolutions)
  python scripts/image.py --request '{"prompt":"A poster with three puppies",
    "size":"1664*928"}' --model qwen-image-plus

  # Interleaved text-image tutorial
  python scripts/image.py --request '{"prompt":"3-step coffee tutorial",
    "enable_interleave":true,"max_images":3}' --model wan2.6-image --async

  # Multi-image fusion with wan2.5-i2i-preview
  python scripts/image.py --request '{"prompt":"Place the cat on the sofa",
    "reference_images":["cat.jpg","sofa.jpg"]}' --model wan2.5-i2i-preview
""".replace("__CONFIGURED_DEFAULT_MODEL__", help_default_model_text)
    parser = argparse.ArgumentParser(
        description="Generate or edit images with Wan and Qwen Image models",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=help_epilog,
    )
    parser.add_argument("--request", help="Inline JSON: must contain 'prompt'")
    parser.add_argument("--file", help="Path to JSON file containing request body")
    parser.add_argument("--model", default=None,
                        help=("Model name (overrides value in request file; "
                              f"default: {help_default_model_text}, loaded from CDN/fallback config)"))
    parser.add_argument(
        "--async", dest="async_mode", action="store_true",
        help="Use async mode (auto-enabled for wan2.5-i2i, qwen-image-plus/max, and interleaved output)",
    )
    default_output = Path("output/qianwen-image-generation/images/output.png")
    parser.add_argument(
        "--output", default=str(default_output),
        help="Output image path, or directory for multi-image (default: %(default)s)",
    )
    parser.add_argument("--print-response", action="store_true", help="Print result JSON to stdout")
    args = parser.parse_args()

    try:
        api_key = require_api_key(script_file=__file__, domain="Image")
        req = load_request(args)

        if args.model:
            req["model"] = args.model
        elif "model" not in req:
            req["model"] = help_default_model or default_model()

        model = req["model"]
        validate_token_plan_model(api_key, model)
        is_edit = is_image_edit_model(model)
        is_i2i = is_i2i_model(model)
        is_qwen_t2i = is_qwen_t2i_model(model)
        is_z_image = is_z_image_model(model)
        enable_interleave = req.get("enable_interleave", False)

        if is_z_image and args.async_mode:
            print(f"{model} is sync-only. Disabling --async.", file=sys.stderr)
            args.async_mode = False

        if is_i2i and not args.async_mode:
            print("wan2.5-i2i-preview is async-only. Enabling --async automatically.", file=sys.stderr)
            args.async_mode = True

        if is_qwen_t2i and not args.async_mode:
            print(f"{model} uses async text2image API. Enabling --async automatically.", file=sys.stderr)
            args.async_mode = True

        if is_edit and enable_interleave and not args.async_mode:
            print("Interleaved text-image mode requires --async. Enabling automatically.", file=sys.stderr)
            args.async_mode = True

        if is_qwen_image_edit_model(model) and enable_interleave:
            print(f"Error: {model} does not support enable_interleave. "
                  "Use wan2.6-image for interleaved text-image output.", file=sys.stderr)
            sys.exit(1)

        if is_i2i:
            result = _call_i2i_async(req, api_key)
        elif is_qwen_t2i:
            result = _call_t2i_async(req, api_key)
        elif args.async_mode:
            result = _call_generate_async(req, api_key)
        else:
            result = _call_generate_sync(req, api_key)
    except (ValueError, RuntimeError, OSError) as exc:
        print(sanitize_diagnostic(f"Error: {exc}"), file=sys.stderr)
        sys.exit(1)

    output_path = Path(args.output)
    image_urls = result.get("image_urls") or ([result["image_url"]] if result.get("image_url") else [])

    download_failures: list[dict[str, Any]] = []

    if len(image_urls) == 1:
        if output_path.is_dir() or output_path.suffix == "":
            output_path.mkdir(parents=True, exist_ok=True)
            url_filename = Path(urlparse(image_urls[0]).path).name or "output.png"
            output_path = output_path / url_filename
        if _download_image(image_urls[0], output_path, 1, 1, download_failures):
            result["local_path"] = str(output_path)
        else:
            result["download_failures"] = download_failures
    elif len(image_urls) > 1:
        local_paths: list[str] = []
        if output_path.suffix != "":
            # output is a filename: derive sequential names <stem>-1<suffix>, <stem>-2<suffix>...
            out_dir = output_path.parent
            out_dir.mkdir(parents=True, exist_ok=True)
            stem = output_path.stem
            suffix = output_path.suffix
            for i, url in enumerate(image_urls):
                dest = out_dir / f"{stem}-{i + 1}{suffix}"
                if not _download_image(
                        url, dest, i + 1, len(image_urls), download_failures
                ):
                    continue
                local_paths.append(str(dest))
        else:
            # output is a directory: keep existing behavior (mkdir + URL basename)
            out_dir = output_path
            out_dir.mkdir(parents=True, exist_ok=True)
            for i, url in enumerate(image_urls):
                url_basename = Path(urlparse(url).path).name
                if url_basename and "." in url_basename:
                    dest = out_dir / url_basename
                else:
                    dest = out_dir / f"output_{i + 1}.png"
                if not _download_image(
                        url, dest, i + 1, len(image_urls), download_failures
                ):
                    continue
                local_paths.append(str(dest))
        print(f"Saved {len(local_paths)} images: {', '.join(local_paths)}", file=sys.stderr)
        result["local_paths"] = local_paths
        if local_paths:
            result["local_path"] = local_paths[0]
        if download_failures:
            result["download_failures"] = download_failures

    if result.get("interleaved_content"):
        out_dir = output_path if output_path.suffix == "" else output_path.parent
        out_dir.mkdir(parents=True, exist_ok=True)
        md_path = out_dir / "interleaved_output.md"
        md_lines: list[str] = []
        failed_image_indexes = {failure["index"] for failure in download_failures}
        img_idx = 0
        for item in result["interleaved_content"]:
            if item["type"] == "text":
                md_lines.append(item["text"])
            elif item["type"] == "image":
                img_idx += 1
                if img_idx in failed_image_indexes:
                    md_lines.append(f"\n[Image {img_idx} download failed]\n")
                    continue
                img_url = item["image"]
                img_basename = Path(urlparse(img_url).path).name
                if not img_basename or "." not in img_basename:
                    img_basename = f"output_{img_idx}.png"
                md_lines.append(f"\n![Image {img_idx}]({img_basename})\n")
        try:
            md_path.write_text("\n".join(md_lines), encoding="utf-8")
        except Exception as exc:
            error = sanitize_diagnostic(str(exc))
            result["interleaved_output_error"] = error
            print(f"Failed to save interleaved content: {error}", file=sys.stderr)
        else:
            print(f"Saved interleaved content: {md_path}", file=sys.stderr)

    if args.print_response:
        print(json.dumps(result, ensure_ascii=False, indent=2))

    if download_failures or "interleaved_output_error" in result:
        sys.exit(1)


if __name__ == "__main__":
    main()
