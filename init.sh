#!/bin/bash

# Player Agent 入口脚本
# 根据环境变量或参数选择运行 JavaScript 或 Python 版本

# 默认使用 JavaScript 版本，如果设置了 USE_PYTHON=true 则使用 Python 版本
USE_PYTHON=${USE_PYTHON:-false}

echo "Starting Python Player Agent..."

# 检测可用的 Python 命令
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo "Error: Neither 'python3' nor 'python' command found!"
    exit 1
fi

# 检测可用的 pip 命令
if command -v pip3 &> /dev/null; then
    PIP_CMD="pip3"
elif command -v pip &> /dev/null; then
    PIP_CMD="pip"
else
    echo "Warning: Neither 'pip3' nor 'pip' command found. Skipping dependency installation."
    PIP_CMD=""
fi

# 检查并安装 Python 依赖
if [ -f "requirements.txt" ] && [ -n "$PIP_CMD" ]; then
    echo "Installing Python dependencies using $PIP_CMD..."
    $PIP_CMD install -r requirements.txt --quiet --disable-pip-version-check
    if [ $? -ne 0 ]; then
        echo "Warning: Failed to install some dependencies. Continuing anyway..."
    fi
elif [ -f "requirements.txt" ] && [ -z "$PIP_CMD" ]; then
    echo "Warning: requirements.txt found but pip is not available. Dependencies may not be installed."
fi

cd src/python
$PYTHON_CMD main.py

# if [ "$USE_PYTHON" = "true" ]; then
#     echo "Starting Python Player Agent..."
#     cd src/python
#     python main.py
# else
#     echo "Starting JavaScript Player Agent..."
#     node src/js/index.js
# fi

