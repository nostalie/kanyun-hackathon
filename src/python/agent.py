"""
Player Agent 核心逻辑
"""
import json
import asyncio
import threading
import time
from typing import Dict, Any, Optional

try:
    from .api_client import ApiClient
    from .strategy import GameStrategy
except ImportError:
    from api_client import ApiClient
    from strategy import GameStrategy


class PlayerAgent:
    """Player Agent 类"""

    def __init__(self, config: Dict[str, Any]):
        """
        初始化 Player Agent

        Args:
            config: 配置字典
                - gameId: 游戏 ID
                - playerId: 玩家 ID
                - playerIndex: 玩家位置编号 (1-6)
                - playerRole: 玩家角色
                - task: 任务信息（如果有）
                - gameToken: 游戏访问 token
                - apiBaseUrl: API 基础地址
                - pollInterval: 轮询间隔（毫秒），默认 2000
        """
        self.game_id = config.get("gameId")
        self.player_id = config.get("playerId")
        self.player_index = config.get("playerIndex")
        self.player_role = config.get("playerRole")
        self.task = config.get("task")
        self.poll_interval = config.get("pollInterval", 2000) / 1000.0  # 转换为秒

        self.api_client = ApiClient(
            {
                "apiBaseUrl": config.get("apiBaseUrl"),
                "gameToken": config.get("gameToken"),
            }
        )

        # 创建策略，传递 LLM 配置
        self.strategy = GameStrategy(
            {
                "playerIndex": config.get("playerIndex"),
                "playerRole": config.get("playerRole"),
                "task": config.get("task"),
                "apiKey": config.get("llmApiKey"),
                "modelName": config.get("llmModelName"),
                "apiUrl": config.get("llmApiUrl"),
            }
        )

        self.is_running = False
        self.poll_timer = None

        self.last_game_status = None

        self.action_in_progress = False

        # 记录已提交的 action 回合信息，避免重复提交
        self.last_submitted_turn_key = None

    def start(self):
        """启动 Agent"""
        if self.is_running:
            return

        self.is_running = True
        print("[Agent] ✓ Player Agent 启动成功")
        print(f"[Agent]   游戏 ID: {self.game_id}")
        print(f"[Agent]   玩家 ID: {self.player_id}")
        # 发送准备就绪信号
        self.send_ready()

        # 开始轮询
        self.poll()

    def send_ready(self):
        """发送准备就绪信号"""
        try:
            print("\n[Agent] ========== 发送准备信号 ==========")
            response = self.api_client.send_ready(self.game_id)

            if response.get("success"):
                print(f"[Agent] ✓ 准备信号发送成功: {response.get('message', '')}")
            else:
                print("[Agent] ✗ 准备信号发送失败")
            print("[Agent] =========================================\n")
        except Exception as error:
            # 准备信号发送失败不影响后续流程（可能已经准备过或游戏已开始）
            print(f"[Agent] ⚠ 准备信号发送出错: {str(error)}")
            print("[Agent] 继续运行...\n")

    def stop(self):
        """停止 Agent"""
        if not self.is_running:
            return

        self.is_running = False

        if self.poll_timer:
            self.poll_timer.cancel()
            self.poll_timer = None

        print("[Agent] Player Agent 已停止")

    def poll(self):
        """轮询游戏状态"""
        if not self.is_running:
            return

        try:
            # 获取游戏状态
            response = self.api_client.get_game_status(self.game_id)

            if not response.get("success"):
                print("[Agent] 获取游戏状态失败")
                self.schedule_next_poll()
                return

            game_status = response.get("data", {})
            self.last_game_status = game_status

            # 打印游戏状态
            self.log_game_status(game_status)

            # 检查游戏是否结束
            if game_status.get("status") == "finished":
                print("[Agent] 游戏已结束")
                self.stop()
                return

            # 检查是否需要行动
            # 检查是否已经提交过当前回合的 action
            my_turn = game_status.get("myTurn", {})
            if my_turn.get("canAct") and not self.action_in_progress:
                turn_key = self.get_turn_key(game_status)
                if self.last_submitted_turn_key == turn_key:
                    # 已经提交过当前回合的 action，跳过
                    print("[Agent] 当前回合的 action 已提交，跳过重复提交")
                else:
                    # 使用线程处理异步操作
                    threading.Thread(target=self.handle_my_turn_async, args=(game_status,), daemon=True).start()

        except Exception as error:
            print(f"[Agent] 轮询出错: {str(error)}")

        # 安排下次轮询
        self.schedule_next_poll()

    def schedule_next_poll(self):
        """安排下次轮询"""
        if not self.is_running:
            return

        def poll_wrapper():
            if self.is_running:
                self.poll()

        self.poll_timer = threading.Timer(self.poll_interval, poll_wrapper)
        self.poll_timer.start()

    def get_turn_key(self, game_status: Dict[str, Any]) -> str:
        """
        获取回合的唯一标识
        使用 day + phase + actionType 确保唯一性
        注意：这是客户端 agent，只控制一个玩家，所以不需要包含 myPlayerIndex

        Args:
            game_status: 游戏状态

        Returns:
            回合唯一标识字符串
        """
        day = game_status.get("day")
        phase = game_status.get("phase")
        my_turn = game_status.get("myTurn", {})
        action_type = my_turn.get("actionType", "")
        return f"{day}-{phase}-{action_type}"

    def handle_my_turn_async(self, game_status: Dict[str, Any]):
        """异步处理我的回合（在线程中运行）"""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(self.handle_my_turn(game_status))
        finally:
            loop.close()

    async def handle_my_turn(self, game_status: Dict[str, Any]):
        """处理我的回合"""
        self.action_in_progress = True
        turn_key = self.get_turn_key(game_status)

        try:
            print("\n[Agent] ========== 轮到我行动 ==========")

            # 使用策略决定行动（异步）
            action = await self.strategy.decide_action(game_status)

            if not action:
                print("[Agent] 策略决定不行动")
                self.action_in_progress = False
                return

            # 验证 actionType 是否匹配当前状态（防止基于过期状态提交错误的 action）
            my_turn = game_status.get("myTurn", {})
            expected_action_type = my_turn.get("actionType")
            if action.get("actionType") != expected_action_type:
                print(
                    f"[Agent] ⚠ 行动类型不匹配！期望: {expected_action_type}, 实际: {action.get('actionType')}"
                )
                print("[Agent] 可能是阶段切换，跳过提交")
                self.action_in_progress = False
                return

            # 提交行动
            print(f"[Agent] 提交行动: {json.dumps(action, ensure_ascii=False, indent=2)}")
            response = self.api_client.submit_action(self.game_id, action)

            if response.get("success"):
                print(f"[Agent] ✓ 行动提交成功: {response.get('message', '')}")

                # 记录已提交的回合，避免重复提交
                self.last_submitted_turn_key = turn_key

                # 如果是验人，显示结果
                if action.get("actionType") == "check" and response.get("result"):
                    result_text = "狼人" if response.get("result") == "werewolf" else "好人"
                    print(f"[Agent] 验人结果: 玩家 {action.get('target')} 是 {result_text}")
            else:
                print("[Agent] ✗ 行动提交失败")

            print("[Agent] =====================================\n")
        except Exception as error:
            error_msg = str(error)
            print(f"[Agent] 行动提交出错: {error_msg}")
            # 如果错误是因为已经提交过（服务端拒绝），记录回合信息
            if "already submitted" in error_msg or "Action already submitted" in error_msg:
                print("[Agent] 检测到重复提交错误，记录当前回合以避免后续重复提交")
                self.last_submitted_turn_key = turn_key
            # 如果错误是因为 actionType 不匹配，记录回合信息（可能是阶段切换）
            elif "Action type mismatch" in error_msg or "actionType" in error_msg:
                print("[Agent] 检测到 actionType 不匹配错误，可能是阶段切换，记录当前回合")
                self.last_submitted_turn_key = turn_key
        finally:
            self.action_in_progress = False

    def log_game_status(self, game_status: Dict[str, Any]):
        """打印游戏状态"""
        status = game_status.get("status")
        day = game_status.get("day")
        phase = game_status.get("phase")
        my_player_index = game_status.get("myPlayerIndex")
        my_role = game_status.get("myRole")
        my_is_alive = game_status.get("myIsAlive")
        alive_player_indexes = game_status.get("alivePlayerIndexes", [])
        my_turn = game_status.get("myTurn", {})

        print("\n[状态] ==================== 游戏状态 ====================")
        print(f"[状态] 游戏状态: {status} | 第 {day} 天 | 阶段: {phase}")
        print(
            f"[状态] 我的信息: {my_player_index} 号 | 角色: {my_role} | 存活: {'是' if my_is_alive else '否'}"
        )
        print(f"[状态] 存活玩家: [{', '.join(map(str, alive_player_indexes))}]")

        if my_turn.get("canAct"):
            print(
                f"[状态] 轮到我行动: {my_turn.get('actionType')} | 剩余时间: {my_turn.get('remainingTime')}秒"
            )
        else:
            print("[状态] 等待中...")

        print("[状态] =====================================================\n")

