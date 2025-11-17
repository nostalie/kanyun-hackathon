#!/bin/bash

# Player Agent 入口脚本
# 根据环境变量或参数选择运行 JavaScript 或 Python 版本

# 默认使用 JavaScript 版本，如果设置了 USE_PYTHON=true 则使用 Python 版本
USE_PYTHON=${USE_PYTHON:-false}

echo "Starting Python Player Agent..."

# 检查并安装 Python 依赖
if [ -f "requirements.txt" ]; then
    echo "Installing Python dependencies..."
    pip3 install -r requirements.txt --quiet --disable-pip-version-check
    if [ $? -ne 0 ]; then
        echo "Warning: Failed to install some dependencies. Continuing anyway..."
    fi
fi

cd src/python
python main.py

# if [ "$USE_PYTHON" = "true" ]; then
#     echo "Starting Python Player Agent..."
#     cd src/python
#     python main.py
# else
#     echo "Starting JavaScript Player Agent..."
#     node src/js/index.js
# fi

