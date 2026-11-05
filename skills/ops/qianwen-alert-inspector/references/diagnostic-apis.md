# APIs for Correlating Alert Evidence

Use this reference after retrieving alert rules and trigger history to collect statistics and request evidence for the same resource and time window.
The APIs return observations; explanations of why an alert fired and what to do next must be derived from those observations and the rule.
Do not describe the analysis steps in this reference as an existing platform root-cause diagnosis API.

## 1. Invocation and Evidence Boundaries

Use `qianwen api call`, passing an inline JSON object through `--params`.
See the [CLI protocol](cli-protocol.md) for command arguments, Type A/Type B envelopes, and error handling at each response layer.
`--params` does not support `@file` or standard input. Do not create an additional wrapper script to upload parameters.
In this reference, `reqDTO` is the Type B business request object and must be placed in `Data.reqDTO`.
After confirming Type B success, read business data from `DataV2.data.data`; `DataV2.ret` is not a diagnostic result.

Before starting the diagnosis, obtain the following from the preceding results:

| Information | Source and purpose |
| --- | --- |
| Alert time | Trigger history; establishes the observation window and a comparable preceding window |
| Rule resource | Workspace, model, or resource identifiers from the rule and history; preserve their values |
| Metric and threshold | The rule's metric, unit, aggregation method, comparison operator, and duration |
| Workspace identity | The business workspace ID and `tenantId` returned by the workspace query |
| Query completeness | Time range, filters, pages retrieved, total count, and any interruption |

Do not correlate resource records merely because their names are similar, or use a business workspace ID as `tenantId`.
When the metric unit, aggregation semantics, or resource identity is missing, present available data without claiming to have reproduced the trigger condition.
Preserve discrepancies between statistics, logs, and rules, and explain that their scopes or definitions have not yet been aligned.

## 2. Resolve the Workspace

Type: Type B.
Product: `sfm_bailian`; action: `BroadScopeAspnGateway`.
Internal API: `zeldaEasy.bailian-dash-workspace.space.listWorkspaces4Agent`.

First-page `reqDTO`:

```json
{
  "pageNo": 1,
  "pageSize": 200
}
```

Read the `data` or `items` array in the business payload, using `totalCount` or `total` for the total.
Workspace fields may be `id`/`workspaceId` and `name`/`workspaceName`/`agentName`; the tenant field is `tenantId`.
These field aliases apply only when reading responses. They do not establish filter parameters for other APIs.

Match the business workspace ID from the alert resource exactly; do not select by list position.
If the user provides only a name, use a matching record only when the name is unique and consistent with the alert resource.
Increment `pageNo` to continue. When a total is available, retrieve that many records; otherwise, stop when a page contains fewer than 200 records.
Mark the query incomplete if pages repeat, the total changes, or an empty page appears before the reported total is reached.

For model statistics, set `Data.cornerstoneParam.switchAgent` to the numeric `tenantId` returned by the matching record.
Do not invent `workspaceId`, `tenantId`, `model_call_source`, or billing-mode fields in `reqDTO`.
If no unique match exists, report the uncertain association instead of silently switching to the default workspace.

## 3. Workspace Model Statistics

Type: Type B.
Product: `sfm_bailian`; action: `BroadScopeAspnGateway`.
Internal API: `zeldaEasy.bailian-telemetry.platform-model.getModelStatistic`.
Use the `switchAgent` verified in the preceding section; follow the shared protocol for the remaining Type B fields.

Start with this `reqDTO` object, then add the required time fields:

```json
{
  "usageMetricFilters": [
    { "aggMethod": "sum" }
  ]
}
```

| Required additional field | Type and value |
| --- | --- |
| `startTime` | Number; Unix timestamp in milliseconds for the start of the alert observation window |
| `endTime` | Number; Unix timestamp in milliseconds for the end of the same window |

Calculate these values from the alert time and rule period established earlier. Never submit string placeholders.
Prefer a short window covering the time before and after the trigger. Split longer history into intervals of no more than 14 days.
Do not sum averages from different windows or take their simple average; preserve each window's original values and counts.
This contract does not add model or key filters that have not been verified in the execution path.
The request in this section therefore returns an aggregate for the selected workspace. Use it as background evidence; do not compare a workspace-wide failure rate or average latency directly with a single model's rule threshold. For model-specific evidence, prefer the exact matching model row in the next section and logs for that model. Keep average first-token latency unknown when no model-specific value with matching semantics is available.

Response fields observed during a read-only check:

