#!/usr/bin/env python3
"""
OSS POST 上传脚本
使用服务端生成的签名上传文件到阿里云 OSS

用法:
    python3 oss_upload.py --accessId <id> --signature <sig> --policy <policy> \
        --host <host> --key <key> --file <file> --url <url> [--objectAcl <acl>]

示例:
    python3 oss_upload.py \
        --accessId 这里填写accessId \
        --signature "这里填写signature" \
        --policy "这里填写policy" \
        --host "https://ata-super-daily.oss-cn-zhangjiakou.aliyuncs.com" \
        --key "open/2026/05/0a163467-e603-4e01-978b-4436217fb8cc.jpg" \
        --file "/Users/zhuangjiaju/Downloads/e709ca9f5f132745cc5c195eac06b67c.jpg" \
        --url "https://oss-ata-test.alibaba.com/open/2026/05/0a163467-e603-4e01-978b-4436217fb8cc.jpg" \
        --objectAcl public-read
"""

import argparse
import mimetypes
import os
import sys

import requests


def upload_to_oss(access_id, signature, policy, host, key, file_path, url, acl="public-read"):
    """
    使用服务端签名上传文件到 OSS

    参数:
        access_id:  OSS AccessKey ID
        signature:  服务端生成的签名
        policy:     Base64 编码的权限策略
        host:       OSS 上传域名
        key:        文件在 OSS 上的路径
        file_path:  待上传的本地文件路径
        url:        签名接口返回的文件链接
        acl:        文件 ACL（默认 public-read）
    """
    if not os.path.exists(file_path):
        print(f"错误: 文件不存在: {file_path}", file=sys.stderr)
        return False

    file_name = os.path.basename(file_path)
    file_size = os.path.getsize(file_path)
    print(f"准备上传: {file_name} ({file_size} bytes)")

    # 推断文件 Content-Type
    mime_type, _ = mimetypes.guess_type(file_path)
    content_type = mime_type or "application/octet-stream"
    print(f"Content-Type: {content_type}")

    # 构建表单数据
    form_data = {
        "OSSAccessKeyId": access_id,
        "policy": policy,
        "signature": signature,
        "key": key,
        "success_action_status": "200",
    }

    # HTTP Headers
    headers = {
        "x-oss-object-acl": acl,
    }

    # 上传文件
    with open(file_path, "rb") as f:
        files = {
            "file": (file_name, f, content_type),
        }

        print(f"正在上传到: {host}")
        response = requests.post(
            host,
            data=form_data,
            files=files,
            headers=headers,
        )

    print(f"HTTP 状态码: {response.status_code}")
    if response.text:
        print(f"响应内容: {response.text[:500]}")

    if response.status_code == 200:
        print("\n上传成功!")
        print(f"文件 URL: {url}")
        return True
    else:
        print("\n上传失败!", file=sys.stderr)
        return False


def main():
    parser = argparse.ArgumentParser(
        description="使用服务端签名上传文件到阿里云 OSS",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python3 oss_upload.py \\
    --accessId 这里填写accessId \\
    --signature "这里填写signature" \\
    --policy "这里填写policy" \\
    --host "https://ata-super-daily.oss-cn-zhangjiakou.aliyuncs.com" \\
    --key "open/2026/05/xxx.jpg" \\
    --file "/path/to/file.jpg" \\
    --url "https://oss-ata-test.alibaba.com/open/2026/05/xxx.jpg"
        """,
    )

    parser.add_argument("--accessId", required=True, help="OSS AccessKey ID")
    parser.add_argument("--signature", required=True, help="服务端生成的签名")
    parser.add_argument("--policy", required=True, help="Base64 编码的权限策略")
    parser.add_argument("--host", required=True, help="OSS 上传域名，如 https://bucket.oss-cn-region.aliyuncs.com")
    parser.add_argument("--key", required=True, help="文件在 OSS 上的路径")
    parser.add_argument("--file", required=True, help="待上传的本地文件路径")
    parser.add_argument("--url", required=True, help="签名接口返回的文件链接")
    parser.add_argument("--objectAcl", default="public-read", help="文件 ACL（默认: public-read）")

    args = parser.parse_args()

    success = upload_to_oss(
        access_id=args.accessId,
        signature=args.signature,
        policy=args.policy,
        host=args.host,
        key=args.key,
        file_path=args.file,
        url=args.url,
        acl=args.objectAcl,
    )

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
