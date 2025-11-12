"""
上下文构建器

根据游戏状态和行动上下文构建 LLM 消息
"""
from typing import Dict, Any, List, Optional
from datetime import datetime


def build_llm_messages(
    game_status: Dict[str, Any],
    action_context: Dict[str, Any],
    task: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, str]]:
    """
    构建 LLM 消息上下文

    Args:
        game_status: 游戏状态
        action_context: 行动上下文
        task: 任务信息（可选）

    Returns:
        消息列表
    """
    messages = []

    # 1. 系统提示词
    system_prompt = build_system_prompt(game_status, action_context, task)
    messages.append({"role": "system", "content": system_prompt})

    # 2. 游戏历史消息
    history_content = build_history_content(game_status)
    if history_content:
        messages.append({"role": "user", "content": history_content})

    # 3. 当前行动提示
    action_prompt = build_action_prompt(game_status, action_context, task)
    messages.append({"role": "user", "content": action_prompt})

    return messages


def build_system_prompt(
    game_status: Dict[str, Any],
    action_context: Dict[str, Any],
    task: Optional[Dict[str, Any]] = None,
) -> str:
    """构建系统提示词"""
    my_role = game_status.get("myRole")
    my_player_index = game_status.get("myPlayerIndex")
    day = game_status.get("day")
    phase = game_status.get("phase")
    players = game_status.get("players", [])
    alive_player_indexes = game_status.get("alivePlayerIndexes", [])

    prompt = "你是一个狼人杀游戏的AI玩家。\n\n"
    prompt += "当前游戏信息：\n"
    prompt += f"- 你是 {my_player_index} 号玩家\n"
    prompt += f"- 你的角色是：{my_role}\n"
    prompt += f"- 当前是第 {day} 天\n"
    prompt += f"- 当前阶段：{phase}\n\n"

    # 任务信息（如果有）
    if task:
        prompt += "📋 你的任务：\n"
        prompt += f"- 任务名称：{task.get('name')}\n"
        prompt += f"- 任务描述：{task.get('description')}\n"
        prompt += f"- 任务奖励：{task.get('reward')} 分\n"
        prompt += f"- 任务类型：{task.get('type')}\n\n"
        prompt += "⚠️ 重要：你必须努力完成这个任务以获得奖励。在做决策时，优先考虑任务目标。\n\n"

    # 玩家信息
    prompt += "玩家信息：\n"
    for player in players:
        status = "存活" if player.get("isAlive") else "已死亡"
        role_info = f" (角色: {player.get('role')})" if player.get("role") else ""
        prompt += f"- {player.get('playerIndex')} 号玩家：{player.get('name')}，{status}{role_info}\n"
    prompt += "\n"

    # 存活玩家列表
    prompt += f"存活玩家编号：{', '.join(map(str, alive_player_indexes))}\n\n"

    # 角色特殊信息（兼容大小写）
    my_role_lower = str(my_role).lower()
    if my_role_lower == "witch" or my_role == "WITCH":
        has_heal = "有" if game_status.get("myHasHealPotion") else "无"
        has_poison = "有" if game_status.get("myHasPoisonPotion") else "无"
        prompt += f"女巫药水状态：解药{has_heal}，毒药{has_poison}\n\n"

    # 狼人队友信息（兼容大小写）
    if my_role_lower == "werewolf" or my_role == "WEREWOLF":
        teammates = [
            p.get("playerIndex")
            for p in players
            if (
                (str(p.get("role", "")).lower() == "werewolf" or p.get("role") == "WEREWOLF")
                and p.get("playerIndex") != my_player_index
                and p.get("isAlive")
            )
        ]
        if teammates:
            prompt += f"你的狼人队友：{', '.join(map(str, teammates))} 号玩家\n\n"

    return prompt


def build_history_content(game_status: Dict[str, Any]) -> Optional[str]:
    """构建历史消息内容"""
    history = game_status.get("history", [])

    if not history:
        return None

    content = "游戏历史消息：\n\n"

    for msg in history:
        timestamp = msg.get("timestamp")
        if timestamp:
            try:
                dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                time_str = dt.strftime("%H:%M:%S")
            except:
                time_str = timestamp
        else:
            time_str = ""

        day_info = f"第{msg.get('day')}天" if msg.get("day") else ""
        phase_info = f"[{msg.get('phase')}]" if msg.get("phase") else ""
        player_info = f"{msg.get('playerIndex')}号玩家" if msg.get("playerIndex") is not None else ""

        content += f"[{time_str}] {day_info} {phase_info} {player_info}: {msg.get('content')}\n"

    return content


