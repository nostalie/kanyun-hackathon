/**
 * LLM 客户端
 *
 * 依据自身的选择进行实现，这里以调用deepseek的API为例（参照提供的接入文档进行实现调整）
 */

/**
 * LLM 客户端类
 */
export class LLMClient {
  /**
   * @param {Object} config
   * @param {string} config.apiKey - API Key
   * @param {string} config.modelName - 模型名称
   * @param {string} [config.apiUrl] - API 地址，默认使用提供的地址
   */
  constructor(config) {
    this.apiKey = config.apiKey;
    this.modelName = config.modelName;
    this.apiUrl = config.apiUrl;
  }

  /**
   * 调用大语言模型接口
   * @param {Array<{role: string, content: string}>} messages - 消息列表
   * @returns {Promise<string>} 返回模型生成的文本
   */
  async chat(messages) {
    console.log("[LLM]   Messages:", messages.length, "条");

    const startTime = Date.now();
    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: messages,
        }),
      });

      const elapsed = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[LLM] ❌ 响应失败: ${response.status} ${response.statusText} (${elapsed}ms)`
        );
        console.error("[LLM] 错误详情:", errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`[LLM] ✅ 响应成功 (${elapsed}ms)`);

      // 解析响应
      if (data.choices && data.choices.length > 0) {
        const content = data.choices[0].message?.content || "";
        return content;
      } else {
        throw new Error("LLM 响应中没有 choices 字段");
      }
    } catch (error) {
      console.error("[LLM] 请求出错:", error.message);
      throw error;
    }
  }
}
