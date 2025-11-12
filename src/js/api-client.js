/**
 * API 客户端
 *
 * 与 ai-werewolf 服务器通信
 */

/**
 * API 客户端类
 */
export class ApiClient {
  /**
   * @param {Object} config
   * @param {string} config.apiBaseUrl - API 基础地址
   * @param {string} config.gameToken - 游戏访问 token
   */
  constructor(config) {
    this.apiBaseUrl = config.apiBaseUrl;
    this.gameToken = config.gameToken;
  }

  /**
   * 获取游戏状态
   * @param {string} gameId - 游戏 ID
   * @returns {Promise<import('./types.js').GameStatusResponse>}
   */
  async getGameStatus(gameId) {
    const url = `${this.apiBaseUrl}/api/player-agent/game/${gameId}/status`;

    console.log("[API] 📤 发送请求:");
    console.log("  URL:", url);
    console.log("  Method: GET");
    console.log("  Headers:", {
      Authorization: `Bearer ${this.gameToken.substring(0, 20)}...`,
      "Content-Type": "application/json",
    });

    const startTime = Date.now();
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.gameToken}`,
        "Content-Type": "application/json",
      },
    });

    const elapsed = Date.now() - startTime;

    if (!response.ok) {
      console.log(
        `[API] ❌ 响应失败: ${response.status} ${response.statusText} (${elapsed}ms)`
      );
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[API] ✅ 响应成功: ${response.status} (${elapsed}ms)`);
    console.log("[API] 📥 响应数据:", JSON.stringify(data, null, 2));

    return data;
  }

  /**
   * 发送准备就绪信号
   * @param {string} gameId - 游戏 ID
   * @returns {Promise<import('./types.js').ReadyResponse>}
   */
  async sendReady(gameId) {
    const url = `${this.apiBaseUrl}/api/player-agent/game/${gameId}/ready`;

    console.log("[API] 📤 发送准备请求:");
    console.log("  URL:", url);
    console.log("  Method: POST");
    console.log("  Headers:", {
      Authorization: `Bearer ${this.gameToken.substring(0, 20)}...`,
      "Content-Type": "application/json",
    });

    const startTime = Date.now();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.gameToken}`,
        "Content-Type": "application/json",
      },
    });

    const elapsed = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log(
        `[API] ❌ 响应失败: ${response.status} ${response.statusText} (${elapsed}ms)`
      );
      console.log("[API] 错误详情:", JSON.stringify(errorData, null, 2));
      throw new Error(
        `HTTP ${response.status}: ${
          errorData.error?.message || response.statusText
        }`
      );
    }

    const data = await response.json();
    console.log(`[API] ✅ 响应成功: ${response.status} (${elapsed}ms)`);
    console.log("[API] 📥 响应数据:", JSON.stringify(data, null, 2));

    return data;
  }

  /**
   * 提交游戏行动
   * @param {string} gameId - 游戏 ID
   * @param {Object} action - 行动数据
   * @returns {Promise<import('./types.js').ActionResponse>}
   */
  async submitAction(gameId, action) {
    const url = `${this.apiBaseUrl}/api/player-agent/game/${gameId}/action`;

    console.log("[API] 📤 发送请求:");
    console.log("  URL:", url);
    console.log("  Method: POST");
    console.log("  Headers:", {
      Authorization: `Bearer ${this.gameToken.substring(0, 20)}...`,
      "Content-Type": "application/json",
    });
    console.log("  Body:", JSON.stringify(action, null, 2));

    const startTime = Date.now();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.gameToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(action),
    });

    const elapsed = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log(
        `[API] ❌ 响应失败: ${response.status} ${response.statusText} (${elapsed}ms)`
      );
      console.log("[API] 错误详情:", JSON.stringify(errorData, null, 2));
      throw new Error(
        `HTTP ${response.status}: ${
          errorData.error?.message || response.statusText
        }`
      );
    }

    const data = await response.json();
    console.log(`[API] ✅ 响应成功: ${response.status} (${elapsed}ms)`);
    console.log("[API] 📥 响应数据:", JSON.stringify(data, null, 2));

    return data;
  }
}
