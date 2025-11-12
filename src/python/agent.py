"""
Player Agent 主逻辑
"""
import os
import time
import signal
import sys
from typing import Dict, Any, Optional
try:
    from .api_client import ApiClient
    from .strategy import Strategy
except ImportError:
    from api_client import ApiClient
    from strategy import Strategy


class PlayerAgent:
    """Player Agent 主类"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        初始化 Player Agent
        
        Args:
            config: 配置字典（可选）
        """
        # 从环境变量获取配置
        self.game_id = os.getenv('WEREWOLF_GAME_ID')
        self.player_id = os.getenv('WEREWOLF_PLAYER_ID')
        self.player_index = int(os.getenv('WEREWOLF_PLAYER_INDEX', '0'))
        self.poll_interval = (config or {}).get('pollInterval', 2)  # 默认 2 秒轮询一次
        
        if not self.game_id or not self.player_id:
            raise ValueError('Missing required environment variables: WEREWOLF_GAME_ID, WEREWOLF_PLAYER_ID')
        
        self.api_client = ApiClient({
            'apiBaseUrl': os.getenv('WEREWOLF_API_BASE_URL', ''),
            'gameToken': os.getenv('WEREWOLF_GAME_TOKEN', ''),
        })
        
        self.is_running = False
        self.last_action_time = None
    
    def print_environment_variables(self):
        """打印环境变量"""
        print("=" * 60)
        print("[PlayerAgent] Environment Variables:")
        print("=" * 60)
        print(f"  WEREWOLF_GAME_ID:      {os.getenv('WEREWOLF_GAME_ID', '(not set)')}")
        print(f"  WEREWOLF_PLAYER_ID:    {os.getenv('WEREWOLF_PLAYER_ID', '(not set)')}")
        print(f"  WEREWOLF_PLAYER_INDEX: {os.getenv('WEREWOLF_PLAYER_INDEX', '(not set)')}")
        print(f"  WEREWOLF_API_BASE_URL: {os.getenv('WEREWOLF_API_BASE_URL', '(not set)')}")
        
        # Token 只显示前20个字符，保护敏感信息
        token = os.getenv('WEREWOLF_GAME_TOKEN', '(not set)')
        if token != '(not set)' and len(token) > 20:
            token_display = f"{token[:20]}... ({len(token)} chars)"
        else:
            token_display = token
        print(f"  WEREWOLF_GAME_TOKEN:    {token_display}")
        print(f"  PLAYER_ROLE:            {os.getenv('PLAYER_ROLE', '(not set)')}")
        print(f"  PLAYER_TASK_TYPE:       {os.getenv('PLAYER_TASK_TYPE', '(not set)')}")
        print(f"  PLAYER_TASK_NAME:       {os.getenv('PLAYER_TASK_NAME', '(not set)')}")
        print(f"  PLAYER_TASK_DESCRIPTION: {os.getenv('PLAYER_TASK_DESCRIPTION', '(not set)')}")
        print(f"  PLAYER_TASK_REWARD:     {os.getenv('PLAYER_TASK_REWARD', '(not set)')}")
        print("=" * 60)
    
    def start(self):
        """启动 Agent"""
        # 打印环境变量
        self.print_environment_variables()
        
        print(f'[PlayerAgent] Starting agent for game {self.game_id}, player {self.player_id} (index: {self.player_index})')
        
        try:
            # 1. 发送准备信号
            print('[PlayerAgent] Sending ready signal...')
            self.api_client.send_ready(self.game_id)
            print('[PlayerAgent] Ready signal sent successfully')
            
            # 2. 开始轮询
            self.is_running = True
            self.poll()
        except Exception as error:
            print(f'[PlayerAgent] Failed to start: {error}')
            raise
    
    def poll(self):
        """轮询游戏状态"""
        if not self.is_running:
            return
        
        try:
            # 1. 获取游戏状态
            response = self.api_client.get_game_status(self.game_id)
            
            if not response.get('success'):
                error = response.get('error', {})
                print(f'[PlayerAgent] Failed to get game status: {error}')
                time.sleep(self.poll_interval)
                self.poll()
                return
            
            game_status = response.get('data', {})
            
            # 检查游戏是否结束
            if game_status.get('status') == 'finished':
                print('[PlayerAgent] Game finished')
                self.is_running = False
                return
            
            # 2. 检查是否需要行动
            my_turn = game_status.get('myTurn')
            if my_turn and my_turn.get('canAct'):
                action = Strategy.decide_action(game_status)
                
                if action:
                    # 检查是否在截止时间前
                    remaining_time = my_turn.get('remainingTime', 0)
                    
                    if remaining_time > 0:
                        print(f'[PlayerAgent] Submitting action: {action.get("actionType")}', action)
                        try:
                            result = self.api_client.submit_action(self.game_id, action)
                            self.last_action_time = time.time()
                            
                            if result.get('success'):
                                print(f'[PlayerAgent] Action submitted successfully: {result}')
                                
                                # 如果是预言家验人，打印结果
                                if action.get('actionType') == 'check' and result.get('result'):
                                    print(f'[PlayerAgent] Check result: {result.get("result")}')
                        except Exception as error:
                            print(f'[PlayerAgent] Failed to submit action: {error}')
                    else:
                        print('[PlayerAgent] Action deadline passed, skipping action')
            
            # 3. 安排下次轮询
            time.sleep(self.poll_interval)
            self.poll()
        except Exception as error:
            print(f'[PlayerAgent] Poll error: {error}')
            # 发生错误时继续轮询
            time.sleep(self.poll_interval)
            self.poll()
    
    def stop(self):
        """停止 Agent"""
        print('[PlayerAgent] Stopping agent...')
        self.is_running = False


def main():
    """主函数"""
    try:
        agent = PlayerAgent({
            'pollInterval': 2,  # 2 秒轮询一次
        })
        
        # 处理进程退出信号
        def signal_handler(sig, frame):
            print('\n[Main] Received signal, stopping agent...')
            agent.stop()
            sys.exit(0)
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
        
        # 启动 Agent
        agent.start()
    except Exception as error:
        print(f'[Main] Fatal error: {error}')
        sys.exit(1)


if __name__ == '__main__':
    main()

