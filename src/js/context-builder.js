/**
 * 上下文构建器
 *
 * 根据游戏状态和行动上下文构建 LLM 消息
 */

/**
 * 构建 LLM 消息上下文
 * @param gameStatus - 游戏状态
 * @param actionContext - 行动上下文
 * @param {Object} [task] - 任务信息（可选）
 *
 * @returns {Array<{role: string, content: string}>} 消息列表
 */
export function buildLLMMessages(gameStatus, actionContext, task) {
  const messages = [];

  // 1. 系统提示词
  const systemPrompt = buildSystemPrompt(gameStatus, actionContext, task);
  messages.push({
    role: "system",
    content: systemPrompt,
  });

  // 2. 游戏历史消息
  const historyContent = buildHistoryContent(gameStatus);
  if (historyContent) {
    messages.push({
      role: "user",
      content: historyContent,
    });
  }

  // 3. 当前行动提示
  const actionPrompt = buildActionPrompt(gameStatus, actionContext, task);
  messages.push({
    role: "user",
    content: actionPrompt,
  });

  return messages;
}

/**
 * 构建系统提示词
 */
function buildSystemPrompt(gameStatus, actionContext, task = null) {
  const { myRole, myPlayerIndex, day, phase, players, alivePlayerIndexes } =
    gameStatus;

  let prompt = `你是一个狼人杀游戏的AI玩家。\n\n`;
  prompt += `当前游戏信息：\n`;
  prompt += `- 你是 ${myPlayerIndex} 号玩家\n`;
  prompt += `- 你的角色是：${myRole}\n`;
  prompt += `- 当前是第 ${day} 天\n`;
  prompt += `- 当前阶段：${phase}\n\n`;

  // 任务信息（如果有）
  if (task) {
    prompt += `📋 你的任务：\n`;
    prompt += `- 任务名称：${task.name}\n`;
    prompt += `- 任务描述：${task.description}\n`;
    prompt += `- 任务奖励：${task.reward} 分\n`;
    prompt += `- 任务类型：${task.type}\n\n`;
    prompt += `⚠️ 重要：你必须努力完成这个任务以获得奖励。在做决策时，优先考虑任务目标。\n\n`;
  }

  // 玩家信息
  prompt += `玩家信息：\n`;
  for (const player of players) {
    const status = player.isAlive ? "存活" : "已死亡";
    const roleInfo = player.role ? ` (角色: ${player.role})` : "";
    prompt += `- ${player.playerIndex} 号玩家：${player.name}，${status}${roleInfo}\n`;
  }
  prompt += `\n`;

  // 存活玩家列表
  prompt += `存活玩家编号：${alivePlayerIndexes.join(", ")}\n\n`;

  // 角色特殊信息（兼容大小写）
  const myRoleLower = String(myRole).toLowerCase();
  if (myRoleLower === "witch" || myRole === "WITCH") {
    const hasHeal = gameStatus.myHasHealPotion ? "有" : "无";
    const hasPoison = gameStatus.myHasPoisonPotion ? "有" : "无";
    prompt += `女巫药水状态：解药${hasHeal}，毒药${hasPoison}\n\n`;
  }

  // 狼人队友信息（兼容大小写）
  if (myRoleLower === "werewolf" || myRole === "WEREWOLF") {
    const teammates = players
      .filter((p) => {
        const role = String(p.role || "").toLowerCase();
        return (
          (role === "werewolf" || p.role === "WEREWOLF") &&
          p.playerIndex !== myPlayerIndex &&
          p.isAlive
        );
      })
      .map((p) => p.playerIndex);
    if (teammates.length > 0) {
      prompt += `你的狼人队友：${teammates.join(", ")} 号玩家\n\n`;
    }
  }

  return prompt;
}

/**
 * 构建历史消息内容
 */
function buildHistoryContent(gameStatus) {
  const { history } = gameStatus;

  if (!history || history.length === 0) {
    return null;
  }

  let content = `游戏历史消息：\n\n`;

  for (const msg of history) {
    const time = new Date(msg.timestamp).toLocaleTimeString("zh-CN");
    const dayInfo = msg.day ? `第${msg.day}天` : "";
    const phaseInfo = msg.phase ? `[${msg.phase}]` : "";
    const playerInfo =
      msg.playerIndex !== undefined ? `${msg.playerIndex}号玩家` : "";

    content += `[${time}] ${dayInfo} ${phaseInfo} ${playerInfo}: ${msg.content}\n`;
  }

  return content;
}

/**
 * 构建行动提示词
 */
