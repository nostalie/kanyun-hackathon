/**
 * Player Agent 核心逻辑
 */

import { ApiClient } from "./api-client.js";
import { GameStrategy } from "./strategy.js";

/**
 * Player Agent 类
 */
export class PlayerAgent {
  /**
   * @param {Object} config
   * @param {string} config.gameId - 游戏 ID
   * @param {string} config.playerId - 玩家 ID
   * @param {number} [config.playerIndex] - 玩家位置编号 (1-6)
   * @param {string} [config.playerRole] - 玩家角色
   * @param {Object} [config.task] - 任务信息（如果有）
   * @param {string} config.gameToken - 游戏访问 token
   * @param {string} config.apiBaseUrl - API 基础地址
   * @param {number} [config.pollInterval] - 轮询间隔（毫秒），默认 2000
   */
  constructor(config) {
    this.gameId = config.gameId;
    this.playerId = config.playerId;
    this.playerIndex = config.playerIndex;
    this.playerRole = config.playerRole;
    this.task = config.task;
    this.pollInterval = config.pollInterval || 2000;

    this.apiClient = new ApiClient({
      apiBaseUrl: config.apiBaseUrl,
      gameToken: config.gameToken,
    });

    // 创建策略，传递 LLM 配置
    this.strategy = new GameStrategy({
      playerIndex: config.playerIndex,
      playerRole: config.playerRole,
      task: config.task,
      apiKey: config.llmApiKey,
      modelName: config.llmModelName,
      awsRegion: config.llmAwsRegion,
    });

    this.isRunning = false;
    this.pollTimer = null;

    /** @type {import('./types.js').GameStatus|null} */
    this.lastGameStatus = null;

    this.actionInProgress = false;

    // 记录已提交的 action 回合信息，避免重复提交
    /** @type {string|null} */
    this.lastSubmittedTurnKey = null;
  }

  /**
   * 启动 Agent
   */
  async start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    console.log("[Agent] ✓ Player Agent 启动成功");
    console.log(`[Agent]   游戏 ID: ${this.gameId}`);
    console.log(`[Agent]   玩家 ID: ${this.playerId}`);
    // 发送准备就绪信号
    await this.sendReady();

