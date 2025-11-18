#!/bin/bash

# JavaScript Player Agent 启动脚本

echo "Starting Player Agent..."

# 检查是否需要安装依赖（可选）
# 如果 package.json 存在且有依赖，可以取消注释下面的行
# if [ -f "package.json" ]; then
#     echo "Installing Node.js dependencies..."
#     npm install --quiet
# fi

# 运行 JavaScript Agent
cd src/js
node index.js

