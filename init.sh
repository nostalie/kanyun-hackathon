#!/bin/bash

# Player Agent 入口脚本
# 根据环境变量或参数选择运行 JavaScript 或 Python 版本

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

# 虚拟环境路径
VENV_DIR="venv"

# 如果虚拟环境不存在，创建它
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment..."
    $PYTHON_CMD -m venv "$VENV_DIR"
    if [ $? -ne 0 ]; then
        echo "Error: Failed to create virtual environment!"
        exit 1
    fi
fi

# 激活虚拟环境
echo "Activating virtual environment..."
source "$VENV_DIR/bin/activate"

# 检测虚拟环境中的 pip
if [ -f "$VENV_DIR/bin/pip" ]; then
    PIP_CMD="$VENV_DIR/bin/pip"
elif [ -f "$VENV_DIR/bin/pip3" ]; then
    PIP_CMD="$VENV_DIR/bin/pip3"
else
    echo "Warning: pip not found in virtual environment. Trying system pip..."
    PIP_CMD="pip3"
fi

# 升级 pip（可选，但推荐）
echo "Upgrading pip..."
$PIP_CMD install --upgrade pip --quiet --disable-pip-version-check

# 检查并安装 Python 依赖
if [ -f "requirements.txt" ]; then
    echo "Installing Python dependencies..."
    $PIP_CMD install -r requirements.txt --quiet --disable-pip-version-check
    if [ $? -ne 0 ]; then
        echo "Warning: Failed to install some dependencies. Continuing anyway..."
    fi
fi

# 使用虚拟环境中的 Python 运行脚本
cd src/python
"$VENV_DIR/bin/python" main.py

# echo "Starting JavaScript Player Agent..."
# npm install
# node src/js/index.js