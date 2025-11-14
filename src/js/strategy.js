/**
 * 游戏策略
 *
 * 根据不同的角色和阶段做出决策
 */

import { ClaudeClient } from "./claude-client.js";
import { buildLLMMessages } from "./context-builder.js";

/**
 * 游戏策略类
 */
export class GameStrategy {
  /**
   * @param {Object} [config] - 配置选项
   * @param {string} [config.apiKey] - LLM API Key
   * @param {string} [config.modelName] - LLM 模型名称
   * @param {string} [config.awsRegion] - AWS 区域（Claude 使用）
   */
  constructor(config = {}) {
    this.playerIndex = config.playerIndex;
    this.playerRole = config.playerRole;
    this.task = config.task;
    this.apiKey = config.apiKey;
    this.modelName = config.modelName;
    this.awsRegion = config.awsRegion;

    // 如果配置了 API Key，创建 LLM 客户端
    if (this.apiKey) {
      this.llmClient = new ClaudeClient({
        apiKey: this.apiKey,
        modelName: this.modelName,
        awsRegion: this.awsRegion || "us-west-2",
      });
      console.log(`[策略] LLM 客户端已初始化: ${this.modelName}`);
    } else {
      console.log(`[策略] ⚠ 未配置 LLM_API_KEY，将使用随机策略`);
      this.llmClient = null;
    }
  }

  /**
   * 根据游戏状态决定行动
   * @param gameStatus - 游戏状态
   * @returns {Promise<Object|null>} 行动数据，如果不需要行动返回 null
   */
  async decideAction(gameStatus) {
    const { myTurn } = gameStatus;

    if (!myTurn.canAct) {
      return null;
    }

    const { actionType, actionContext } = myTurn;

    console.log(`[策略] 角色: ${this.playerRole}, 行动类型: ${actionType}`);

    try {
      return await this.decideWithLLM(gameStatus, actionContext);
    } catch (error) {
      console.error(`[策略] LLM 决策失败: ${error.message}`);
      // 这里可以进行一定的兜底逻辑，比如随机策略等
      return null;
    }
  }

  /**
   * 使用 LLM 进行决策
   * @param {import('./types.js').GameStatus} gameStatus - 游戏状态
   * @param {import('./types.js').ActionContext} actionContext - 行动上下文
   * @returns {Promise<Object>} 行动数据
   */
  async decideWithLLM(gameStatus, actionContext) {
    console.log(`[策略] 🤖 使用 LLM 进行决策...`);

    // 构建 LLM 消息
    const messages = buildLLMMessages(gameStatus, actionContext, this.task);

    // 调用 LLM
    const response = await this.llmClient.chat(messages);

    // 解析 LLM 响应
    const action = this.parseLLMResponse(response, actionContext.actionType);

    if (!action) {
      throw new Error("无法解析 LLM 响应");
    }

    console.log(`[策略] ✓ LLM 决策完成:`, JSON.stringify(action, null, 2));
    return action;
  }

  /**
   * 解析 LLM 响应
   * @param {string} response - LLM 响应文本
   * @param {string} expectedActionType - 期望的行动类型
   * @returns {Object|null} 解析后的行动对象
   */
  parseLLMResponse(response, expectedActionType) {
    try {
      // 尝试提取 JSON
      let jsonStr = response.trim();

      // 如果响应包含代码块，提取 JSON
      const jsonMatch = jsonStr.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      } else {
        // 尝试直接查找 JSON 对象
        const jsonObjMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonObjMatch) {
          jsonStr = jsonObjMatch[0];
        }
      }

      const parsed = JSON.parse(jsonStr);

      // 验证 actionType
      if (parsed.actionType !== expectedActionType) {
        console.warn(
          `[策略] ⚠ LLM 返回的 actionType (${parsed.actionType}) 与期望的 (${expectedActionType}) 不匹配，使用期望的类型`
        );
        parsed.actionType = expectedActionType;
      }

      return parsed;
    } catch (error) {
      console.error(`[策略] ❌ 解析 LLM 响应失败: ${error.message}`);
      console.error(`[策略] 原始响应: ${response.substring(0, 500)}`);
      return null;
    }
  }
}