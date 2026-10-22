# 任务领域

分页查询进行中的任务信息，仅返回当前用户有权限且发布状态为进行中的任务。

## 工具列表

### ata::task-page-query

查询任务信息，查询进行中的任务。支持按任务类型、用户完成状态筛选，可通过选择器返回完成进度与奖励内容。

- 调用详细说明（调用前必读）：`references/domains/task/task-page-query.json`

## 典型使用流程

### 查询进行中的任务

1. 调 `task-page-query`，可按 `type`（DAILY/GROWTH/ACTIVITY）筛选任务类型
2. 通过 selector 的 `completedRatio` 可获取当前用户的完成进度与状态
3. 通过 selector 的 `withBlobs` 可获取奖励内容等大字段
