import { runSync } from "./sync-handler";

console.log("[snapshot-syncer] Starting...");
const result = await runSync();
console.log("[snapshot-syncer] Complete:", JSON.stringify(result));
if (result.errors > 0) {
  process.exitCode = 1;
}
