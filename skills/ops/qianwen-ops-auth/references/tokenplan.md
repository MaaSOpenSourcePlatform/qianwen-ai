# Token Plan vs Standard API Key

> Sources:
> - https://platform.qianwenai.com/docs/token-plan/personal/token-plan-personal-overview.md
> - https://platform.qianwenai.com/docs/token-plan/team/token-plan-team-overview.md
> - https://platform.qianwenai.com/docs/token-plan/best-practices/multimodal-generation.md
> - https://platform.qianwenai.com/home/billing/subscription/token-plan
> - [CDN Token Plan model catalog](https://alioth.alicdn.com/skills-info/models/references/qianwen-token-plan-models.md) — Personal and Team model lists, modality constraints, and exclusions. If CDN access fails, use the [local fallback](../cdn/references/qianwen-token-plan-models.md).
> Updated: 2026-08-14

> [!CAUTION]
> Token Plan keys may be used only by interactive AI tools and the Skill/Agent extensions they
> invoke for the current user. Application backends, unattended batch jobs, load tests, API testing
> automation, and non-interactive workflow platforms remain prohibited.

## Two Key Types

QianWen exposes two mutually exclusive authentication systems. Mixing them produces hard-to-diagnose errors.

| Dimension | Standard Key (Pay-as-you-go) | Token Plan |
|-----------|------------------------------|------------|
| Key format | `sk-ws-xxxxx` (legacy `sk-xxxxx`) | `sk-sp-xxxxx` |
| Auth header | `Authorization: Bearer <key>` | `Authorization: Bearer <key>` (NOT `x-api-key`) |
| Supported text models | Full catalog | Catalog-defined |
| Supported image models | Full catalog | Catalog-defined |
| Supported video models | Full catalog | Catalog-defined |
| Supported TTS models | Full catalog | Catalog-defined |
| ASR | Available | Catalog-defined; check availability and Skill support |
| Embedding / Rerank / Translation | Available | Catalog-defined |
| Usage scope | API calls from scripts, apps, and tools | Interactive AI tools and their Skill/Agent extensions |
| Billing | Per-token consumption (CNY) | **Credits**: monthly seat allowance + shared usage packages |
| Quota exhaustion | Continues (pay more or use prepaid balance) | **Hard fail — service paused** until next cycle or shared package purchased |

**Detecting key type (non-plaintext)**:

```bash
echo ${DASHSCOPE_API_KEY:0:6}
```

- Output starts with `sk-sp-` → Token Plan key (this file applies).
- Output starts with `sk-ws-` or other `sk-` prefix → Standard PAYG key (full catalog).

## Forbidden Uses (Strictly Enforced)

The following uses of an `sk-sp-` Token Plan key are **strictly prohibited** by the platform.
Server-side detection of a violation may result in:

- **Immediate subscription suspension**;
- **API Key revocation**;
- In repeated cases, **account-level review and termination**.

Prohibited scenarios include, but are not limited to:

- Application backends, micro-services, serverless functions, workers, cron jobs.
- Unattended batch jobs, bulk data-processing pipelines, offline evaluations, and load tests.
- API testing automation (Postman, Insomnia, standalone `curl`, and similar clients).
- Workflow / orchestration platforms (Dify, n8n, Coze, LangChain servers, etc.).
- Any integration where the caller is not an **interactive AI tool** operating on behalf of a human.

Token Plan keys are intended exclusively for interactive AI coding / chat tools (Cursor, Claude
Code, Qwen Code, OpenClaw, OpenCode, Codex, Kilo Code/CLI, Hermes Agent) and the Skill/Agent
extensions they invoke for the current user. Any other usage constitutes a **policy violation**.

Before each Token Plan request, select the exact modality and mode, then fetch and read the current
CDN Token Plan model catalog linked above.
Choose and explicitly pass an exact listed model. Do not probe models, change modes, or automatically
fall back to PAYG.

## Supported Models

Fetch and read the CDN Token Plan model catalog linked above for Personal and Team model lists, modality constraints, and exclusions.

## Credits Billing Mechanism

- **Unit**: Credits. Single-call cost depends on model, token usage, thinking mode, and tool calls.
- **Tiers & pricing**: See [Token Plan overview](https://platform.qianwenai.com/docs/token-plan/overview).
- **Deduction order**: seat monthly quota → shared package (nearest-expiry first) → service paused.
- **Reset**: seat quotas reset monthly; unused credits do not roll over.

Example (qwen3.6-plus single request): 8,349 input + 40,794 cached + 573 output ≈ 3.18 Credits.

## Impact on QianWen-AI/qianwen-ai Scripts

The bundled Text, Vision, Image, Video, and TTS Skills accept `sk-sp-` when an interactive AI tool
invokes them for the current user. Their shared library routes requests to the Token Plan endpoint;
the Agent is responsible for selecting and explicitly passing a documented model.

| Skill                       | Works with `sk-sp-` Token Plan key? | Notes                                                       |
|-----------------------------|:-----------------------------------:|-------------------------------------------------------------|
| qianwen-text                |                  Yes                | Uses a documented Token Plan text model                     |
| qianwen-vision              |                  Yes                | Requires a listed model that supports the vision task       |
| qianwen-image-generation    |                  Yes                | Uses a documented Token Plan image model                    |
| qianwen-video-generation    |                  Yes                | Uses a documented Token Plan video model                    |
| qianwen-audio-tts           |                  Yes                | Read the CDN model catalog linked above for current default compatibility; CosyVoice (`tts_cosyvoice.py`) remains PAYG-only |

PAYG defaults remain unchanged. Token Plan calls must not silently use those defaults or fall back
to PAYG.

## Common Errors (Key-level Diagnosis)

| Error                                            | Cause                                                                              | Resolution                                                                    |
|--------------------------------------------------|------------------------------------------------------------------------------------|-------------------------------------------------------------------------------|
| `InvalidApiKey: No API-key provided`             | Key not configured, or tool used `x-api-key` header                                | Set key; switch to `Authorization: Bearer`                                    |
| `InvalidApiKey: Invalid API-key provided`        | Standard `sk-` key mismatched, subscription expired, key copied with whitespace    | Verify subscription status; reset key in console                              |
| `model 'xxx' not found or not supported`         | Model name typo / wrong case; model not in Token Plan catalog                      | Match the model ID exactly; review the CDN catalog linked above               |
| `Range of input length should be [1, xxx]`       | Input + history exceeds context window                                             | Start a new session, compact context, or switch to a larger-context model     |
| `API rate limit reached`                         | Seat / shared-package Credits exhausted, or shared quota rate-limited              | Check Token Plan console for usage                                            |

## Cost / Policy Risk Scenarios

1. **`sk-sp-` key used by an interactive tool's Skill**: Routes to Token Plan and bills against Credits.
2. **PAYG key when the user expects Token Plan coverage**: Calls succeed but incur pay-as-you-go charges.
3. **Token Plan model or edition mismatch**: Report the error and re-check documentation; do not probe candidates.
4. **Token Plan Credits exhausted**: Hard fail on the Token Plan service side; never automatically fall back to PAYG.

## Console & Billing

| Resource                  | URL                                                                 |
|---------------------------|---------------------------------------------------------------------|
| Token Plan Subscription   | https://platform.qianwenai.com/home/billing/subscription/token-plan |
| Token Plan Pricing        | https://platform.qianwenai.com/docs/token-plan/overview#%E5%A5%97%E9%A4%90%E4%B8%8E%E5%AE%9A%E4%BB%B7                   |
| Pay-as-you-go Billing     | https://platform.qianwenai.com/home/billing/pay-as-you-go           |
| Usage Analytics (PAYG)    | https://platform.qianwenai.com/home/analytics                       |

> [!NOTE]
> **Usage queries**: Token Plan seat & shared-package Credits balance are currently only viewable in
> the [Token Plan console](https://platform.qianwenai.com/home/billing/subscription/token-plan)
> (Subscription page → Token Plan tab). The `qianwen` CLI does not yet support `sk-sp-` Token Plan
> keys; CLI commands (`qianwen usage summary`, etc.) only work for standard `sk-` keys.

## Coexistence

Both key types can be held simultaneously by the same user:
- `sk-sp-` Token Plan key -> interactive AI tools and their Skill/Agent extensions.
- `sk-ws-` PAYG key (legacy `sk-`) -> regular API calls from scripts, apps, and tools.

These are independent. The bundled Skills choose the endpoint from the configured key and never
automatically fall back from one billing mode to the other.