| Field | Supported interpretation |
| --- | --- |
| `callCount` | Call count within the queried scope |
| `callSuccessCount`, `callFailedCount` | Success and failure counts; first verify the rule's denominator and treatment of cancelled requests |
| `call4xxErrorCount`, `call5xxErrorCount` | Error counts for client-error and server-error HTTP status classes |
| `avgCallDuration` | API-reported average duration; verify the unit and do not treat it as P95 |
| `avgFirstTokenDuration` | API-reported average first-token duration; verify the unit and applicable request types |
| `resourceCount` | API-reported resource count; do not interpret it as a count of failed resources |
| `usages` | Read `key`, `value`, and `unit` for each measure; do not expand or merge additional dimensions until their structure is verified |

The latest read-only sample for these fields covered a window with no requests. It confirms the structure, not the cause of a failure.
When `callCount=0`, the error rate cannot be calculated. Do not report 0% as proof of a healthy service.
If failure classifications and rule semantics have not been aligned, report counts without calculating a misleading error rate.
Compare `usages` with different units and dimensions separately; do not add tokens, characters, counts, and audio/video durations together.

## 4. Statistics by Model

Type: Type B.
Product: `sfm_bailian`; action: `BroadScopeAspnGateway`.
Internal API: `zeldaEasy.bailian-telemetry.platform-model.listModelStatisticData`.
Use the same `switchAgent`, `startTime`, and `endTime` as the aggregate query.

Start with this `reqDTO` object and add the two numeric time fields specified in the preceding section before submitting:

```json
{
  "usageMetricFilters": [
    { "aggMethod": "sum" }
  ],
  "skip": 0,
  "maxResults": 50,
  "sortField": "callCount",
  "sortOrder": "DESC"
}
```

The response contains `list`, with the total in `totalCount` or the compatible field `total`.
The source-code contract includes row fields `model`, `workspaceId`, `apiKey`, and `usages`.
Count fields may include `callCount`, `callSuccessCount`, and `callFailedCount`; keep missing values unknown.
Rows containing only failed calls may omit `usages`. Do not discard failure records because consumption details are absent.
The latest read-only check returned an empty list; individual row fields have not been verified against a nonempty failure sample.

Retrieve at most 50 records per page. Increase `skip` by the number of records actually returned until the total is reached.
Do not analyze only the first page of highest-call-volume records and conclude that other models or keys have no anomalies.
Use model names, workspaces, and key identifiers from returned values, matching the resource in the rule exactly.
Do not assume `apiKey` contains a public name or a safe identifier. Correlate it only in memory and mask it in output.
You may compare changes in calls, failures, and usage by model, while distinguishing temporal correlation from a causal conclusion.

## 5. Request Logs for the Same Window

Type: Type B.
Product: `sfm_bailian`; action: `BroadScopeAspnGateway`.
Internal API: `zeldaEasy.bailian-telemetry.platform-model.listModelLogs`.

Start with this `reqDTO` object, then add the required numeric millisecond timestamps `startTime` and `endTime`:

```json
{
  "maxResults": 50,
  "skip": 0
}
```

Use only the verified optional filters:

| Field | Type and source |
| --- | --- |
| `modelRequestId` | String; the exact request ID supplied by the user or returned by a preceding call |
| `models` | String array; model IDs confirmed by the statistics list or rule |
| `statusCodeTypes` | Array containing only `CANCEL`, `SUCCESS`, `CLIENT_ERROR`, or `SERVER_ERROR` |

Request ID, time, model, and status filters are intersected. Do not claim that a request ID bypasses the other filters.
For an initial error-rate or latency-distribution calculation, omit status filters; use them only afterward to locate failure samples.
Establish the complete call population before examining anomalies. An error-filtered log page is not the denominator for all calls.
Use the same time window as the statistics query and check each row's `originLog.workspace_id` against the target workspace.
The existing log request contract has no workspace filter. Do not invent a `workspaceId` parameter.
If a row lacks a workspace or cannot be mapped, do not include it in statistics claimed to belong definitively to that tenant.

Official log documentation confirms retention of only the most recent 14 days of PAYG calls, excluding request headers, request bodies, and response bodies.
Explain when a window falls outside retention; splitting windows cannot recover expired records.
Do not promise observability for Token Plan, other billing scopes, or all historical calls on this basis.

The business response may contain `totalCount`, `maxResults`, and `list`; the latest empty sample omitted `list`.
When the total is explicitly 0 and `list` is absent, report "No logs in this scope."
When the total is positive but `list` is missing, an empty page precedes the total, or the response structure is invalid, report incomplete data.
Do not universally replace missing lists with empty arrays and then report "No failed requests."
Paginate using `skip` and `maxResults`. Stop if pages repeat or data continues changing, and explain the completeness limitation.

