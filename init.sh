#!/bin/bash

# Player Agent 入口脚本
# 根据环境变量或参数选择运行 JavaScript 或 Python 版本

echo "Starting Python Player Agent..."
pip install -r requirements.txt --quiet --disable-pip-version-check
cd src/python
python3 main.py

# echo "Starting JavaScript Player Agent..."
# npm install
# node src/js/index.js