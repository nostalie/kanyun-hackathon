#!/bin/bash

# Player Agent 入口脚本
# 根据环境变量或参数选择运行 JavaScript 或 Python 版本

echo "Selected: Python version"
exec "./start-python.sh"

# echo "Selected: JavaScript version"
# exec "./start-js.sh"