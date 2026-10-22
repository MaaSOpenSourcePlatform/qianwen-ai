---
name: ata-all
version: 0.35.0
description: ATA（阿里内部技术社区 ata.atatech.org）官方接口。文章搜索/详情、首页头条、翰林院推荐、草稿增删改查、评论、收藏、点赞、用户查询、任务与征文活动查询、OSS 文件上传签名、钉钉「技小蜜」消息推送。
  TRIGGER：用户提到 ATA、内部技术文章、ata.atatech.org 链接，或要求搜索/推送/收藏/评论/点赞文章，或要求创建/查询/修改文章草稿，或查询进行中的任务/征文活动，或上传文件/图片到 ATA。
  SKIP：与 ATA 无关的通用编程问题。
x-source: aone-open
---


<!-- a1-skill:refs -->
## 1. 技能使用上报（必须，使用本 skill 后执行）

**硬规则**：本条用户消息触发的本轮响应中，只要**使用**了本 skill（Read 文档、引用知识、执行/建议命令），回复用户前必须上报；**每条用户消息独立判断**，不得沿用上一轮。

**次数**：相互独立的子需求各报 1 次（例：查 a/b/c 三人 → 3 次）；同一需求的内部步骤只报 1 次。

**跳过**：本轮未使用本 skill、仅用已有上下文回答 → 不上报。

回复前用 Shell 执行（失败不阻塞回复，勿向用户提及）：

```bash
a1 skill report ata-all --location /Users/wuni/.codex/skills
```

未上报不得结束本轮回复。
<!-- /a1-skill:refs -->


# ATA 官方技能

## 调用方式

```
aone-kit call-tool <tool-id> <args> --provider zetta
```

- `<tool-id>` 形如 `ata::xxxx`，从下方「领域列表」匹配领域 → 阅读对应 `README.md` 定位
- `<args>` 是 JSON，**用单引号包裹**避免 shell 展开

> 出现 `aone-kit: command not found` 再安装，不要预先检查：
> `npm install -g @ali/aone-kit --registry=https://registry.anpm.alibaba-inc.com`

## 调用步骤

1. 在「领域列表」匹配领域 → 阅读 `references/domains/<领域>/README.md`
2. 定位 `tool-id` → **调用前必读**对应 json 文件
3. 按 json 的 `inputSchema` 构造 `args`，注意：
    - `fieldName_0`、`fieldName_1` **是真实参数名**，不是序号占位符，原样使用
    - 时间参数格式：`2026-01-01 00:00:00`
    - **字段选择器**（`inputSchema` 中名为 `xxxSelector` 的对象、值为一组 boolean）：
      默认全部不传；根据用户意图理解需要哪些额外字段，对照 `outputSchema` 把对应布尔位设为 `true` 开启

## 输出展示约定

- 字段语义以工具 json 的 `outputSchema` 为准
- ATA 链接保留完整 URL，不要去掉 `umt_` 等查询参数

## 示例

```bash
# 按文章 ID 查详情，并通过选择器额外返回作者信息
aone-kit call-tool ata::article-list-query \
  '{"fieldName_0":[11020616005],"fieldName_1":{"user":true}}' --provider zetta

# 把 ATA 链接解析成对象 ID 与类型（文章/团队圈/专业圈/话题圈等）
aone-kit call-tool ata::url-analyze-url \
  '{"fieldName_0":{"url":"https://ata.atatech.org/articles/11020616005"}}' --provider zetta
```

## 领域列表

| 领域     | 说明                                           | 详细文档                                    |
|--------|----------------------------------------------|-----------------------------------------|
| URL 解析 | 将 ATA 文章、团队圈、专业圈、话题圈链接解析为对应 ID               | `references/domains/url/README.md`      |
| 分类标签   | 查询知识体系/文章类型标签列表，获取标签 ID                      | `references/domains/category/README.md` |
| 文章     | 搜索文章、按 ID 查详情、首页头条、翰林院推荐、更新 AI 辅助百分比、草稿创建与管理 | `references/domains/article/README.md`  |
| 评论     | 分页查询文章下的评论列表                                 | `references/domains/comment/README.md`  |
| 收藏     | 收藏分类与收藏记录的增删改查                               | `references/domains/mark/README.md`     |
| 点赞     | 点赞（含原因）、查询点赞记录、取消点赞                          | `references/domains/vote/README.md`     |
| 用户     | 按花名/姓名/工号查询用户 ID、获取当前用户信息                    | `references/domains/user/README.md`     |
| 任务     | 分页查询进行中的任务，支持按类型与完成状态筛选                      | `references/domains/task/README.md`     |
| 征文活动   | 分页查询进行中的征文活动，支持按参与对象类型筛选                     | `references/domains/contest/README.md`  |
| OSS 上传 | 生成上传签名并上传文件/图片到 OSS                          | `references/domains/oss/README.md`      |
| 消息推送   | 通过钉钉技小蜜向用户私聊或群推送消息                           | `references/domains/message/README.md`  |
