import { runScan } from "./scan-handler";

console.log("[tag-scanner] Starting...");
const result = await runScan();
console.log("[tag-scanner] Complete:", JSON.stringify(result));
if (result.errors > 0) {
  process.exitCode = 1;
}
