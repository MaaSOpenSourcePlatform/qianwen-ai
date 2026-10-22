# 征文活动领域

分页查询进行中的征文活动，仅返回时间状态为进行中且已发布的征文活动。

## 工具列表

### ata::contest-page-query

征文活动查询，查询进行中的征文。支持按参与对象类型（文章/专题）筛选。

- 调用详细说明（调用前必读）：`references/domains/contest/contest-page-query.json`

## 典型使用流程

### 查询进行中的征文活动

1. 调 `contest-page-query`，可按 `objectType`（ARTICLE/SPECIAL）筛选参与对象类型
2. 通过 selector 的 `withBlobs` 可获取参与方式 `objectTypeList` 等大字段
