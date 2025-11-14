import { PlayerAgent } from "./agent.js";

// 从环境变量读取配置（按照文档规范）
const GAME_ID = process.env.WEREWOLF_GAME_ID;
const PLAYER_ID = process.env.WEREWOLF_PLAYER_ID;
const PLAYER_INDEX = process.env.WEREWOLF_PLAYER_INDEX;
const PLAYER_ROLE = process.env.WEREWOLF_PLAYER_ROLE;
const GAME_TOKEN = process.env.WEREWOLF_GAME_TOKEN;
const API_BASE_URL = process.env.WEREWOLF_API_BASE_URL;
const POLL_INTERVAL = 2000;

// 任务信息(可能不存在任务，所以需要判断)
const TASK_TYPE = process.env.PLAYER_TASK_TYPE;
const TASK_NAME = process.env.PLAYER_TASK_NAME;
const TASK_DESCRIPTION = process.env.PLAYER_TASK_DESCRIPTION;
const TASK_REWARD = process.env.PLAYER_TASK_REWARD;

// 模型调用的Key（Claude）
const MODEL_KEY = process.env.CLAUDE_API_KEY || process.env.CLAUDE_CODE_KEY; // Claude API Key
const MODEL_NAME =
  process.env.CLAUDE_MODEL_NAME ||
  "global.anthropic.claude-sonnet-4-5-20250929-v1:0"; // Claude 模型名
const AWS_REGION = process.env.AWS_REGION || 'us-west-2'; // AWS 区域

// 构建任务信息（如果有）
const task = TASK_TYPE
  ? {
      type: TASK_TYPE,
      name: TASK_NAME,
      description: TASK_DESCRIPTION,
      reward: TASK_REWARD,
    }
  : null;

// 打印角色和任务信息
if (PLAYER_INDEX) {
  console.log(`玩家位置: ${PLAYER_INDEX} 号`);
}
if (PLAYER_ROLE) {
  console.log(`角色: ${PLAYER_ROLE}`);
}
if (task) {
  console.log(
    `任务: ${task.name} (${task.description}), 奖励: ${task.reward} 分`
  );
}
/**
 * 入口文件
 */

async function main() {
  try {
    const agent = new PlayerAgent({
      gameId: GAME_ID,
      playerId: PLAYER_ID,
      playerIndex: PLAYER_INDEX,
      playerRole: PLAYER_ROLE,
      task: task,
      gameToken: GAME_TOKEN,
      apiBaseUrl: API_BASE_URL,
      pollInterval: POLL_INTERVAL,
      llmApiKey: MODEL_KEY,
      llmModelName: MODEL_NAME,
      llmAwsRegion: AWS_REGION,
    });

    // 处理进程退出信号
    process.on("SIGINT", () => {
      console.log("\n[Main] Received SIGINT, stopping agent...");
      agent.stop();
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      console.log("\n[Main] Received SIGTERM, stopping agent...");
      agent.stop();
      process.exit(0);
    });

    // 启动 Agent
    await agent.start();
  } catch (error) {
    console.error("[Main] Fatal error:", error);
    process.exit(1);
  }
}

// 启动程序
main();
