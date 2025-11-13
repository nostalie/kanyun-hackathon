"""
入口文件
"""
import os
import sys
import signal
import time
from agent import PlayerAgent

# 从环境变量读取配置（按照文档规范）
GAME_ID = os.getenv("WEREWOLF_GAME_ID")
PLAYER_ID = os.getenv("WEREWOLF_PLAYER_ID")
PLAYER_INDEX = os.getenv("WEREWOLF_PLAYER_INDEX")
PLAYER_ROLE = os.getenv("WEREWOLF_PLAYER_ROLE")
GAME_TOKEN = os.getenv("WEREWOLF_GAME_TOKEN")
API_BASE_URL = os.getenv("WEREWOLF_API_BASE_URL")
POLL_INTERVAL = 2000

# 任务信息(可能不存在任务，所以需要判断)
TASK_TYPE = os.getenv("PLAYER_TASK_TYPE")
TASK_NAME = os.getenv("PLAYER_TASK_NAME")
TASK_DESCRIPTION = os.getenv("PLAYER_TASK_DESCRIPTION")
TASK_REWARD = os.getenv("PLAYER_TASK_REWARD")

# 模型调用的Key
MODEL_KEY = os.getenv("DEEPSEEK_KEY")  # 这里以deepseek为例，其他模型需要参照文档配置
MODEL_NAME = "deepseek-v3"  # 模型名
DEEPSEEK_API_URL = (
    "https://ep-llm-test.zhenguanyu.com/gateway-cn-test/openai-compatible/v1/chat/completions"
)

# 构建任务信息（如果有）
task = None
if TASK_TYPE:
    task = {
        "type": TASK_TYPE,
        "name": TASK_NAME,
        "description": TASK_DESCRIPTION,
        "reward": TASK_REWARD,
    }

# 打印角色和任务信息
if PLAYER_INDEX:
    print(f"玩家位置: {PLAYER_INDEX} 号")
if PLAYER_ROLE:
    print(f"角色: {PLAYER_ROLE}")
if task:
    print(f"任务: {task['name']} ({task['description']}), 奖励: {task['reward']} 分")


def main():
    """主函数"""
    try:
        agent = PlayerAgent(
            {
                "gameId": GAME_ID,
                "playerId": PLAYER_ID,
                "playerIndex": PLAYER_INDEX,
                "playerRole": PLAYER_ROLE,
                "task": task,
                "gameToken": GAME_TOKEN,
                "apiBaseUrl": API_BASE_URL,
                "pollInterval": POLL_INTERVAL,
                "llmApiKey": MODEL_KEY,
                "llmModelName": MODEL_NAME,
                "llmApiUrl": DEEPSEEK_API_URL,
            }
        )

        # 处理进程退出信号
        def signal_handler(sig, frame):
            print("\n[Main] Received signal, stopping agent...")
            agent.stop()
            sys.exit(0)

        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)

        # 启动 Agent
        agent.start()

        # 保持主线程运行
        try:
            while agent.is_running:
                time.sleep(0.1)
        except KeyboardInterrupt:
            signal_handler(signal.SIGINT, None)
    except Exception as error:
        print(f"[Main] Fatal error: {error}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

