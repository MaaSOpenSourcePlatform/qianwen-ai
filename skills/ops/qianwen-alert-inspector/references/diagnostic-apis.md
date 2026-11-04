# 告警诊断关联接口

本文件用于在取得告警规则和触发历史后，补充同一资源、同一时间窗口的统计与请求证据。
接口返回观测数据；“为什么触发”和“建议如何处理”由证据与规则共同推导。
不要把本文件中的分析步骤描述成平台已有的根因诊断接口。

## 1. 调用与证据边界

统一使用 `qianwen api call`，传递内联 JSON 对象作为 `--params`。
命令参数、Type A/Type B 封装和分层错误解析统一见 [CLI 协议](cli-protocol.md)。
`--params` 不支持 `@file` 或标准输入，不额外创建上传参数的包装脚本。
本文件的 `reqDTO` 是 Type B 的业务对象，必须放进 `Data.reqDTO`。
Type B 成功后从 `DataV2.data.data` 读取业务内容，不能把 `DataV2.ret` 当成诊断结果。

诊断开始时先从前一步结果取得以下信息：

| 信息 | 来源与用途 |
| --- | --- |
| 告警时间 | 触发历史，用于确定观测窗口和可比较的前置窗口 |
| 规则资源 | 规则与历史中的工作空间、模型或资源标识，保持原值 |
| 指标与阈值 | 规则中的指标、单位、聚合方式、比较符和持续时间 |
| 工作空间身份 | 工作空间查询返回的业务 ID 与 `tenantId` |
| 查询完整性 | 时间范围、筛选条件、页数、总数以及是否中断 |

不要凭名称相似就把两条资源记录关联起来，不把业务工作空间 ID 当作 `tenantId`。
缺失指标单位、聚合口径或资源身份时，可以展示可得数据，但不能断言已重现触发条件。
统计、日志与规则存在不一致时，保留差异并说明尚未对齐。

## 2. 解析工作空间

类型：Type B。
产品：`sfm_bailian`；动作：`BroadScopeAspnGateway`。
内部接口：`zeldaEasy.bailian-dash-workspace.space.listWorkspaces4Agent`。

第一页 `reqDTO`：

```json
{
  "pageNo": 1,
  "pageSize": 200
}
```

读取业务内容中的 `data` 或 `items` 数组，总数使用 `totalCount` 或 `total`。
工作空间字段可为 `id`/`workspaceId`、`name`/`workspaceName`/`agentName`，租户字段为 `tenantId`。
字段名兼容仅用于读取，不能据此向其他接口添加同名筛选参数。

按告警资源中的业务工作空间 ID 精确匹配，不按列表位置选取。
如果用户只给名称，只有名称唯一且与告警资源一致时才采用对应记录。
需要继续翻页时增加 `pageNo`；有总数就取到总数，无总数时以不足 200 条结束。
发现重复页、总数改变、空页但尚未达到总数时，标记查询不完整。

模型统计查询的 `Data.cornerstoneParam.switchAgent` 使用匹配记录返回的数值 `tenantId`。
不能往 `reqDTO` 猜加 `workspaceId`、`tenantId`、`model_call_source` 或计费模式字段。
没有唯一匹配时先报告关联不确定，不能静默切换到默认工作空间。

## 3. 工作空间模型统计

类型：Type B。
产品：`sfm_bailian`；动作：`BroadScopeAspnGateway`。
内部接口：`zeldaEasy.bailian-telemetry.platform-model.getModelStatistic`。
使用上一节确认的 `switchAgent`，其余 Type B 字段沿用公共协议。

先构造以下 `reqDTO` 基础对象，再加入必须的时间字段：

```json
{
  "usageMetricFilters": [
    { "aggMethod": "sum" }
  ]
}
```

| 必须加入的字段 | 类型与取值 |
| --- | --- |
| `startTime` | 数值；告警观测窗口起点的 Unix 毫秒时间戳 |
| `endTime` | 数值；同一窗口终点的 Unix 毫秒时间戳 |

时间值由前一步告警时间和规则周期计算，不能用字符串占位符直接提交。
优先查询覆盖触发前后的小窗口；需要较长历史时按不超过 14 天的区间查询。
不同窗口的平均值不能直接相加或取简单平均；跨窗口统计应保留每个窗口的原值与计数。
本合同不添加尚未在执行链路确认的模型或 Key 筛选参数。
本节请求因此是指定工作空间的整体汇总。将它作为背景证据，不能拿整个空间的失败率或平均延迟与某个模型的规则阈值直接比较。单模型证据优先使用下一节中精确匹配的模型行及同模型日志；无法得到同口径的模型平均首 token 耗时时保留未知。

