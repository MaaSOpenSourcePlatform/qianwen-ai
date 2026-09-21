# Qwen Video Generation Models

## Defaults and recommendations

| Mode / scenario | Default or recommended model | Notes |
|---|---|---|
| Text-to-video (`t2v`) | `happyhorse-1.1-t2v` | Default; audio output; Token Plan + PAYG; 3–15s; 480P/720P/1080P. |
| Image-to-video (`i2v`) | `happyhorse-1.1-i2v` | Default; audio output; Token Plan + PAYG; 3–15s; 480P/720P/1080P. |
| First-and-last-frame transition (`kf2v`) | `wan2.2-kf2v-flash` | Default; fixed 5s; silent; PAYG-only. |
| Reference-based role-play (`r2v`) | `happyhorse-1.1-r2v` | Default; audio output; Token Plan + PAYG; 3–15s; 480P/720P/1080P; up to 9 references. |
| General video editing (`vace`) | `wanx2.1-vace-plus` | Default VACE function/model; PAYG-only; ≤5s. |
| Prompt-driven video editing (`videoedit`) | `happyhorse-1.0-video-edit` | Default general editor; PAYG-only; use `wan2.7-videoedit` for effect or camera-motion replication. |
| Wan multi-shot t2v | `wan2.6-t2v` | Audio; 2–15s; 720P/1080P. |
| Wan multi-shot i2v | `wan2.6-i2v-flash` or `wan2.6-i2v` | Audio-capable; 2–15s; 720P/1080P. |
| Higher-quality Wan features | `wan2.7-t2v` or `wan2.7-i2v` | Select explicitly; Wan 2.7 adds newer ratio, continuation, and audio-sync capabilities. |
| All-in-one generation, reference, editing, or extension | `wan3.0-video` or `wan3.0-video-prime` | PAYG-only; prime is the faster tier; supports text, first/last frames, image/video/audio/file/link references, and up to 30s. |
| Multi-reference role-play | `wan2.7-r2v` | PAYG-only; up to 5 image/video references plus an optional `reference_voice`; 2–15s with images only or 2–10s when video is included. |

## Wan text-to-video

| Model | Basic capability | Important limits / compatibility |
|---|---|---|
| `wan2.7-t2v` | Ratio control, automatic soundtrack or sound-effect generation, long prompt support | 720P/1080P; up to 5000 prompt characters; uses resolution + ratio. |
| `wan2.7-t2v-2026-06-12` | Snapshot of `wan2.7-t2v` | Same capabilities as the base model at that snapshot. |
| `wan2.7-t2v-2026-04-25` | Earlier snapshot of `wan2.7-t2v` | Same request shape as the base model. |
| `wan2.6-t2v` | Audio and multi-shot narrative | 2–15s; 720P/1080P; uses size. |
| `wan2.5-t2v-preview` | Text-to-video with audio | 5s or 10s; 480P/720P/1080P. |
| `wan2.2-t2v-plus` | Silent text-to-video | 5s; 480P/1080P. |

## Wan image-to-video

| Model | Basic capability | Important limits / compatibility |
|---|---|---|
| `wan2.7-i2v` | Unified first-frame, first+last-frame, video-continuation, and audio-sync generation | Uses a media array; resolution-oriented controls. |
| `wan2.7-i2v-2026-04-25` | Snapshot of `wan2.7-i2v` | Same request shape as the base model. |
| `wan2.6-i2v-flash` | Faster image-to-video with optional audio and multi-shot | 2–15s; 720P/1080P. |
| `wan2.6-i2v` | Image-to-video with audio and multi-shot | 2–15s; 720P/1080P. |
| `wan2.5-i2v-preview` | Image-to-video with audio | 5s or 10s; 480P/720P/1080P. |
| `wan2.2-i2v-flash` | Fast silent image-to-video | Fixed 5s; 480P/720P/1080P. |

## Wan reference, transition, and editing models

| Model | Mode | Basic capability | Important limits / compatibility |
|---|---|---|---|
| `wan2.2-kf2v-flash` | kf2v | First-and-last-frame transition | Default kf2v; fixed 5s; silent; 480P/720P/1080P; PAYG-only. |
| `wan2.7-r2v` | r2v | Multi-reference image/video role-play with optional voice cloning | Up to 5 visual references plus `reference_voice`; 720P/1080P; 2–15s with images only or 2–10s when video is included; supports ratio unless a first frame determines it; PAYG-only. |
| `wan2.7-r2v-2026-06-12` | r2v | Snapshot with subject reference, voice customization, and storyboard | Same request shape and duration rules as the base model. |
| `wan2.6-r2v` | r2v | Audio; single- or multi-character role-play | 2–10s; 720P/1080P. |
| `wan2.6-r2v-flash` | r2v | Faster audio or silent multi-character role-play | 2–10s; 720P/1080P; PAYG-only. |
| `wanx2.1-vace-plus` | vace | Multi-image reference, repainting, local editing, extension, and outpainting | Default VACE model/function; ≤5s; 720P; silent; PAYG-only. |
| `wan2.7-videoedit` | videoedit | Prompt-driven local or global video editing | Specialized effect/camera-motion replication; optional negative prompt; up to 4 image references; PAYG-only. |

## Wan 3.0 all-in-one video

| Model | Basic capability | Important limits / compatibility |
|---|---|---|
| `wan3.0-video` | All-in-one text-to-video, first/last-frame generation, multimodal reference generation, video editing, and extension | Accepts image, video, audio, file, and link references; 480P/720P/1080P; adaptive or standard aspect ratios; 2–30s or smart duration; optional audio; PAYG-only. |
| `wan3.0-video-prime` | Faster variant of `wan3.0-video` | Same modes, parameters, and limits; PAYG-only. |

## HappyHorse series

| Model | Mode | Basic capability | Important limits / compatibility |
|---|---|---|---|
| `happyhorse-1.1-t2v` | t2v | Default text-to-video with generated audio | 3–15s; 480P/720P/1080P; resolution + ratio; Token Plan + PAYG. |
| `happyhorse-1.1-i2v` | i2v | Default image-to-video with generated audio | Exactly one first-frame reference; 3–15s; 480P/720P/1080P; Token Plan + PAYG. |
| `happyhorse-1.1-r2v` | r2v | Default reference-based role-play with generated audio | Up to 9 reference images; 3–15s; 480P/720P/1080P; Token Plan + PAYG. |
| `happyhorse-1.0-t2v` | t2v | Text-to-video using resolution + ratio | Same request shape as the 1.1 t2v model. |
| `happyhorse-1.0-i2v` | i2v | Image-to-video with exactly one first frame | No negative prompt, prompt extension, ratio, last frame, first clip, or driving audio. |
| `happyhorse-1.0-r2v` | r2v | Reference-based role-play using resolution + ratio | Up to 9 reference images. |
| `happyhorse-1.0-video-edit` | videoedit | Element replacement while preserving original dynamics | One input video plus up to 5 image references; no VACE function field. |

HappyHorse 1.1 uses the same model-specific payload structure as HappyHorse 1.0; the model ID is the compatibility change.

## Compatibility and billing

- This skill's HTTP flow submits video generation as asynchronous tasks; some SDKs also expose synchronous convenience calls for selected models.
- `happyhorse-1.1-t2v`, `happyhorse-1.1-i2v`, and `happyhorse-1.1-r2v` are the only Token Plan + PAYG video models in this catalog. Every other listed video model is PAYG-only.
- Video output is billed per second; reference and editing models may also bill input-video duration. Exact prices vary by model and resolution.
- The kf2v default is fixed at 5 seconds and silent. VACE is limited to 5 seconds and silent.
