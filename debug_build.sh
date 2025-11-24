#!/bin/bash

echo "=== 1. 测试 Docker Hub 连接 (hello-world) ==="
if sudo docker pull hello-world; then
    echo "✅ Docker Hub 连接正常"
else
    echo "❌ Docker Hub 连接失败，请检查 /etc/docker/daemon.json"
    exit 1
fi

echo -e "\n=== 2. 单独构建后端 (Backend) ==="
echo "正在尝试构建后端镜像..."
if sudo docker build -t debug_backend ./backend; then
    echo "✅ 后端构建成功！说明 Python 环境和 apt/pip 源配置正确"
else
    echo "❌ 后端构建失败！问题出在 backend/Dockerfile 或网络源"
    exit 1
fi

echo -e "\n=== 3. 单独构建前端 (Frontend) ==="
echo "正在尝试构建前端镜像..."
if sudo docker build -t debug_frontend ./frontend; then
    echo "✅ 前端构建成功！说明 React 代码和 npm 源配置正确"
else
    echo "❌ 前端构建失败！问题出在 frontend/Dockerfile 或 npm 依赖"
    exit 1
fi

echo -e "\n=== 🎉 测试通过！现在可以运行 docker compose up -d 了 ==="