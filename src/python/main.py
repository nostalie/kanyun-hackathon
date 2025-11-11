"""
入口文件
"""
import sys
import os

# 添加当前目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from agent import main

if __name__ == '__main__':
    main()

