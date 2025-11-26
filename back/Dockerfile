# backend/Dockerfile

# 使用官方的 Python 镜像作为基础镜像
FROM python:3.9-slim-buster

ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY

ENV HTTP_PROXY=${HTTP_PROXY}
ENV HTTPS_PROXY=${HTTPS_PROXY}
ENV NO_PROXY=${NO_PROXY}

# 设置工作目录
WORKDIR /app

# 将 requirements.txt 复制到工作目录中
COPY requirements.txt .

# --- 修改点 1：保持使用阿里云 Debian 归档源  ---
RUN rm -f /etc/apt/sources.list && \
    echo "deb http://mirrors.aliyun.com/debian-archive/debian buster main contrib non-free" > /etc/apt/sources.list && \
    echo "deb http://mirrors.aliyun.com/debian-archive/debian-security buster/updates main contrib non-free" >> /etc/apt/sources.list && \
    # 更新 apt 缓存并安装 curl 以及构建 psycopg2-binary 可能需要的 libpq-dev
    apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# --- 修改点 2：保持使用清华 pip 源 (安装速度快) ---
RUN pip install --no-cache-dir -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 将所有应用代码复制到工作目录中
COPY . .

# 暴露 Flask 应用运行的端口
EXPOSE 5000

# 定义环境变量
ENV FLASK_APP=app.py

# --- 修改点 3：针对 4核 16G 服务器的性能优化 ---
# 公式：(2 x CPU核数) + 1 = (2 x 4) + 1 = 9
# 这将启动 9 个并行进程处理请求，充分利用你的多核 CPU
CMD ["gunicorn", "--workers", "9", "--bind", "0.0.0.0:5000", "app:app"]
