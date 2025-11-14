/**
 * Claude 客户端 - 适配 AWS Bedrock 上的 Claude API
 * 基于文档：https://confluence.zhenguanyu.com/pages/viewpage.action?pageId=978741394
 * 使用 bearer token (apikey) 认证，直接调用 AWS Bedrock REST API
 *
 * 使用示例：
 * ```javascript
 * import { ClaudeClient } from './claude-client.js';
 *
 * // 创建 Claude 客户端
 * const claudeClient = new ClaudeClient({
 *   apiKey: process.env.CLAUDE_API_KEY,
 *   modelName: 'claude-3-5-sonnet-20241022',
 *   awsRegion: 'us-west-2', // 可选，默认 us-west-2
 *   httpsProxy: 'http://proxy.example.com:8080', // 可选
 * });
 *
 * // 调用 chat 方法（与 LLMClient 接口兼容）
 * const messages = [
 *   { role: 'system', content: '你是一个助手' },
 *   { role: 'user', content: '你好' }
 * ];
 * const response = await claudeClient.chat(messages);
 * console.log(response);
 * ```
 *
 * 在 strategy.js 中切换使用 Claude：
 * ```javascript
 * import { ClaudeClient } from './claude-client.js';
 * // 替换原来的 import { LLMClient } from './llm-client.js';
 *
 * // 在构造函数中
 * this.llmClient = new ClaudeClient({
 *   apiKey: this.apiKey,
 *   modelName: this.modelName,
 *   awsRegion: 'us-west-2', // 根据需要配置
 * });
 * ```
 */

/**
 * Claude 客户端类
 */
export class ClaudeClient {
  /**
   * @param {Object} config
   * @param {string} config.apiKey - Claude API密钥（bearer token，有时间限制）
   * @param {string} config.modelName - 模型名称（从配置文件读取）
   * @param {string} [config.awsRegion] - AWS 区域，默认 us-west-2
   * @param {string} [config.httpProxy] - HTTP 代理地址（可选）
   * @param {string} [config.httpsProxy] - HTTPS 代理地址（可选）
   */
  constructor(config) {
    this.apiKey = config.apiKey;
    this.modelName = config.modelName;
    this.awsRegion = config.awsRegion || "us-west-2";

    // AWS Bedrock REST API endpoint
    this.baseUrl = `https://bedrock-runtime.${this.awsRegion}.amazonaws.com`;

    // 配置代理（如果提供了）
    this.proxy = config.httpsProxy || config.httpProxy || null;

    console.log("✓ 已初始化Claude Client (直接调用 AWS Bedrock API)");
    console.log(`  模型: ${this.modelName}`);
    console.log(`  AWS Region: ${this.awsRegion}`);
    console.log(`  Endpoint: ${this.baseUrl}`);
    if (this.proxy) {
      console.log(`  代理: ${this.proxy}`);
    }
  }

  /**
   * 调用大语言模型接口
   * @param {Array<{role: string, content: string}>} messages - 消息列表（包含 system 消息）
   * @param {Object} [options] - 可选参数
   * @param {number} [options.temperature] - 温度参数
   * @param {number} [options.maxTokens] - 最大token数
   * @returns {Promise<string>} 返回模型生成的文本
   */
  async chat(messages, options = {}) {
    console.log("[Claude] Messages:", messages.length, "条");

    const startTime = Date.now();
    try {
      // 分离 system prompt 和普通消息
      let systemPrompt = "";
      const conversationMessages = [];

      for (const msg of messages) {
        if (msg.role === "system") {
          systemPrompt += (systemPrompt ? "\n\n" : "") + msg.content;
        } else {
          // 转换角色名称：user -> user, assistant -> assistant
          conversationMessages.push({
            role: msg.role === "assistant" ? "assistant" : "user",
            content: msg.content,
          });
        }
      }

      // 构建 AWS Bedrock 调用 URL
      const url = `${this.baseUrl}/model/${this.modelName}/invoke`;

      // 构建请求体（Claude Messages API 格式）
      const requestBody = {
        anthropic_version: "bedrock-2023-05-31",
        messages: conversationMessages,
      };

      // 添加 system prompt（如果有）
      if (systemPrompt) {
        requestBody.system = systemPrompt;
      }

      // 添加可选参数
      if (options.temperature !== undefined) {
        requestBody.temperature = options.temperature;
      }
      if (options.maxTokens !== undefined) {
        requestBody.max_tokens = options.maxTokens;
      } else {
        // Claude API 必须指定 max_tokens
        requestBody.max_tokens = 4096;
      }

      // 配置 fetch 选项
      const fetchOptions = {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        // 设置超时时间（5分钟）
        signal: AbortSignal.timeout(300000),
      };

      // 注意：Node.js 18+ 的原生 fetch 支持通过环境变量 HTTP_PROXY/HTTPS_PROXY 配置代理
      // 如果需要程序内配置代理，可以使用 undici 或 node-fetch 等库

      // 发送请求
      const response = await fetch(url, fetchOptions);

      const elapsed = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[Claude] ❌ 响应失败: ${response.status} ${response.statusText} (${elapsed}ms)`
        );
        console.error("[Claude] 错误详情:", errorText);
        throw new Error(
          `调用Claude API时出错: HTTP ${response.status} - ${errorText}`
        );
      }

      const result = await response.json();
      console.log(`[Claude] ✅ 响应成功 (${elapsed}ms)`);

      // 解析响应（Claude Messages API 格式）
      let content = "";
      if (result.content && Array.isArray(result.content)) {
        for (const block of result.content) {
          if (block.type === "text") {
            content += block.text || "";
          }
        }
      } else if (result.content) {
        // 兼容其他可能的格式
        content = String(result.content);
      }

      if (!content) {
        throw new Error("Claude 响应中没有有效的内容");
      }

      return content;
    } catch (error) {
      console.error("[Claude] 请求出错:", error.message);
      throw error;
    }
  }

  /**
   * 获取当前模型信息
   * @returns {Object} 模型信息
   */
  getModelInfo() {
    return {
      model_name: this.modelName,
      aws_region: this.awsRegion,
      endpoint: this.baseUrl,
      api_provider: "AWS Bedrock Claude",
    };
  }
}
