/**
 * 决策策略 - 根据游戏状态决定行动
 */
export class Strategy {
  /**
   * 根据游戏状态决定行动
   */
  static decideAction(gameStatus) {
    const { myTurn, myRole, myPlayerIndex, alivePlayerIndexes } = gameStatus;

    if (!myTurn || !myTurn.canAct) {
      return null;
    }

    const { actionType, actionContext } = myTurn;

    switch (actionType) {
      case "kill":
        return Strategy.handleKill(actionContext, alivePlayerIndexes);

      case "check":
        return Strategy.handleCheck(actionContext);

      case "witch_action":
        return Strategy.handleWitchAction(actionContext, gameStatus);

      case "last_words":
        return Strategy.handleLastWords();

      case "speech":
        return Strategy.handleSpeech(gameStatus);

      case "vote":
        return Strategy.handleVote(actionContext);

      case "pk_speech":
        return Strategy.handlePkSpeech(actionContext);

      case "pk_vote":
        return Strategy.handlePkVote(actionContext);

      case "skip":
        return Strategy.handleSkip();

      default:
        console.warn(`Unknown action type: ${actionType}`);
        return null;
    }
  }

  /**
   * 处理狼人杀人
   */
  static handleKill(actionContext, alivePlayerIndexes) {
    const { availableTargets, teammates } = actionContext;

    // 随机选择一个非狼人玩家
    const nonWolfPlayers = availableTargets.filter(
      (idx) => !teammates.includes(idx)
    );

    if (nonWolfPlayers.length === 0) {
      // 如果没有非狼人玩家，随机选择一个
      const randomIndex = Math.floor(Math.random() * availableTargets.length);
      return {
        actionType: "kill",
        target: availableTargets[randomIndex],
      };
    }

    const randomIndex = Math.floor(Math.random() * nonWolfPlayers.length);
    return {
      actionType: "kill",
      target: nonWolfPlayers[randomIndex],
    };
  }

  /**
   * 处理预言家验人
   */
  static handleCheck(actionContext) {
    const { availableTargets } = actionContext;

    if (availableTargets.length === 0) {
      return null;
    }

    // 随机选择一个玩家进行查验
    const randomIndex = Math.floor(Math.random() * availableTargets.length);
    return {
      actionType: "check",
      target: availableTargets[randomIndex],
    };
  }

  /**
   * 处理女巫行动
   */
  static handleWitchAction(actionContext, gameStatus) {
    const {
      killedPlayer,
      hasHealPotion,
      hasPoisonPotion,
      availablePoisonTargets,
    } = actionContext;

    // 如果有人被杀且有解药，优先救人
    if (killedPlayer && hasHealPotion) {
      return {
        actionType: "witch_action",
        action: "heal",
      };
    }

    // 如果有毒药，随机毒一个人（简单策略）
    if (
      hasPoisonPotion &&
      availablePoisonTargets &&
      availablePoisonTargets.length > 0
    ) {
      const randomIndex = Math.floor(
        Math.random() * availablePoisonTargets.length
      );
      return {
        actionType: "witch_action",
        action: "poison",
        target: availablePoisonTargets[randomIndex],
      };
    }

    // 否则跳过
    return {
      actionType: "witch_action",
      action: "skip",
    };
  }

  /**
   * 处理遗言
   */
  static handleLastWords() {
    return {
      actionType: "last_words",
      content: "我是好人，过。",
    };
  }

  /**
   * 处理发言
   */
  static handleSpeech(gameStatus) {
    const { myRole, myPlayerIndex } = gameStatus;

    // 根据角色决定发言内容
    if (myRole === "WEREWOLF") {
      return {
        actionType: "speech",
        content: `我是${myPlayerIndex}号，我是好人，过。`,
      };
    } else {
      return {
        actionType: "speech",
        content: `我是${myPlayerIndex}号，我是好人，请大家相信我。`,
      };
    }
  }

  /**
   * 处理投票
   */
  static handleVote(actionContext) {
    const { availableTargets } = actionContext;

    if (availableTargets.length === 0) {
      return {
        actionType: "vote",
        target: null, // 弃票
      };
    }

    // 随机投票（简单策略）
    const randomIndex = Math.floor(Math.random() * availableTargets.length);
    return {
      actionType: "vote",
      target: availableTargets[randomIndex],
    };
  }

  /**
   * 处理 PK 发言
   */
  static handlePkSpeech(actionContext) {
    const { pkCandidates } = actionContext;
    return {
      actionType: "pk_speech",
      content: `我认为${pkCandidates.join(
        "号、"
      )}号中可能有狼人，请大家仔细分析。`,
    };
  }

  /**
   * 处理 PK 投票
   */
  static handlePkVote(actionContext) {
    const { pkCandidates } = actionContext;

    if (pkCandidates.length === 0) {
      return {
        actionType: "pk_vote",
        target: null,
      };
    }

    const randomIndex = Math.floor(Math.random() * pkCandidates.length);
    return {
      actionType: "pk_vote",
      target: pkCandidates[randomIndex],
    };
  }

  /**
   * 处理跳过
   */
  static handleSkip() {
    return {
      actionType: "skip",
    };
  }
}
