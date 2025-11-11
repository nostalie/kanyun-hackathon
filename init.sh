#!/bin/bash

# Player Agent 入口脚本
# 根据环境变量或参数选择运行 JavaScript 或 Python 版本

# 默认使用 JavaScript 版本，如果设置了 USE_PYTHON=true 则使用 Python 版本
USE_PYTHON=${USE_PYTHON:-false}

if [ "$USE_PYTHON" = "true" ]; then
    echo "Starting Python Player Agent..."
    cd src/python
    python3 main.py
else
    echo "Starting JavaScript Player Agent..."
    node src/js/index.js
fi

