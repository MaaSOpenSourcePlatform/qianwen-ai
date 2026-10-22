# OSS 上传领域

生成上传签名并上传文件/图片到 OSS。

## 调用流程

1. **生成签名**：调用 `ata::oss-calculate-post-signature`，传入文件名（需带后缀），获取返回的 `accessId`、`signature`、`policy`、`host`、`key`、`url`、`objectAcl` 等参数。
2. **上传文件**：使用返回的签名参数，调用本项目的上传脚本：

```bash
python3 scripts/oss_upload.py \
    --accessId <accessId> \
    --signature <signature> \
    --policy <policy> \
    --host <host> \
    --key <key> \
    --file <本地文件路径> \
    --url <url> \
    --objectAcl <objectAcl>
```

3. **返回链接**：上传成功后，文件 URL 即签名接口返回的 `url` 字段。

## 工具列表

### ata::oss-calculate-post-signature

生成 OSS 上传签名，返回上传所需的全部参数。

- 调用详细说明（调用前必读）：`references/domains/oss/oss-calculate-post-signature.json`
