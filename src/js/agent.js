import { ApiClient } from "./api-client.js";
import { Strategy } from "./strategy.js";

/**
 * Player Agent 主逻辑
 */
export class PlayerAgent {
  constructor(config = {}) {
    // 从环境变量获取配置
    this.gameId = process.env.WEREWOLF_GAME_ID;
    this.playerId = process.env.WEREWOLF_PLAYER_ID;
    this.playerIndex = parseInt(process.env.WEREWOLF_PLAYER_INDEX || "0");
    this.pollInterval = config.pollInterval || 2000; // 默认 2 秒轮询一次

    if (!this.gameId || !this.playerId) {
      throw new Error(
        "Missing required environment variables: WEREWOLF_GAME_ID, WEREWOLF_PLAYER_ID"
      );
    }

    this.apiClient = new ApiClient({
      apiBaseUrl: process.env.WEREWOLF_API_BASE_URL || "",
      gameToken: process.env.WEREWOLF_GAME_TOKEN || "",
    });

    this.isRunning = false;
    this.lastActionTime = null;
  }

  /**
   * 打印环境变量
   */
  printEnvironmentVariables() {
    console.log("=".repeat(60));
    console.log("[PlayerAgent] Environment Variables:");
    console.log("=".repeat(60));
    console.log(
      `  WEREWOLF_GAME_ID:      ${process.env.WEREWOLF_GAME_ID || "(not set)"}`
    );
    console.log(
      `  WEREWOLF_PLAYER_ID:    ${
        process.env.WEREWOLF_PLAYER_ID || "(not set)"
      }`
    );
    console.log(
      `  WEREWOLF_PLAYER_INDEX: ${
        process.env.WEREWOLF_PLAYER_INDEX || "(not set)"
      }`
    );
    console.log(
      `  WEREWOLF_API_BASE_URL: ${
        process.env.WEREWOLF_API_BASE_URL || "(not set)"
      }`
    );

    // Token 只显示前20个字符，保护敏感信息
    const token = process.env.WEREWOLF_GAME_TOKEN || "(not set)";
    const tokenDisplay =
      token !== "(not set)" && token.length > 20
        ? `${token.substring(0, 20)}... (${token.length} chars)`
        : token;
    console.log(`  WEREWOLF_GAME_TOKEN:    ${tokenDisplay}`);
    console.log(
      `  PLAYER_ROLE:            ${process.env.PLAYER_ROLE || "(not set)"}`
    );
    console.log(
      `  PLAYER_TASK_TYPE:       ${process.env.PLAYER_TASK_TYPE || "(not set)"}`
    );
    console.log(
      `  PLAYER_TASK_NAME:       ${process.env.PLAYER_TASK_NAME || "(not set)"}`
    );
    console.log(
      `  PLAYER_TASK_DESCRIPTION: ${
        process.env.PLAYER_TASK_DESCRIPTION || "(not set)"
      }`
    );
    console.log(
      `  PLAYER_TASK_REWARD:     ${
        process.env.PLAYER_TASK_REWARD || "(not set)"
      }`
    );
    console.log("=".repeat(60));
  }

  /**
   * 启动 Agent
   */
  async start() {
    // 打印环境变量
    this.printEnvironmentVariables();

    console.log(
      `[PlayerAgent] Starting agent for game ${this.gameId}, player ${this.playerId} (index: ${this.playerIndex})`
    );

    try {
      // 1. 发送准备信号
      console.log("[PlayerAgent] Sending ready signal...");
      await this.apiClient.sendReady(this.gameId);
      console.log("[PlayerAgent] Ready signal sent successfully");

      // 2. 开始轮询
      this.isRunning = true;
      await this.poll();
    } catch (error) {
      console.error("[PlayerAgent] Failed to start:", error);
      throw error;
    }
  }

  /**
   * 轮询游戏状态
   */
  async poll() {
    if (!this.isRunning) {
      return;
    }

    try {
      // 1. 获取游戏状态
      const response = await this.apiClient.getGameStatus(this.gameId);

      if (!response.success) {
        console.error(
          "[PlayerAgent] Failed to get game status:",
          response.error
        );
        setTimeout(() => this.poll(), this.pollInterval);
        return;
      }

      const gameStatus = response.data;

      // 检查游戏是否结束
      if (gameStatus.status === "finished") {
        console.log("[PlayerAgent] Game finished");
        this.isRunning = false;
        return;
      }

      // 2. 检查是否需要行动
      if (gameStatus.myTurn && gameStatus.myTurn.canAct) {
        const action = Strategy.decideAction(gameStatus);

        if (action) {
          // 检查是否在截止时间前
          const deadline = gameStatus.myTurn.deadline;
          const remainingTime = gameStatus.myTurn.remainingTime;

          if (remainingTime > 0) {
            console.log(
              `[PlayerAgent] Submitting action: ${action.actionType}`,
              action
            );
            try {
              const result = await this.apiClient.submitAction(
                this.gameId,
                action
              );
              this.lastActionTime = Date.now();

              if (result.success) {
                console.log(
                  "[PlayerAgent] Action submitted successfully",
                  result
                );

                // 如果是预言家验人，打印结果
                if (action.actionType === "check" && result.result) {
                  console.log(`[PlayerAgent] Check result: ${result.result}`);
                }
              }
            } catch (error) {
              console.error("[PlayerAgent] Failed to submit action:", error);
            }
          } else {
            console.warn(
              "[PlayerAgent] Action deadline passed, skipping action"
            );
          }
        }
      }

      // 3. 安排下次轮询
      setTimeout(() => this.poll(), this.pollInterval);
    } catch (error) {
      console.error("[PlayerAgent] Poll error:", error);
      // 发生错误时继续轮询
      setTimeout(() => this.poll(), this.pollInterval);
    }
  }

  /**
   * 停止 Agent
   */
  stop() {
    console.log("[PlayerAgent] Stopping agent...");
    this.isRunning = false;
  }
}
