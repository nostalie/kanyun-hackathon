"""
LLM 客户端

依据自身的选择进行实现，这里以调用deepseek的API为例（参照提供的接入文档进行实现调整）
"""
import json
import time
import requests
from typing import List, Dict, Any


class LLMClient:
    """LLM 客户端类"""

    def __init__(self, config: Dict[str, Any]):
        """
        初始化 LLM 客户端

        Args:
            config: 配置字典
                - apiKey: API Key
                - modelName: 模型名称
                - apiUrl: API 地址，默认使用提供的地址
        """
        self.api_key = config.get("apiKey")
        self.model_name = config.get("modelName")
        self.api_url = config.get("apiUrl")

    def chat(self, messages: List[Dict[str, str]]) -> str:
        """
        调用大语言模型接口

        Args:
            messages: 消息列表，每个消息包含 role 和 content

        Returns:
            模型生成的文本
        """
        print(f"[LLM]   Messages: {len(messages)} 条")

        start_time = time.time()
        try:
            response = requests.post(
                self.api_url,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": f"Bearer {self.api_key}",
                },
                json={
                    "model": self.model_name,
                    "messages": messages,
                },
                timeout=30,
            )

            elapsed = int((time.time() - start_time) * 1000)

            if not response.ok:
                error_text = response.text
                print(
                    f"[LLM] ❌ 响应失败: {response.status_code} {response.reason} ({elapsed}ms)"
                )
                print(f"[LLM] 错误详情: {error_text}")
                raise Exception(f"HTTP {response.status_code}: {response.reason}")

            data = response.json()
            print(f"[LLM] ✅ 响应成功 ({elapsed}ms)")

            # 解析响应
            if data.get("choices") and len(data["choices"]) > 0:
                content = data["choices"][0].get("message", {}).get("content", "")
                return content
            else:
                raise Exception("LLM 响应中没有 choices 字段")
        except requests.exceptions.RequestException as e:
            print(f"[LLM] 请求出错: {str(e)}")
            raise