    // 开始轮询
    await this.poll();
  }

  /**
   * 发送准备就绪信号
   */
  async sendReady() {
    try {
      console.log("\n[Agent] ========== 发送准备信号 ==========");
      const response = await this.apiClient.sendReady(this.gameId);

      if (response.success) {
        console.log("[Agent] ✓ 准备信号发送成功:", response.message);
      } else {
        console.log("[Agent] ✗ 准备信号发送失败");
      }
      console.log("[Agent] =========================================\n");
    } catch (error) {
      // 准备信号发送失败不影响后续流程（可能已经准备过或游戏已开始）
      console.error("[Agent] ⚠ 准备信号发送出错:", error.message);
      console.log("[Agent] 继续运行...\n");
    }
  }

  /**
   * 停止 Agent
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    console.log("[Agent] Player Agent 已停止");
  }

  /**
   * 轮询游戏状态
   */
  async poll() {
    if (!this.isRunning) {
      return;
    }

    try {
      // 获取游戏状态
      const response = await this.apiClient.getGameStatus(this.gameId);

      if (!response.success) {
        console.error("[Agent] 获取游戏状态失败");
        this.scheduleNextPoll();
        return;
      }

      const gameStatus = response.data;
      this.lastGameStatus = gameStatus;

      // 打印游戏状态
      this.logGameStatus(gameStatus);

      // 检查游戏是否结束
      if (gameStatus.status === "finished") {
        console.log("[Agent] 游戏已结束");
        await this.stop();
        return;
      }

      // 检查是否需要行动
      // 检查是否已经提交过当前回合的 action
      if (gameStatus.myTurn.canAct && !this.actionInProgress) {
        const turnKey = this.getTurnKey(gameStatus);
        if (this.lastSubmittedTurnKey === turnKey) {
          // 已经提交过当前回合的 action，跳过
          console.log(`[Agent] 当前回合的 action 已提交，跳过重复提交`);
        } else {
          await this.handleMyTurn(gameStatus);
        }
      }
    } catch (error) {
      console.error("[Agent] 轮询出错:", error.message);
    }

    // 安排下次轮询
    this.scheduleNextPoll();
  }

  /**
   * 安排下次轮询
   */
  scheduleNextPoll() {
    if (!this.isRunning) {
      return;
    }

    this.pollTimer = setTimeout(() => {
      this.poll();
    }, this.pollInterval);
  }

  /**
   * 获取回合的唯一标识
   * 使用 day + phase + actionType 确保唯一性
   * 注意：这是客户端 agent，只控制一个玩家，所以不需要包含 myPlayerIndex
   * @param {import('./types.js').GameStatus} gameStatus
   * @returns {string}
   */
  getTurnKey(gameStatus) {
    const { day, phase, myTurn } = gameStatus;
    return `${day}-${phase}-${myTurn.actionType}`;
  }

  /**
   * 处理我的回合
   */
  async handleMyTurn(gameStatus) {
    this.actionInProgress = true;
    const turnKey = this.getTurnKey(gameStatus);

    try {
      console.log("\n[Agent] ========== 轮到我行动 ==========");

      // 使用策略决定行动（异步）
      const action = await this.strategy.decideAction(gameStatus);

      if (!action) {
        console.log("[Agent] 策略决定不行动");
        this.actionInProgress = false;
        return;
      }

      // 验证 actionType 是否匹配当前状态（防止基于过期状态提交错误的 action）
      const expectedActionType = gameStatus.myTurn.actionType;
      if (action.actionType !== expectedActionType) {
        console.error(
          `[Agent] ⚠ 行动类型不匹配！期望: ${expectedActionType}, 实际: ${action.actionType}`
        );
        console.log("[Agent] 可能是阶段切换，跳过提交");
        this.actionInProgress = false;
        return;
      }

      // 提交行动
      console.log("[Agent] 提交行动:", JSON.stringify(action, null, 2));
      const response = await this.apiClient.submitAction(this.gameId, action);

      if (response.success) {
        console.log("[Agent] ✓ 行动提交成功:", response.message);

        // 记录已提交的回合，避免重复提交
        this.lastSubmittedTurnKey = turnKey;

        // 如果是验人，显示结果
        if (action.actionType === "check" && response.result) {
          console.log(
            `[Agent] 验人结果: 玩家 ${action.target} 是 ${
              response.result === "werewolf" ? "狼人" : "好人"
            }`
          );
        }
      } else {
        console.log("[Agent] ✗ 行动提交失败");
      }

      console.log("[Agent] =====================================\n");
    } catch (error) {
      console.error("[Agent] 行动提交出错:", error.message);
      // 如果错误是因为已经提交过（服务端拒绝），记录回合信息
      if (
        error.message.includes("already submitted") ||
        error.message.includes("Action already submitted")
      ) {
        console.log(
          "[Agent] 检测到重复提交错误，记录当前回合以避免后续重复提交"
        );
        this.lastSubmittedTurnKey = turnKey;
      }
      // 如果错误是因为 actionType 不匹配，记录回合信息（可能是阶段切换）
      else if (
        error.message.includes("Action type mismatch") ||
        error.message.includes("actionType")
      ) {
        console.log(
          "[Agent] 检测到 actionType 不匹配错误，可能是阶段切换，记录当前回合"
        );
        this.lastSubmittedTurnKey = turnKey;
      }
    } finally {
      this.actionInProgress = false;
    }
  }

  /**
   * 打印游戏状态
   */
  logGameStatus(gameStatus) {
    const {
      status,
      day,
      phase,
      myPlayerIndex,
      myRole,
      myIsAlive,
      alivePlayerIndexes,
      myTurn,
    } = gameStatus;

    console.log("\n[状态] ==================== 游戏状态 ====================");
    console.log(`[状态] 游戏状态: ${status} | 第 ${day} 天 | 阶段: ${phase}`);
    console.log(
      `[状态] 我的信息: ${myPlayerIndex} 号 | 角色: ${myRole} | 存活: ${
        myIsAlive ? "是" : "否"
      }`
    );
    console.log(`[状态] 存活玩家: [${alivePlayerIndexes.join(", ")}]`);

    if (myTurn.canAct) {
      console.log(
        `[状态] 轮到我行动: ${myTurn.actionType} | 剩余时间: ${myTurn.remainingTime}秒`
      );
    } else {
      console.log("[状态] 等待中...");
    }

    console.log(
      "[状态] =====================================================\n"
    );
  }
}
