#!/bin/bash

# Player Agent 入口脚本
# 根据环境变量或参数选择运行 JavaScript 或 Python 版本

echo "Starting Python Player Agent..."

# 激活虚拟环境
echo "Activating virtual environment..."
python -m venv venv
source venv/bin/activate

pip install -r requirements.txt --quiet --disable-pip-version-check

# 使用虚拟环境中的 Python 运行脚本
cd src/python
venv/bin/activate main.py

# echo "Starting JavaScript Player Agent..."
# npm install
# node src/js/index.js