Read only the raw log fields needed for the current diagnosis:

| Field | Use and limitation |
| --- | --- |
| `originLog.request_id` | Correlate a specific request; display only when the user needs it for follow-up |
| `originLog.model`, `workspace_id` | Verify model and workspace ownership |
| `originLog.start_unix_timestamp`, `start_time` | Prefer the millisecond timestamp and display times consistently in the user's time zone |
| `originLog.status_code` | Classify by HTTP category, retaining cancelled and unknown cases |
| `originLog.duration` | Raw duration, interpreted as milliseconds by the current CLI; not first-token duration |
| `formattedUsages` | Preserve the returned `key`, `value`, and `unit`; do not mix units |

Do not display `uid`, raw keys, or the entire raw response. Do not recursively expand unverified `extras`.
No stable business error-code or upstream error-message field has been confirmed in these logs. Do not infer a full error code from an HTTP status.
The existing `usage logs` standard DTO uses `errorCode=null` and `firstOutputDurationMs=0` as placeholders, not observations.
Those placeholders do not prove "No business error" or "Zero first-token latency."
When calculating percentiles locally, state the algorithm, sample size, window, and completeness; do not present them as metrics returned by the platform's alert engine.

## 6. Inspect Default Model Rate Limits When Relevant

Type: Type A; product: `AliyunDeliveryService`; action: `ListModelSeries`.
Start with `params` set to `{"Language":"zh-CN","MatchOnly":true}`.
Add `Query` using the full model ID confirmed earlier, then match that ID exactly in the returned list.
Read the matched model's `QpmInfo.ModelDefault`, preserving `CountLimit`, `CountLimitPeriod`, `UsageLimit`, and `UsageLimitPeriod`.
The source computes default RPM as `CountLimit / CountLimitPeriod × 60`, and TPM equivalently from the Usage fields.
These are catalog defaults. They do not establish whether the current account or key has a separate quota, or prove that rate limiting caused a particular request to fail.
Missing defaults do not mean no rate limit; do not interpret null values or an output-layer 0 as unlimited.

## 7. Find Official Guidance by Full Error Code

When a full business error code is available, search for that code. Otherwise, search general troubleshooting guidance by model, HTTP status, and symptom, without assigning a specific error code based on search results.
Send only the error code and necessary model/API names; remove prompts, account details, request content, and internal addresses.
This complete example uses a public error code and does not imply that it caused the current alert:

```bash
qianwen api call --product aliyun-search-maas --action SearchAll --params '{"CommonParams":{"Loc":"2024SPAllResult","From":"pc","CookieId":""},"QuerySceneParams":{"QueryWord":"Throttling.RateQuota","Limit":5,"PageNo":1,"Language":"zh","BizType":"doc"}}' --format json
```

This is Type A. A successful sample contains `Success="true"`, `ErrorCode="OK"`, `TotalCount`, and `Info`. Report an explicit failure marker or a non-`OK` `ErrorCode` as a failed query; do not interpret missing `Info` as no matching documents.
Confirm success using the [CLI protocol](cli-protocol.md), then extract document titles, summaries, and URLs from actual result items.
Use relevant official documents as evidence. Read the applicable section and verify that its model, API, billing scope, and error code match.
When browsing or interacting with a webpage, follow the main skill's browser rules. Do not assert a remedy based only on a search snippet.
Official general error reference: [Error messages](https://platform.qianwenai.com/docs/api-reference/preparation/error-messages).
Distinguish possible causes described in documentation from observed facts. An empty search result does not prove that an error does not exist.

## 8. Conclusions and Scope

First state the metric and threshold the rule actually compares, then present evidence for the same resource and window, followed by applicable recommendations.
Use precise wording such as "confirmed," "consistent with," and "not yet confirmed." Concurrent events do not establish causation.
Aggregates, model lists, and logs come from separate queries; cancellations, time boundaries, retention, and update delays may affect their definitions and scope.
Report each source's scope when they disagree. Do not fill missing fields or force totals to match.
This reference does not use unverified minute-level time-series metrics or extend into complex billing or financial queries.
Only when failure evidence points to balance, quota, or subscription issues should an existing relevant skill perform a supplemental query.
Balances and quotas are usually current snapshots; do not use current state to infer state at the time of a historical alert.
This skill provides recommendations. Changing thresholds, disabling rules, modifying budgets, and initiating recharges are outside this reference's read-only diagnosis.
