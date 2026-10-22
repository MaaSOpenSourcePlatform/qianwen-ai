# URL 解析领域

将 ATA 文章、团队圈、专业圈、话题圈链接解析为 `objectId` + `objectType`，供下游接口使用。

## 工具列表

### ata::url-analyze-url

- 调用详细说明（调用前必读）：`references/domains/url/url-analyze-url.json`

| objectType | 含义 | 下游用法 |
|------------|------|---------|
| `ARTICLE` | 文章 id | `article-list-query` |
| `S_TEAM_INFO` | 团队圈 teamId | `article-comprehensive-page-query` 的 `teamId` |
| `ATA_GROUP` | 专业圈 groupId | `article-comprehensive-page-query` 的 `groupId` |
| `CHANNEL` | 话题圈 channelId | `article-comprehensive-page-query` 的 `channelId` |

## 典型使用流程

1. 用户提供 ATA 链接
2. 调 `url-analyze-url` 得 `objectType` 与 `objectId`
3. 按 `objectType` 将 `objectId` 传入对应下游接口（`objectId` 不等于文章 id，除非 `objectType=ARTICLE`）
