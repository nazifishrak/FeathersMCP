import { createRequire } from "module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };
const __dirname = dirname(fileURLToPath(import.meta.url));

const SKILL_NAME = "feathersjs-mcp";
const SOURCE_FILE = join(__dirname, "..", ".agents", "skills", SKILL_NAME, "SKILL.md");

export default function installSkill() {
  // Verify the bundled skill exists
  if (!existsSync(SOURCE_FILE)) {
    console.error(`Error: bundled skill not found at ${SOURCE_FILE}`);
    console.error("This is a packaging error — please open an issue at https://github.com/daffl/FeathersMCP/issues");
    process.exit(1);
  }

  // Install to .agents/skills/ in the current project directory.
  // This is the cross-platform standard supported by Claude Code, Cursor,
  // Windsurf, Gemini CLI, and other AI coding assistants.
  const targetDir = join(process.cwd(), ".agents", "skills", SKILL_NAME);
  const targetFile = join(targetDir, "SKILL.md");
  const alreadyInstalled = existsSync(targetFile);

  mkdirSync(targetDir, { recursive: true });
  writeFileSync(targetFile, readFileSync(SOURCE_FILE, "utf8"), "utf8");

  if (alreadyInstalled) {
    console.log(`✓ Updated feathersjs-mcp skill to v${version}`);
  } else {
    console.log(`✓ Installed feathersjs-mcp skill v${version}`);
  }
  console.log(`  Location: ${targetFile}`);
  console.log();
  console.log("The skill is now active for AI assistants in this project.");
  console.log("Supported clients: Claude Code, Cursor, Windsurf, Gemini CLI, and others");
  console.log("  that follow the .agents/skills/ standard (agentskills.io).");
  console.log();
  console.log("To verify, ask your AI assistant: \"What FeathersJS topics are in the docs?\"");
  console.log("You should see it call get-menu before answering.");
  console.log();
  console.log("To uninstall:");
  console.log(`  rm -rf ${targetDir}`);
}
