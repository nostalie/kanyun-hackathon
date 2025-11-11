"""
决策策略 - 根据游戏状态决定行动
"""
import random
from typing import Dict, Any, Optional, List


class Strategy:
    """决策策略类"""
    
    @staticmethod
    def decide_action(game_status: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        根据游戏状态决定行动
        
        Args:
            game_status: 游戏状态数据
        
        Returns:
            行动数据字典，如果不需要行动则返回 None
        """
        my_turn = game_status.get('myTurn')
        if not my_turn or not my_turn.get('canAct'):
            return None
        
        action_type = my_turn.get('actionType')
        action_context = my_turn.get('actionContext', {})
        alive_player_indexes = game_status.get('alivePlayerIndexes', [])
        
        handlers = {
            'kill': lambda: Strategy.handle_kill(action_context, alive_player_indexes),
            'check': lambda: Strategy.handle_check(action_context),
            'witch_action': lambda: Strategy.handle_witch_action(action_context, game_status),
            'last_words': lambda: Strategy.handle_last_words(),
            'speech': lambda: Strategy.handle_speech(game_status),
            'vote': lambda: Strategy.handle_vote(action_context),
            'pk_speech': lambda: Strategy.handle_pk_speech(action_context),
            'pk_vote': lambda: Strategy.handle_pk_vote(action_context),
            'skip': lambda: Strategy.handle_skip(),
        }
        
        handler = handlers.get(action_type)
        if handler:
            return handler()
        else:
            print(f'Unknown action type: {action_type}')
            return None
    
    @staticmethod
    def handle_kill(action_context: Dict[str, Any], alive_player_indexes: List[int]) -> Dict[str, Any]:
        """处理狼人杀人"""
        available_targets = action_context.get('availableTargets', [])
        teammates = action_context.get('teammates', [])
        
        # 随机选择一个非狼人玩家
        non_wolf_players = [idx for idx in available_targets if idx not in teammates]
        
        if not non_wolf_players:
            # 如果没有非狼人玩家，随机选择一个
            target = random.choice(available_targets) if available_targets else None
        else:
            target = random.choice(non_wolf_players)
        
        return {
            'actionType': 'kill',
            'target': target,
        }
    
    @staticmethod
    def handle_check(action_context: Dict[str, Any]) -> Dict[str, Any]:
        """处理预言家验人"""
        available_targets = action_context.get('availableTargets', [])
        
        if not available_targets:
            return None
        
        target = random.choice(available_targets)
        return {
            'actionType': 'check',
            'target': target,
        }
    
    @staticmethod
    def handle_witch_action(action_context: Dict[str, Any], game_status: Dict[str, Any]) -> Dict[str, Any]:
        """处理女巫行动"""
        killed_player = action_context.get('killedPlayer')
        has_heal_potion = action_context.get('hasHealPotion', False)
        has_poison_potion = action_context.get('hasPoisonPotion', False)
        available_poison_targets = action_context.get('availablePoisonTargets', [])
        
        # 如果有人被杀且有解药，优先救人
        if killed_player and has_heal_potion:
            return {
                'actionType': 'witch_action',
                'action': 'heal',
            }
        
        # 如果有毒药，随机毒一个人（简单策略）
        if has_poison_potion and available_poison_targets:
            target = random.choice(available_poison_targets)
            return {
                'actionType': 'witch_action',
                'action': 'poison',
                'target': target,
            }
        
        # 否则跳过
        return {
            'actionType': 'witch_action',
            'action': 'skip',
        }
    
    @staticmethod
    def handle_last_words() -> Dict[str, Any]:
        """处理遗言"""
        return {
            'actionType': 'last_words',
            'content': '我是好人，过。',
        }
    
    @staticmethod
    def handle_speech(game_status: Dict[str, Any]) -> Dict[str, Any]:
        """处理发言"""
        my_role = game_status.get('myRole')
        my_player_index = game_status.get('myPlayerIndex')
        
        if my_role == 'WEREWOLF':
            content = f'我是{my_player_index}号，我是好人，过。'
        else:
            content = f'我是{my_player_index}号，我是好人，请大家相信我。'
        
        return {
            'actionType': 'speech',
            'content': content,
        }
    
    @staticmethod
    def handle_vote(action_context: Dict[str, Any]) -> Dict[str, Any]:
        """处理投票"""
        available_targets = action_context.get('availableTargets', [])
        
        if not available_targets:
            return {
                'actionType': 'vote',
                'target': None,  # 弃票
            }
        
        target = random.choice(available_targets)
        return {
            'actionType': 'vote',
            'target': target,
        }
    
    @staticmethod
    def handle_pk_speech(action_context: Dict[str, Any]) -> Dict[str, Any]:
        """处理 PK 发言"""
        pk_candidates = action_context.get('pkCandidates', [])
        candidates_str = '号、'.join(map(str, pk_candidates))
        return {
            'actionType': 'pk_speech',
            'content': f'我认为{candidates_str}号中可能有狼人，请大家仔细分析。',
        }
    
    @staticmethod
    def handle_pk_vote(action_context: Dict[str, Any]) -> Dict[str, Any]:
        """处理 PK 投票"""
        pk_candidates = action_context.get('pkCandidates', [])
        
        if not pk_candidates:
            return {
                'actionType': 'pk_vote',
                'target': None,
            }
        
        target = random.choice(pk_candidates)
        return {
            'actionType': 'pk_vote',
            'target': target,
        }
    
    @staticmethod
    def handle_skip() -> Dict[str, Any]:
        """处理跳过"""
        return {
            'actionType': 'skip',
        }