已在只读检查中见到的返回字段：

| 字段 | 能支持的判断 |
| --- | --- |
| `callCount` | 当前范围的调用计数 |
| `callSuccessCount`、`callFailedCount` | 成功与失败计数；先核对规则分母和取消请求口径 |
| `call4xxErrorCount`、`call5xxErrorCount` | 客户端与服务端状态类别的错误计数 |
| `avgCallDuration` | 接口给出的平均耗时；先确认单位，不当作 P95 |
| `avgFirstTokenDuration` | 接口给出的平均首 token 耗时；先确认单位和适用请求类型 |
| `resourceCount` | 接口给出的资源计数；不直接解释为失败资源数 |
| `usages` | 按计量项读取 `key`、`value`、`unit`；额外维度结构未确认前不展开或合并 |

这些字段的最近一次只读样本来自无请求窗口，只确认结构，不能作为故障原因的实证。
`callCount=0` 时错误率是不可计算，不输出 0% 作为服务正常的证明。
失败请求分类与规则口径未对齐时，只陈述计数，不计算会产生误导的错误率。
不同单位和维度的 `usages` 分开比较，不把 token、字符、次数和音视频时长相加。

## 4. 模型维度统计列表

类型：Type B。
产品：`sfm_bailian`；动作：`BroadScopeAspnGateway`。
内部接口：`zeldaEasy.bailian-telemetry.platform-model.listModelStatisticData`。
使用与汇总相同的 `switchAgent`、`startTime`、`endTime`。

`reqDTO` 基础对象如下，提交前加入上一节规定的两个数值时间字段：

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

返回 `list`，总数为 `totalCount` 或兼容字段 `total`。
源码合同中的行字段包括 `model`、`workspaceId`、`apiKey`、`usages`。
计数字段可能包含 `callCount`、`callSuccessCount`、`callFailedCount`，缺失时保持未知。
仅有失败调用的行可能没有 `usages`；不能因为缺少消耗明细就丢弃失败记录。
最近一次只读检查返回空列表，尚未用非空故障样本核验逐行字段。

每页最多取 50 条；`skip` 按实际已返回条数累加，直到达到总数。
不要仅分析首个“调用量最高”页面就断言其他模型或 Key 没有异常。
模型名、工作空间和 Key 标识均来自返回值；按规则中的资源精确匹配。
`apiKey` 字段不能被假定为可公开的名称或安全 ID；仅在内存中关联，输出掩码。
可以比较各模型的调用增量、失败增量和用量变化，区分时间相关性与因果结论。

## 5. 同窗口请求日志

类型：Type B。
产品：`sfm_bailian`；动作：`BroadScopeAspnGateway`。
内部接口：`zeldaEasy.bailian-telemetry.platform-model.listModelLogs`。

`reqDTO` 基础对象如下，再加入必需的 `startTime`、`endTime` 数值毫秒时间戳：

```json
{
  "maxResults": 50,
  "skip": 0
}
```

仅使用已确认的可选筛选：

| 字段 | 类型与来源 |
| --- | --- |
| `modelRequestId` | 字符串；用户或上一调用返回的确切请求 ID |
| `models` | 字符串数组；统计列表或规则已确认的模型 ID |
| `statusCodeTypes` | 数组；只取 `CANCEL`、`SUCCESS`、`CLIENT_ERROR`、`SERVER_ERROR` |

请求 ID 与时间、模型、状态条件按交集筛选，不能声称它会忽略其他条件。
首次需要计算错误率或延迟分布时，不加状态筛选；状态筛选只用于后续定位失败样本。
先确定总调用范围再找异常，不能把筛过错误的日志页当作全量分母。
使用与统计一致的时间窗口，逐行核对 `originLog.workspace_id` 与目标工作空间。
日志现有调用合同没有 workspace 筛选参数，不猜加 `workspaceId`。
缺少行工作空间或无法映射时，不能将这些行合并成该租户的确定统计。

官方日志文档确认只保留近 14 天 PAYG 调用，不包含请求头、请求体或响应体。
窗口超过保留期时说明不可查询；拆窗不能恢复已经过期的数据。
不要据此承诺 Token Plan、其他计费范围或全部历史调用的可观测性。

业务返回可含 `totalCount`、`maxResults`、`list`；最近空样本未返回 `list`。
当总数明确为 0 且没有 `list` 时，报告“该范围无日志”。
当总数大于 0 但 `list` 缺失、空页未达总数或响应结构错误时，报告数据不完整。
不要把缺失列表一律替换成空数组，再输出“没有失败请求”。
按 `skip` 和 `maxResults` 翻页；重复页或数据持续变化时停止并说明完整性限制。

