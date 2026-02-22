/**
 * Full MCP Protocol Test — tests the server over stdio just like a real client would.
 * Sends JSON-RPC messages and validates responses.
 */
import { spawn, type ChildProcess } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverPath = path.resolve(__dirname, "../../build/index.js");

let proc: ChildProcess;
let buffer = "";
let messageQueue: ((msg: any) => void)[] = [];

function sendRequest(id: number, method: string, params?: any): Promise<any> {
  return new Promise((resolve) => {
    messageQueue.push(resolve);
    const msg = JSON.stringify({ jsonrpc: "2.0", id, method, params: params || {} });
    proc.stdin!.write(msg + "\n");
  });
}

function startServer(): Promise<void> {
  return new Promise((resolve) => {
    proc = spawn("node", [serverPath], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

    proc.stdout!.on("data", (data: Buffer) => {
      buffer += data.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (line.trim()) {
          try {
            const msg = JSON.parse(line);
            const handler = messageQueue.shift();
            if (handler) handler(msg);
          } catch {
            // skip non-JSON lines
          }
        }
      }
    });

    proc.stderr!.on("data", (data: Buffer) => {
      const text = data.toString().trim();
      if (text && !text.includes("FeatherJSMCP")) {
        console.error("  STDERR:", text);
      }
    });

    // Give server a moment to start
    setTimeout(resolve, 500);
  });
}

