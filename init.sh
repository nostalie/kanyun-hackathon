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

# 检查 python3-venv 是否可用
check_venv_available() {
    $PYTHON_CMD -m venv --help &> /dev/null
    return $?
}

# 尝试安装 python3-venv（仅在容器环境中，需要 root 权限）
install_venv_package() {
    if command -v apt-get &> /dev/null; then
        echo "Attempting to install python3-venv..."
        # 检测 Python 版本（兼容不同 grep 版本）
        PYTHON_VERSION=$($PYTHON_CMD --version 2>&1 | sed -n 's/.*Python \([0-9]\+\.[0-9]\+\).*/\1/p' | head -1)
        if [ -n "$PYTHON_VERSION" ]; then
            # 尝试安装特定版本的 venv 包
            apt-get update -qq && apt-get install -y -qq "python${PYTHON_VERSION}-venv" 2>/dev/null && return 0
        fi
        # 如果特定版本失败，尝试通用版本
        apt-get update -qq && apt-get install -y -qq python3-venv 2>/dev/null
        return $?
    fi
    return 1
}

# 如果虚拟环境不存在，尝试创建它
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment..."
    
    # 首先检查 venv 模块是否可用
    if ! check_venv_available; then
        echo "Warning: python3-venv not available. Attempting to install..."
        
        # 尝试安装 python3-venv
        if install_venv_package; then
            echo "python3-venv installed successfully."
        else
            echo "Error: Failed to install python3-venv."
            echo ""
            echo "Please ensure your container/Dockerfile includes:"
            echo "  RUN apt-get update && apt-get install -y python3-venv"
            echo ""
            echo "Or use a Python base image that includes venv:"
            echo "  FROM python:3.11-slim"
            echo ""
            exit 1
        fi
    fi
    
    # 创建虚拟环境
    $PYTHON_CMD -m venv "$VENV_DIR"
    if [ $? -ne 0 ]; then
        echo "Error: Failed to create virtual environment!"
        echo ""
        echo "Troubleshooting:"
        echo "1. Ensure python3-venv is installed: apt-get install -y python3-venv"
        echo "2. Check Python version: $PYTHON_CMD --version"
        echo "3. Try installing specific version: apt-get install -y python3.11-venv"
        echo ""
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