原始日志只读取完成当前诊断需要的字段：

| 字段 | 用法与限制 |
| --- | --- |
| `originLog.request_id` | 关联具体请求；只在需要用户追踪时展示 |
| `originLog.model`、`workspace_id` | 核对模型和工作空间归属 |
| `originLog.start_unix_timestamp`、`start_time` | 优先毫秒时间戳，统一为用户时区展示 |
| `originLog.status_code` | 按 HTTP 类别分类；保留取消与未知情况 |
| `originLog.duration` | 原始耗时，当前 CLI 按毫秒解释；不等同于首 token 耗时 |
| `formattedUsages` | 保留返回的 `key`、`value`、`unit`，不要混合不同单位 |

不展示 `uid`、Key 原值或整份原始响应；不递归展开未经确认的 `extras`。
目前没有确认日志中的稳定业务错误码或上游错误消息字段，不能从 HTTP 状态猜完整错误码。
现有 `usage logs` 标准 DTO 的 `errorCode=null`、`firstOutputDurationMs=0` 是填充值，不是观测结果。
不能用上述填充值证明“没有业务错误”或“首 token 延时为零”。
本地计算分位数时注明算法、样本数量、窗口和完整性；不能冒充平台告警引擎的原始指标。

## 6. 按需查看模型默认限流

类型：Type A；产品：`AliyunDeliveryService`；动作：`ListModelSeries`。
`params` 基础对象为 `{"Language":"zh-CN","MatchOnly":true}`。
再加入 `Query`，其值必须是前一步确认的完整模型 ID，并从返回列表精确匹配。
读取匹配模型的 `QpmInfo.ModelDefault`，保留 `CountLimit`、`CountLimitPeriod`、`UsageLimit`、`UsageLimitPeriod`。
源码按 `CountLimit / CountLimitPeriod × 60` 计算默认 RPM，TPM 同理使用 Usage 字段。
这是目录默认限流，不证明当前账号或 Key 没有单独配额，也不证明某次请求确因限流失败。
缺少默认值不表示没有限流；不能把空值或输出层的 0 当作无限额。

## 7. 按完整错误码检索官方处理办法

已有完整业务错误码时，用该码检索；没有时可先以模型、HTTP 状态和症状查一般排障资料，但不能据搜索结果替用户认定具体错误码。
只发送错误码、必要的模型/接口名称，去除提示词、账号、请求内容和内部地址。
以下是使用公开错误码的完整调用示例，不表示当前告警就是该错误：

```bash
qianwen api call --product aliyun-search-maas --action SearchAll --params '{"CommonParams":{"Loc":"2024SPAllResult","From":"pc","CookieId":""},"QuerySceneParams":{"QueryWord":"Throttling.RateQuota","Limit":5,"PageNo":1,"Language":"zh","BizType":"doc"}}' --format json
```

这是 Type A；成功样本包含 `Success="true"`、`ErrorCode="OK"`、`TotalCount` 和 `Info`。明确的失败标记或非 `OK` 的 `ErrorCode` 应报告查询失败，不能把缺失的 `Info` 当作没有匹配文档。
按 [CLI 协议](cli-protocol.md) 判断成功，再从实际返回项取文档标题、摘要和 URL。
只将官方相关文档作为依据，阅读对应段落并核对模型、API、计费范围和错误码是否一致。
需要浏览或操作网页时遵循主 skill 的浏览器约定，不仅凭搜索摘要断言解决办法。
官方通用错误参考：[错误信息](https://platform.qianwenai.com/docs/api-reference/preparation/error-messages)。
文档描述的可能原因与当前观测事实分开陈述；搜索无结果不证明该错误不存在。

## 8. 输出判断与范围

先说明规则实际比较的指标与阈值，再列同资源、同窗口的证据，最后给适用的处理建议。
使用“已确认”“与……一致”“尚不能确认”等准确表述，不把同时发生当成因果证明。
汇总、模型列表和日志来自不同查询，取消、时间边界、保留期及更新延迟可能影响口径。
发现不一致时报告各自范围，不强行补齐缺失字段或让总数相等。
本文件不使用未经核验的分钟级时序指标，也不扩展复杂账单或资金查询。
只有故障证据指向余额、额度或订阅时，再按需调用已有相关 skill 补充查询。
余额和额度通常是当前快照，不能用当前状态倒推告警发生时的状态。
本 skill 给出建议；调整阈值、关闭规则、修改预算或发起充值不属于本文件的只读诊断。
