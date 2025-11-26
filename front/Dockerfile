
FROM node:20-alpine AS build-stage

# 接收构建参数，用于在需要代理的网络环境中下载依赖
# ARG 指令定义了 Docker build 时可以传入的参数。
# 这些参数允许你在构建时动态配置代理设置，而不是硬编码在 Dockerfile 中。
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY

# 如果这些 ARG 参数在构建时被传入（例如：docker build --build-arg HTTP_PROXY=...），
# 则将它们设置为容器内的环境变量。这确保了 npm install 等命令能通过代理访问外部网络。
ENV HTTP_PROXY=$HTTP_PROXY
ENV HTTPS_PROXY=$HTTPS_PROXY
ENV NO_PROXY=$NO_PROXY

# 设置容器内的工作目录为 /app。所有后续命令都会在这个目录下执行。
WORKDIR /app

# 复制 package.json 和任何 lock 文件 (package-lock.json, yarn.lock, pnpm-lock.yaml) 到工作目录。
# 这一步是 Docker 构建缓存优化的关键：如果 package*.json 没有变化，
# npm install 这一层可以重用缓存，大大加快构建速度。
COPY package*.json ./

# 安装项目的所有依赖。由于之前设置了代理环境变量，如果需要，npm 会通过代理下载依赖。
# --registry=https://registry.npmmirror.com 可以用于指定一个自定义的 npm 镜像源，如果默认源访问慢或被墙。
RUN npm install --legacy-peer-deps
# RUN npm install --registry=https://registry.npmmirror.com 

# 复制项目的其余所有文件到工作目录。
# 这一步在安装完依赖之后进行，避免了在文件变动频繁时破坏 npm install 的缓存。
COPY . .

RUN npm run build 


FROM alpine AS dist_output

# 设置容器内的工作目录为 /app。
WORKDIR /app


COPY --from=build-stage /app/dist ./dist

# 定义这个阶段的默认命令。这是一个非常特殊的 CMD。
# 它仅仅打印一条消息，列出 /app/dist 目录的内容，然后休眠1秒后退出。
# 这表明该 Dockerfile 生成的 'dist_output' 镜像本身并不是一个可运行的服务容器。
# 它的主要用途是作为一个来源 (source)，让其他 Dockerfile (例如 Nginx 的 Dockerfile)
# 可以使用 'COPY --from=dist_output /app/dist /usr/share/nginx/html' 这样的指令来获取构建好的前端文件。
CMD ["sh", "-c", "echo 'Frontend build artifacts are available in /app/dist on the volume.' && ls -la /app/dist && sleep 1 && exit 0"]
