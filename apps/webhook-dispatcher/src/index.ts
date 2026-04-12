import { runDispatch } from "./dispatcher-handler";

console.log("[webhook-dispatcher] Starting...");
const result = await runDispatch();
console.log("[webhook-dispatcher] Complete:", JSON.stringify(result));
if (result.failed > 0) {
  process.exitCode = 1;
}
