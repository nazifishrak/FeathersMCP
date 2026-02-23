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
      if (text && !text.includes("FeathersJSMCP")) {
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
  console.log(tools.length === 4 ? "  ✅ All 4 tools registered" : `  ❌ Expected 4 tools, got ${tools.length}`);

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
  const anyOverLimit = (searchData.results || []).some((r: any) => {
    const snippet = r.content_snippet || "";
    // 1200 char limit + truncation message (~80 chars)
    return snippet.length > 1300;
  });
  const anyOver3Code = (searchData.results || []).some((r: any) => (r.code_examples?.length || 0) > 3);
  console.log(anyOverLimit ? "  ❌ Some content_snippet > 1200 chars (truncation failed)" : "  ✅ content_snippet truncated to ≤1200 chars");
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

  // Test 8: Call get-doc by title
  console.log("\n── Test 8: tools/call get-doc (by title) ──");
  const getDocRes = await sendRequest(8, "tools/call", {
    name: "get-doc",
    arguments: { title: "Hooks" },
  });
  const getDocContent = getDocRes.result?.content?.[0]?.text || "";
  const getDocData = JSON.parse(getDocContent);
  console.log("  Title:", getDocData.title);
  console.log("  Category:", getDocData.category);
  console.log("  Content length:", getDocData.content?.length || 0, "chars");
  console.log("  Code examples:", getDocData.code_examples?.length || 0);
  console.log("  Source URL:", getDocData.source_url);
  if (getDocData.title === "Hooks" && (getDocData.content?.length || 0) > 1000) {
    console.log("  ✅ get-doc returns full untruncated content");
  } else {
    console.log("  ❌ get-doc response missing or incomplete");
  }

  // Test 9: Call get-doc by path
  console.log("\n── Test 9: tools/call get-doc (by path) ──");
  const getDocByPathRes = await sendRequest(9, "tools/call", {
    name: "get-doc",
    arguments: { path: "api/hooks" },
  });
  const getDocByPathContent = getDocByPathRes.result?.content?.[0]?.text || "";
  const getDocByPathData = JSON.parse(getDocByPathContent);
  console.log("  Title:", getDocByPathData.title);
  console.log("  Category:", getDocByPathData.category);
  console.log("  Content length:", getDocByPathData.content?.length || 0, "chars");
  console.log("  Source URL:", getDocByPathData.source_url);
  if (getDocByPathData.title === "Hooks" && (getDocByPathData.content?.length || 0) > 1000) {
    console.log("  ✅ get-doc by path returns correct document");
  } else {
    console.log("  ❌ get-doc by path returned wrong or incomplete document");
  }

  // Test 10: Call get-doc by id (use id=1 from menu)
  console.log("\n── Test 10: tools/call get-doc (by id) ──");
  // Grab the first document id from the menu to use as a known id
  const firstCategory = Object.keys(menuData)[0];
  const firstDocId = menuData[firstCategory][0].id;
  const firstDocTitle = menuData[firstCategory][0].title;
  const getDocByIdRes = await sendRequest(10, "tools/call", {
    name: "get-doc",
    arguments: { id: firstDocId },
  });
  const getDocByIdContent = getDocByIdRes.result?.content?.[0]?.text || "";
  const getDocByIdData = JSON.parse(getDocByIdContent);
  console.log("  Requested id:", firstDocId);
  console.log("  Title:", getDocByIdData.title);
  console.log("  Category:", getDocByIdData.category);
  console.log("  Content length:", getDocByIdData.content?.length || 0, "chars");
  if (getDocByIdData.title === firstDocTitle && (getDocByIdData.content?.length || 0) > 0) {
    console.log(`  ✅ get-doc by id returns correct document ("${firstDocTitle}")`);
  } else {
    console.log(`  ❌ get-doc by id expected "${firstDocTitle}", got "${getDocByIdData.title}"`);
  }

  // Test 11: get-doc by path and by title return the same document
  console.log("\n── Test 11: tools/call get-doc (consistency: title vs path) ──");
  const titleContent = getDocData.content?.length || 0;
  const pathContent = getDocByPathData.content?.length || 0;
  const titleCodeCount = getDocData.code_examples?.length || 0;
  const pathCodeCount = getDocByPathData.code_examples?.length || 0;
  console.log(`  By title: "${getDocData.title}" — ${titleContent} chars, ${titleCodeCount} code examples`);
  console.log(`  By path:  "${getDocByPathData.title}" — ${pathContent} chars, ${pathCodeCount} code examples`);
  if (getDocData.title === getDocByPathData.title && titleContent === pathContent && titleCodeCount === pathCodeCount) {
    console.log("  ✅ Title and path lookups return identical content");
  } else {
    console.log("  ❌ Title and path lookups returned different results");
  }

  // Test 12: get-doc with no arguments returns error
  console.log("\n── Test 12: tools/call get-doc (no arguments) ──");
  const noArgRes = await sendRequest(12, "tools/call", {
    name: "get-doc",
    arguments: {},
  });
  const noArgContent = noArgRes.result?.content?.[0]?.text || "";
  const noArgError =
    noArgRes.error?.message ||
    noArgRes.error?.data?.message ||
    noArgRes.error?.data?.error ||
    "";
  const noArgMessage = noArgContent || noArgError;
  console.log("  Response:", noArgMessage.substring(0, 80));
  console.log(noArgMessage.toLowerCase().includes("provide") ? "  ✅ Missing-argument error handled" : "  ❌ No error message for empty arguments");

  // Test 13: get-doc with non-existent title
  console.log("\n── Test 13: tools/call get-doc (title not found) ──");
  const notFoundRes = await sendRequest(13, "tools/call", {
    name: "get-doc",
    arguments: { title: "NonExistentPage999" },
  });
  const notFoundContent = notFoundRes.result?.content?.[0]?.text || "";
  console.log("  Response:", notFoundContent.substring(0, 80));
  console.log(notFoundContent.includes("No document found") ? "  ✅ Not-found by title handled gracefully" : "  ❌ Missing not-found message");

  // Test 14: get-doc with non-existent path
  console.log("\n── Test 14: tools/call get-doc (path not found) ──");
  const notFoundPathRes = await sendRequest(14, "tools/call", {
    name: "get-doc",
    arguments: { path: "nonexistent/page" },
  });
  const notFoundPathContent = notFoundPathRes.result?.content?.[0]?.text || "";
  console.log("  Response:", notFoundPathContent.substring(0, 80));
  console.log(notFoundPathContent.includes("No document found") ? "  ✅ Not-found by path handled gracefully" : "  ❌ Missing not-found message for path");

  // Test 15: get-doc with non-existent id
  console.log("\n── Test 15: tools/call get-doc (id not found) ──");
  const notFoundIdRes = await sendRequest(15, "tools/call", {
    name: "get-doc",
    arguments: { id: 99999 },
  });
  const notFoundIdContent = notFoundIdRes.result?.content?.[0]?.text || "";
  console.log("  Response:", notFoundIdContent.substring(0, 80));
  console.log(notFoundIdContent.includes("No document found") ? "  ✅ Not-found by id handled gracefully" : "  ❌ Missing not-found message for id");

  // Test 16: get-doc returns full content (not truncated like search-doc)
  console.log("\n── Test 16: tools/call get-doc (full content vs search snippet) ──");
  // Compare search snippet length vs get-doc full content for the same doc
  const searchHooksResult = (searchData.results || []).find((r: any) => r.title === "Authentication");
  if (searchHooksResult) {
    const searchSnippetLen = searchHooksResult.content_snippet?.length || 0;
    // Fetch the same doc via get-doc
    const fullAuthRes = await sendRequest(16, "tools/call", {
      name: "get-doc",
      arguments: { title: "Authentication" },
    });
    const fullAuthData = JSON.parse(fullAuthRes.result?.content?.[0]?.text || "{}");
    const fullContentLen = fullAuthData.content?.length || 0;
    console.log(`  search-doc snippet: ${searchSnippetLen} chars`);
    console.log(`  get-doc full content: ${fullContentLen} chars`);
    console.log(`  get-doc code examples: ${fullAuthData.code_examples?.length || 0} (all), search-doc: ${searchHooksResult.code_examples?.length || 0} (capped at 3)`);
    if (fullContentLen >= searchSnippetLen) {
      console.log("  ✅ get-doc returns content ≥ search snippet (no truncation)");
    } else {
      console.log("  ❌ get-doc returned less content than search snippet");
    }
  } else {
    console.log("  ⚠️  Skipped — 'Authentication' not in search results for comparison");
  }

  // Test 17: get-doc strips base64 data URIs
  console.log("\n── Test 17: tools/call get-doc (base64 stripping) ──");
  const uploadsRes = await sendRequest(17, "tools/call", {
    name: "get-doc",
    arguments: { title: "File uploads in FeathersJS" },
  });
  const uploadsContent = uploadsRes.result?.content?.[0]?.text || "";
  const uploadsData = JSON.parse(uploadsContent);
  const allCode = (uploadsData.code_examples || []).map((ex: any) => ex.code).join("");
  const hasBase64 = /data:[a-z]+\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+/.test(allCode);
  console.log(`  Document: "${uploadsData.title}"`);
  console.log(`  Code examples: ${uploadsData.code_examples?.length || 0}`);
  console.log(hasBase64 ? "  ❌ Base64 data URIs found in code examples!" : "  ✅ No base64 data URIs in code (stripped correctly)");

  // Test 18: Measure total response size
  console.log("\n── Test 18: Response size check ──");
  console.log(`  Schema response: ${schemaContent.length} chars`);
  console.log(`  Menu response: ${menuContent.length} chars`);
  console.log(`  Search response: ${searchContent.length} chars`);
  console.log(`  Get-doc (title) response: ${getDocContent.length} chars`);
  console.log(`  Get-doc (path) response: ${getDocByPathContent.length} chars`);
  console.log(`  Get-doc (id) response: ${getDocByIdContent.length} chars`);
  const totalSize = schemaContent.length + menuContent.length + searchContent.length + getDocContent.length;
  console.log(`  Total (unique): ${totalSize} chars`);
  console.log(searchContent.length < 15000 ? "  ✅ Search response is reasonably sized" : "  ⚠️  Search response may be large");

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
