/**
 * API 客户端 - 用于与游戏服务器通信
 */
export class ApiClient {
  constructor(config) {
    this.apiBaseUrl = config.apiBaseUrl;
    this.gameToken = config.gameToken;
  }

  /**
   * 获取请求头
   */
  getHeaders() {
    return {
      Authorization: `Bearer ${this.gameToken}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * 发送 HTTP 请求
   */
  async request(method, url, body = null) {
    const options = {
      method,
      headers: this.getHeaders(),
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error?.message ||
            `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return data;
    } catch (error) {
      console.error(`API request failed: ${method} ${url}`, error);
      throw error;
    }
  }

  /**
   * 获取游戏状态
   */
  async getGameStatus(gameId) {
    const url = `${this.apiBaseUrl}/api/player-agent/game/${gameId}/status`;
    return await this.request("GET", url);
  }

  /**
   * 发送准备信号
   */
  async sendReady(gameId) {
    const url = `${this.apiBaseUrl}/api/player-agent/game/${gameId}/ready`;
    return await this.request("POST", url);
  }

  /**
   * 提交行动
   */
  async submitAction(gameId, action) {
    const url = `${this.apiBaseUrl}/api/player-agent/game/${gameId}/action`;
    return await this.request("POST", url, action);
  }
}
