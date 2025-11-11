import { PlayerAgent } from "./agent.js";

/**
 * 入口文件
 */
async function main() {
  try {
    const agent = new PlayerAgent({
      pollInterval: 2000, // 2 秒轮询一次
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
