"""
API 客户端

与 ai-werewolf 服务器通信
"""
import json
import time
import requests
from typing import Dict, Any


class ApiClient:
    """API 客户端类"""

    def __init__(self, config: Dict[str, Any]):
        """
        初始化 API 客户端

        Args:
            config: 配置字典
                - apiBaseUrl: API 基础地址
                - gameToken: 游戏访问 token
        """
        self.api_base_url = config.get("apiBaseUrl")
        self.game_token = config.get("gameToken")

    def get_game_status(self, game_id: str) -> Dict[str, Any]:
        """
        获取游戏状态

        Args:
            game_id: 游戏 ID

        Returns:
            游戏状态响应
        """
        url = f"{self.api_base_url}/api/player-agent/game/{game_id}/status"

        print("[API] 📤 发送请求:")
        print("  URL:", url)
        print("  Method: GET")
        print("  Headers:", {
            "Authorization": f"Bearer {self.game_token[:20]}...",
            "Content-Type": "application/json",
        })

        start_time = time.time()
        try:
            response = requests.get(
                url,
                headers={
                    "Authorization": f"Bearer {self.game_token}",
                    "Content-Type": "application/json",
                },
                timeout=10,
            )

            elapsed = int((time.time() - start_time) * 1000)

            if not response.ok:
                print(
                    f"[API] ❌ 响应失败: {response.status_code} {response.reason} ({elapsed}ms)"
                )
                raise Exception(f"HTTP {response.status_code}: {response.reason}")

            data = response.json()
            print(f"[API] ✅ 响应成功: {response.status_code} ({elapsed}ms)")
            print("[API] 📥 响应数据:", json.dumps(data, ensure_ascii=False, indent=2))

            return data
        except requests.exceptions.RequestException as e:
            elapsed = int((time.time() - start_time) * 1000)
            print(f"[API] ❌ 请求失败 ({elapsed}ms): {str(e)}")
            raise

    def send_ready(self, game_id: str) -> Dict[str, Any]:
        """
        发送准备就绪信号

        Args:
            game_id: 游戏 ID

        Returns:
            准备响应
        """
        url = f"{self.api_base_url}/api/player-agent/game/{game_id}/ready"

        print("[API] 📤 发送准备请求:")
        print("  URL:", url)
        print("  Method: POST")
        print("  Headers:", {
            "Authorization": f"Bearer {self.game_token[:20]}...",
            "Content-Type": "application/json",
        })

        start_time = time.time()
        try:
            response = requests.post(
                url,
                headers={
                    "Authorization": f"Bearer {self.game_token}",
                    "Content-Type": "application/json",
                },
                timeout=10,
            )

            elapsed = int((time.time() - start_time) * 1000)

            if not response.ok:
                try:
                    error_data = response.json()
                except:
                    error_data = {}
                print(
                    f"[API] ❌ 响应失败: {response.status_code} {response.reason} ({elapsed}ms)"
                )
                print("[API] 错误详情:", json.dumps(error_data, ensure_ascii=False, indent=2))
                error_msg = error_data.get("error", {}).get("message", response.reason)
                raise Exception(f"HTTP {response.status_code}: {error_msg}")

            data = response.json()
            print(f"[API] ✅ 响应成功: {response.status_code} ({elapsed}ms)")
            print("[API] 📥 响应数据:", json.dumps(data, ensure_ascii=False, indent=2))

            return data
        except requests.exceptions.RequestException as e:
            elapsed = int((time.time() - start_time) * 1000)
            print(f"[API] ❌ 请求失败 ({elapsed}ms): {str(e)}")
            raise

    def submit_action(self, game_id: str, action: Dict[str, Any]) -> Dict[str, Any]:
        """
        提交游戏行动

        Args:
            game_id: 游戏 ID
            action: 行动数据

        Returns:
            行动响应
        """
        url = f"{self.api_base_url}/api/player-agent/game/{game_id}/action"

        print("[API] 📤 发送请求:")
        print("  URL:", url)
        print("  Method: POST")
        print("  Headers:", {
            "Authorization": f"Bearer {self.game_token[:20]}...",
            "Content-Type": "application/json",
        })
        print("  Body:", json.dumps(action, ensure_ascii=False, indent=2))

        start_time = time.time()
        try:
            response = requests.post(
                url,
                headers={
                    "Authorization": f"Bearer {self.game_token}",
                    "Content-Type": "application/json",
                },
                json=action,
                timeout=10,
            )

            elapsed = int((time.time() - start_time) * 1000)

            if not response.ok:
                try:
                    error_data = response.json()
                except:
                    error_data = {}
                print(
                    f"[API] ❌ 响应失败: {response.status_code} {response.reason} ({elapsed}ms)"
                )
                print("[API] 错误详情:", json.dumps(error_data, ensure_ascii=False, indent=2))
                error_msg = error_data.get("error", {}).get("message", response.reason)
                raise Exception(f"HTTP {response.status_code}: {error_msg}")

            data = response.json()
            print(f"[API] ✅ 响应成功: {response.status_code} ({elapsed}ms)")
            print("[API] 📥 响应数据:", json.dumps(data, ensure_ascii=False, indent=2))

            return data
        except requests.exceptions.RequestException as e:
            elapsed = int((time.time() - start_time) * 1000)
            print(f"[API] ❌ 请求失败 ({elapsed}ms): {str(e)}")
            raise