async function main() {
  console.log("🧪 MCP Protocol Integration Test");
  console.log("============================================================\n");

  // Start server
  console.log("Starting MCP server...");
  await startServer();
  console.log("✅ Server spawned\n");

  // Test 1: Initialize
  console.log("── Test 1: initialize ──");
  const initRes = await sendRequest(1, "initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "test-client", version: "1.0.0" },
  });
  console.log("  Protocol version:", initRes.result?.protocolVersion);
  console.log("  Server name:", initRes.result?.serverInfo?.name);
  console.log("  Server version:", initRes.result?.serverInfo?.version);
  console.log("  Capabilities:", JSON.stringify(initRes.result?.capabilities));
  const hasTools = initRes.result?.capabilities?.tools;
  console.log(hasTools ? "  ✅ Tools capability advertised" : "  ❌ No tools capability");

  // Send initialized notification
  proc.stdin!.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");

  // Test 2: List tools
  console.log("\n── Test 2: tools/list ──");
  const toolsRes = await sendRequest(2, "tools/list", {});
  const tools = toolsRes.result?.tools || [];
  console.log(`  Found ${tools.length} tools:`);
  for (const tool of tools) {
    console.log(`    - ${tool.name}: ${tool.description?.substring(0, 80)}...`);
    const params = Object.keys(tool.inputSchema?.properties || {});
    console.log(`      Parameters: ${params.length > 0 ? params.join(", ") : "(none)"}`);
  }
  console.log(tools.length === 3 ? "  ✅ All 3 tools registered" : `  ❌ Expected 3 tools, got ${tools.length}`);

  // Test 3: Call get-schema
  console.log("\n── Test 3: tools/call get-schema ──");
  const schemaRes = await sendRequest(3, "tools/call", {
    name: "get-schema",
    arguments: {},
  });
  const schemaContent = schemaRes.result?.content?.[0]?.text || "";
  const schemaData = JSON.parse(schemaContent);
  const tableNames = schemaData.map((t: any) => t.table_name);
  console.log("  Tables returned:", tableNames.join(", "));
  console.log("  Table count:", schemaData.length);
  if (schemaData.length === 1 && tableNames[0] === "documents") {
    console.log("  ✅ Schema correctly returns only 'documents' table");
  } else {
    console.log("  ❌ Schema should return only 'documents' table");
  }
  // Show columns (format: ["id (INTEGER)", "title (TEXT)", ...])
  const cols = schemaData[0]?.columns || [];
  console.log("  Columns:", cols.join(", "));

  // Test 4: Call get-menu
  console.log("\n── Test 4: tools/call get-menu ──");
  const menuRes = await sendRequest(4, "tools/call", {
    name: "get-menu",
    arguments: {},
  });
  const menuContent = menuRes.result?.content?.[0]?.text || "";
  const menuData = JSON.parse(menuContent);
  const categories = Object.keys(menuData);
  console.log("  Categories:", categories.join(", "));
  let totalMenuDocs = 0;
  for (const cat of categories) {
    const count = menuData[cat].length;
    totalMenuDocs += count;
    console.log(`    ${cat}: ${count} documents`);
  }
  console.log(`  Total: ${totalMenuDocs} documents`);
  console.log(totalMenuDocs === 47 ? "  ✅ All 47 documents in menu" : `  ❌ Expected 47, got ${totalMenuDocs}`);

  // Test 5: Call search-doc with basic query
  console.log("\n── Test 5: tools/call search-doc (basic) ──");
  const searchRes = await sendRequest(5, "tools/call", {
    name: "search-doc",
    arguments: { query: "authentication" },
  });
  const searchContent = searchRes.result?.content?.[0]?.text || "";
  const searchData = JSON.parse(searchContent);
  console.log("  Query:", searchData.query);
  console.log("  Result count:", searchData.result_count);
  console.log("  Results:");
  for (const r of searchData.results || []) {
    const snippetLen = r.content_snippet?.length || 0;
    const codeCount = r.code_examples?.length || 0;
    const hasCSS = (r.content_snippet || "").includes("pre.shiki");
    console.log(`    📄 [${r.category}] ${r.title}: ${snippetLen} chars snippet, ${codeCount}/${r.total_code_examples} code blocks${hasCSS ? " ❌ HAS CSS!" : ""}`);
  }
  // Check truncation
  const anyOver500 = (searchData.results || []).some((r: any) => (r.content_snippet?.length || 0) > 510);
  const anyOver3Code = (searchData.results || []).some((r: any) => (r.code_examples?.length || 0) > 3);
  console.log(anyOver500 ? "  ❌ Some content_snippet > 500 chars (truncation failed)" : "  ✅ content_snippet truncated to ≤500 chars");
  console.log(anyOver3Code ? "  ❌ Some results have > 3 code examples" : "  ✅ code_examples limited to ≤3");
  // Check no CSS noise
  const anyCSS = (searchData.results || []).some((r: any) => (r.content_snippet || "").includes("pre.shiki"));
  console.log(anyCSS ? "  ❌ CSS noise found in results!" : "  ✅ No CSS noise in search results");

  // Test 6: Call search-doc with category filter
  console.log("\n── Test 6: tools/call search-doc (with category) ──");
  const catRes = await sendRequest(6, "tools/call", {
    name: "search-doc",
    arguments: { query: "hooks", category: "api" },
  });
  const catContent = catRes.result?.content?.[0]?.text || "";
  const catData = JSON.parse(catContent);
  console.log("  Query:", catData.query, "| Category:", catData.category);
  console.log("  Result count:", catData.result_count);
  const allApi = (catData.results || []).every((r: any) => r.category === "api");
  console.log(allApi ? "  ✅ All results are from 'api' category" : "  ❌ Some results from wrong category");

  // Test 7: Call search-doc with no results
  console.log("\n── Test 7: tools/call search-doc (no results) ──");
  const emptyRes = await sendRequest(7, "tools/call", {
    name: "search-doc",
    arguments: { query: "xyznonexistent123" },
  });
  const emptyContent = emptyRes.result?.content?.[0]?.text || "";
  const emptyData = JSON.parse(emptyContent);
  console.log("  Results:", emptyData.results?.length);
  console.log("  Message:", emptyData.message?.substring(0, 60));
  console.log("  Has suggestions:", !!emptyData.suggestions);
  console.log(emptyData.results?.length === 0 ? "  ✅ Zero results handled correctly" : "  ❌ Should return 0 results");

  // Test 8: Measure total response size
  console.log("\n── Test 8: Response size check ──");
  console.log(`  Schema response: ${schemaContent.length} chars`);
  console.log(`  Menu response: ${menuContent.length} chars`);
  console.log(`  Search response: ${searchContent.length} chars`);
  const totalSize = schemaContent.length + menuContent.length + searchContent.length;
  console.log(`  Total: ${totalSize} chars`);
  console.log(searchContent.length < 5000 ? "  ✅ Search response is reasonably sized" : "  ⚠️  Search response may be large");

  // Done
  console.log("\n============================================================");
  console.log("✅ All MCP protocol tests complete!");

  proc.kill();
  process.exit(0);
}

main().catch((err) => {
  console.error("Test failed:", err);
  proc?.kill();
  process.exit(1);
});