function buildActionPrompt(gameStatus, actionContext, task = null) {
  const { actionType, deadline, hint } = actionContext;
  const deadlineDate = new Date(deadline);
  const remainingSeconds = Math.max(
    0,
    Math.floor((deadlineDate - Date.now()) / 1000)
  );

  let prompt = `\n现在轮到你行动了！\n\n`;
  prompt += `行动类型：${actionType}\n`;
  prompt += `剩余时间：${remainingSeconds} 秒\n`;
  prompt += `提示：${hint || "请根据当前情况做出决策"}\n\n`;

  // 如果有关键任务，在行动提示中强调
  if (task) {
    const { day } = gameStatus;
    // 冷漠女巫任务：第一天晚上不能使用毒药或解药
    if (
      task.type === "cold_witch" &&
      day === 1 &&
      actionType === "witch_action"
    ) {
      prompt += `⚠️ 任务提醒：${task.description}。你必须跳过使用药水！\n\n`;
    }
    // 自刀狼任务：狼人需要杀死自己
    if (task.type === "self_kill_werewolf" && actionType === "kill") {
      prompt += `⚠️ 任务提醒：${task.description}。你必须选择杀死自己（${gameStatus.myPlayerIndex}号）！\n\n`;
    }
    // 沉默村民任务：村民不能发言
    if (task.type === "silent_villager" && actionType === "speech") {
      const myRoleLower = String(gameStatus.myRole).toLowerCase();
      if (myRoleLower === "villager" || gameStatus.myRole === "VILLAGER") {
        prompt += `⚠️ 任务提醒：${task.description}。你不能发言，请返回空内容！\n\n`;
      }
    }
  }

  // 根据不同的行动类型添加具体信息
  switch (actionType) {
    case "kill":
      prompt += buildKillPrompt(actionContext);
      break;
    case "check":
      prompt += buildCheckPrompt(actionContext);
      break;
    case "witch_action":
      prompt += buildWitchActionPrompt(actionContext);
      break;
    case "last_words":
      prompt += buildLastWordsPrompt(actionContext);
      break;
    case "speech":
      prompt += buildSpeechPrompt(actionContext);
      break;
    case "vote":
      prompt += buildVotePrompt(actionContext);
      break;
    case "pk_speech":
      prompt += buildPKSpeechPrompt(actionContext);
      break;
    case "pk_vote":
      prompt += buildPKVotePrompt(actionContext);
      break;
  }

  prompt += `\n请根据以上信息做出决策，并严格按照以下格式回复：\n`;
  prompt += getActionFormat(actionType);

  return prompt;
}

/**
 * 构建狼人杀人提示
 */
function buildKillPrompt(context) {
  const { availableTargets, teammates } = context;
  let prompt = `可杀目标：${availableTargets.join(", ")} 号玩家\n`;
  if (teammates && teammates.length > 0) {
    prompt += `你的狼人队友：${teammates.join(", ")} 号玩家\n`;
  }
  return prompt;
}

/**
 * 构建预言家验人提示
 */
function buildCheckPrompt(context) {
  const { availableTargets } = context;
  return `可验目标：${availableTargets.join(", ")} 号玩家\n`;
}

/**
 * 构建女巫行动提示
 */
function buildWitchActionPrompt(context) {
  const {
    killedPlayer,
    hasHealPotion,
    hasPoisonPotion,
    availablePoisonTargets,
  } = context;
  let prompt = "";

  if (killedPlayer !== null) {
    prompt += `今晚被杀的玩家：${killedPlayer} 号玩家\n`;
  } else {
    prompt += `今晚无人被杀（平安夜）\n`;
  }

  prompt += `解药状态：${hasHealPotion ? "有" : "无"}\n`;
  prompt += `毒药状态：${hasPoisonPotion ? "有" : "无"}\n`;

  if (availablePoisonTargets && availablePoisonTargets.length > 0) {
    prompt += `可毒目标：${availablePoisonTargets.join(", ")} 号玩家\n`;
  }

  return prompt;
}

/**
 * 构建遗言提示
 */
function buildLastWordsPrompt(context) {
  const { deathReason } = context;
  return `现在你死了，死亡原因：${deathReason}\n请发表你的遗言`;
}

/**
 * 构建发言提示
 */
function buildSpeechPrompt(context) {
  return `现在到你发言了，请发言\n`;
}

/**
 * 构建投票提示
 */
function buildVotePrompt(context) {
  const { availableTargets } = context;
  return `可投票目标：${availableTargets.join(", ")} 号玩家（也可以弃票）\n`;
}

/**
 * 构建 PK 发言提示
 */
function buildPKSpeechPrompt(context) {
  const { pkCandidates } = context;
  return `PK 候选人：${pkCandidates.join(", ")} 号玩家\n`;
}

/**
 * 构建 PK 投票提示
 */
function buildPKVotePrompt(context) {
  const { pkCandidates } = context;
  return `PK 候选人：${pkCandidates.join(
    ", "
  )} 号玩家（必须选择其中一个投票）\n`;
}

/**
 * 获取行动格式说明
 */
function getActionFormat(actionType) {
  switch (actionType) {
    case "kill":
      return `{"actionType": "kill", "target": <玩家编号>}`;
    case "check":
      return `{"actionType": "check", "target": <玩家编号>}`;
    case "witch_action":
      return `{"actionType": "witch_action", "action": "heal"|"poison"|"skip", "target": <玩家编号>（仅当action为poison时需要）}`;
    case "last_words":
      return `{"actionType": "last_words", "content": "<遗言内容>"}`;
    case "speech":
      return `{"actionType": "speech", "content": "<发言内容>"}`;
    case "vote":
      return `{"actionType": "vote", "target": <玩家编号>|null（null表示弃票）}`;
    case "pk_speech":
      return `{"actionType": "pk_speech", "content": "<发言内容>"}`;
    case "pk_vote":
      return `{"actionType": "pk_vote", "target": <玩家编号>}`;
    default:
      return `{"actionType": "${actionType}"}`;
  }
}
