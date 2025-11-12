"""
游戏策略

根据不同的角色和阶段做出决策
"""
import json
import re
from typing import Dict, Any, Optional

try:
    from .llm_client import LLMClient
    from .context_builder import build_llm_messages
except ImportError:
    from llm_client import LLMClient
    from context_builder import build_llm_messages


class GameStrategy:
    """游戏策略类"""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        初始化策略

        Args:
            config: 配置选项
                - playerIndex: 玩家位置编号
                - playerRole: 玩家角色
                - task: 任务信息（如果有）
                - apiKey: LLM API Key
                - modelName: LLM 模型名称
                - apiUrl: LLM API 地址
        """
        config = config or {}
        self.player_index = config.get("playerIndex")
        self.player_role = config.get("playerRole")
        self.task = config.get("task")
        self.api_key = config.get("apiKey")
        self.model_name = config.get("modelName")
        self.api_url = config.get("apiUrl")

        # 如果配置了 API Key，创建 LLM 客户端
        if self.api_key:
            self.llm_client = LLMClient(
                {
                    "apiKey": self.api_key,
                    "modelName": self.model_name,
                    "apiUrl": self.api_url,
                }
            )
            print(f"[策略] LLM 客户端已初始化: {self.model_name}")
        else:
            print("[策略] ⚠ 未配置 LLM_API_KEY，将使用随机策略")
            self.llm_client = None

    async def decide_action(self, game_status: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        根据游戏状态决定行动

        Args:
            game_status: 游戏状态

        Returns:
            行动数据，如果不需要行动返回 None
        """
        my_turn = game_status.get("myTurn", {})

        if not my_turn.get("canAct"):
            return None

        action_type = my_turn.get("actionType")
        action_context = my_turn.get("actionContext", {})

        print(f"[策略] 角色: {self.player_role}, 行动类型: {action_type}")

        try:
            return self.decide_with_llm(game_status, action_context)
        except Exception as error:
            print(f"[策略] LLM 决策失败: {str(error)}")
            # 这里可以进行一定的兜底逻辑，比如随机策略等
            return None

    def decide_with_llm(
        self, game_status: Dict[str, Any], action_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        使用 LLM 进行决策

        Args:
            game_status: 游戏状态
            action_context: 行动上下文

        Returns:
            行动数据
        """
        print("[策略] 🤖 使用 LLM 进行决策...")

        # 构建 LLM 消息
        messages = build_llm_messages(game_status, action_context, self.task)

        # 调用 LLM
        response = self.llm_client.chat(messages)

        # 解析 LLM 响应
        action = self.parse_llm_response(response, action_context.get("actionType"))

        if not action:
            raise Exception("无法解析 LLM 响应")

        print(f"[策略] ✓ LLM 决策完成: {json.dumps(action, ensure_ascii=False, indent=2)}")
        return action

    def parse_llm_response(self, response: str, expected_action_type: str) -> Optional[Dict[str, Any]]:
        """
        解析 LLM 响应

        Args:
            response: LLM 响应文本
            expected_action_type: 期望的行动类型

        Returns:
            解析后的行动对象
        """
        try:
            # 尝试提取 JSON
            json_str = response.strip()

            # 如果响应包含代码块，提取 JSON
            json_match = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", json_str)
            if json_match:
                json_str = json_match.group(1)
            else:
                # 尝试直接查找 JSON 对象
                json_obj_match = re.search(r"\{[\s\S]*\}", json_str)
                if json_obj_match:
                    json_str = json_obj_match.group(0)

            parsed = json.loads(json_str)

            # 验证 actionType
            if parsed.get("actionType") != expected_action_type:
                print(
                    f"[策略] ⚠ LLM 返回的 actionType ({parsed.get('actionType')}) 与期望的 ({expected_action_type}) 不匹配，使用期望的类型"
                )
                parsed["actionType"] = expected_action_type

            return parsed
        except Exception as error:
            print(f"[策略] ❌ 解析 LLM 响应失败: {str(error)}")
            print(f"[策略] 原始响应: {response[:500]}")
            return None