def build_action_prompt(
    game_status: Dict[str, Any],
    action_context: Dict[str, Any],
    task: Optional[Dict[str, Any]] = None,
) -> str:
    """构建行动提示词"""
    action_type = action_context.get("actionType")
    deadline = action_context.get("deadline")
    hint = action_context.get("hint")

    if deadline:
        try:
            deadline_date = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
            remaining_seconds = max(0, int((deadline_date.timestamp() - datetime.now().timestamp())))
        except:
            remaining_seconds = 0
    else:
        remaining_seconds = 0

    prompt = "\n现在轮到你行动了！\n\n"
    prompt += f"行动类型：{action_type}\n"
    prompt += f"剩余时间：{remaining_seconds} 秒\n"
    prompt += f"提示：{hint or '请根据当前情况做出决策'}\n\n"

    # 如果有关键任务，在行动提示中强调
    if task:
        day = game_status.get("day")
        # 冷漠女巫任务：第一天晚上不能使用毒药或解药
        if task.get("type") == "cold_witch" and day == 1 and action_type == "witch_action":
            prompt += f"⚠️ 任务提醒：{task.get('description')}。你必须跳过使用药水！\n\n"
        # 自刀狼任务：狼人需要杀死自己
        if task.get("type") == "self_kill_werewolf" and action_type == "kill":
            prompt += f"⚠️ 任务提醒：{task.get('description')}。你必须选择杀死自己（{game_status.get('myPlayerIndex')}号）！\n\n"
        # 沉默村民任务：村民不能发言
        if task.get("type") == "silent_villager" and action_type == "speech":
            my_role_lower = str(game_status.get("myRole", "")).lower()
            if my_role_lower == "villager" or game_status.get("myRole") == "VILLAGER":
                prompt += f"⚠️ 任务提醒：{task.get('description')}。你不能发言，请返回空内容！\n\n"

    # 根据不同的行动类型添加具体信息
    if action_type == "kill":
        prompt += build_kill_prompt(action_context)
    elif action_type == "check":
        prompt += build_check_prompt(action_context)
    elif action_type == "witch_action":
        prompt += build_witch_action_prompt(action_context)
    elif action_type == "last_words":
        prompt += build_last_words_prompt(action_context)
    elif action_type == "speech":
        prompt += build_speech_prompt(action_context)
    elif action_type == "vote":
        prompt += build_vote_prompt(action_context)
    elif action_type == "pk_speech":
        prompt += build_pk_speech_prompt(action_context)
    elif action_type == "pk_vote":
        prompt += build_pk_vote_prompt(action_context)

    prompt += "\n请根据以上信息做出决策，并严格按照以下格式回复：\n"
    prompt += get_action_format(action_type)

    return prompt


def build_kill_prompt(context: Dict[str, Any]) -> str:
    """构建狼人杀人提示"""
    available_targets = context.get("availableTargets", [])
    teammates = context.get("teammates", [])
    prompt = f"可杀目标：{', '.join(map(str, available_targets))} 号玩家\n"
    if teammates:
        prompt += f"你的狼人队友：{', '.join(map(str, teammates))} 号玩家\n"
    return prompt


def build_check_prompt(context: Dict[str, Any]) -> str:
    """构建预言家验人提示"""
    available_targets = context.get("availableTargets", [])
    return f"可验目标：{', '.join(map(str, available_targets))} 号玩家\n"


def build_witch_action_prompt(context: Dict[str, Any]) -> str:
    """构建女巫行动提示"""
    killed_player = context.get("killedPlayer")
    has_heal_potion = context.get("hasHealPotion", False)
    has_poison_potion = context.get("hasPoisonPotion", False)
    available_poison_targets = context.get("availablePoisonTargets", [])

    prompt = ""
    if killed_player is not None:
        prompt += f"今晚被杀的玩家：{killed_player} 号玩家\n"
    else:
        prompt += "今晚无人被杀（平安夜）\n"

    prompt += f"解药状态：{'有' if has_heal_potion else '无'}\n"
    prompt += f"毒药状态：{'有' if has_poison_potion else '无'}\n"

    if available_poison_targets:
        prompt += f"可毒目标：{', '.join(map(str, available_poison_targets))} 号玩家\n"

    return prompt


def build_last_words_prompt(context: Dict[str, Any]) -> str:
    """构建遗言提示"""
    death_reason = context.get("deathReason", "")
    return f"现在你死了，死亡原因：{death_reason}\n请发表你的遗言"


def build_speech_prompt(context: Dict[str, Any]) -> str:
    """构建发言提示"""
    return "现在到你发言了，请发言\n"


def build_vote_prompt(context: Dict[str, Any]) -> str:
    """构建投票提示"""
    available_targets = context.get("availableTargets", [])
    return f"可投票目标：{', '.join(map(str, available_targets))} 号玩家（也可以弃票）\n"


def build_pk_speech_prompt(context: Dict[str, Any]) -> str:
    """构建 PK 发言提示"""
    pk_candidates = context.get("pkCandidates", [])
    return f"PK 候选人：{', '.join(map(str, pk_candidates))} 号玩家\n"


def build_pk_vote_prompt(context: Dict[str, Any]) -> str:
    """构建 PK 投票提示"""
    pk_candidates = context.get("pkCandidates", [])
    return f"PK 候选人：{', '.join(map(str, pk_candidates))} 号玩家（必须选择其中一个投票）\n"


def get_action_format(action_type: str) -> str:
    """获取行动格式说明"""
    formats = {
        "kill": '{"actionType": "kill", "target": <玩家编号>}',
        "check": '{"actionType": "check", "target": <玩家编号>}',
        "witch_action": '{"actionType": "witch_action", "action": "heal"|"poison"|"skip", "target": <玩家编号>（仅当action为poison时需要）}',
        "last_words": '{"actionType": "last_words", "content": "<遗言内容>"}',
        "speech": '{"actionType": "speech", "content": "<发言内容>"}',
        "vote": '{"actionType": "vote", "target": <玩家编号>|null（null表示弃票）}',
        "pk_speech": '{"actionType": "pk_speech", "content": "<发言内容>"}',
        "pk_vote": '{"actionType": "pk_vote", "target": <玩家编号>}',
    }
    return formats.get(action_type, f'{{"actionType": "{action_type}"}}')

