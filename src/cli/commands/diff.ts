/**
 * bozly diff - Compare two sessions
 *
 * Usage:
 *   bozly diff <session-id-1> <session-id-2>  # Compare prompt.txt files
 *   bozly diff --last 2                         # Compare last 2 sessions
 *   bozly diff --command daily                  # Compare latest two "daily" executions
 */

import { Command } from "commander";
import { logger } from "../../core/logger.js";
import { errorBox, warningBox, infoBox, theme } from "../../cli/ui/index.js";
import { getCurrentNode } from "../../core/node.js";
import {
  diffSessions,
  querySessions,
  loadSessionFiles,
  getSessionPath,
} from "../../core/sessions.js";
import path from "path";

export const diffCommand = new Command("diff")
  .description("Compare two session prompts")
  .argument("[session-id-1]", "First session ID (UUID)")
  .argument("[session-id-2]", "Second session ID (UUID)")
  .option("-l, --last <number>", "Compare last N sessions of a command")
  .option("-c, --command <name>", "Compare prompts from command")
  .action(async (sessionId1, sessionId2, options) => {
    try {
      await logger.debug("bozly diff command started", {
        sessionId1,
        sessionId2,
        last: options.last,
        command: options.command,
      });

      const node = await getCurrentNode();

      if (!node) {
        await logger.warn("Not in a node directory");
        console.error(
          warningBox("Not in a node directory", {
            hint: "Run 'bozly diff' from within a node to compare session prompts",
          })
        );
        process.exit(1);
      }

      const vaultPath = node.path;

      // Handle --last and --command modes
      if (options.last || options.command) {
        // Query latest sessions for a command
        const command = options.command;
        if (!command) {
          console.error(errorBox("Command is required when using --last"));
          process.exit(1);
        }

        const limit = options.last ? parseInt(options.last, 10) : 2;
        const sessions = await querySessions(vaultPath, { command, limit });

        if (sessions.length < 2) {
          console.log(warningBox(`Not enough sessions to compare. Found: ${sessions.length}`));
          process.exit(1);
        }

        // Compare the most recent two
        const sess1 = sessions[0];
        const sess2 = sessions[1];

        console.log(infoBox(`Comparing last 2 executions of "${command}"`));
        console.log(`Session 1: ${sess1.timestamp}`);
        console.log(`Session 2: ${sess2.timestamp}\n`);

        // Load session files to get prompt.txt
        const bozlyPath = path.join(vaultPath, ".bozly");
        const path1 = getSessionPath(bozlyPath, sess1.nodeId, sess1.timestamp, sess1.id);
        const path2 = getSessionPath(bozlyPath, sess2.nodeId, sess2.timestamp, sess2.id);

        const files1 = await loadSessionFiles(path1);
        const files2 = await loadSessionFiles(path2);

        if (!files1 || !files2) {
          console.error(errorBox("Failed to load session files"));
          process.exit(1);
        }

        // Show diff
        displayPromptDiff(files1.promptTxt, files2.promptTxt, sess1.timestamp, sess2.timestamp);

        // Show statistics
        const diff = diffSessions(sess1, sess2);
        console.log(
          infoBox("Statistics", {
            "Context size change": `${diff.differences.prompt.contextSize > 0 ? "+" : ""}${diff.differences.prompt.contextSize}B`,
            "Total prompt change": `${diff.differences.prompt.total > 0 ? "+" : ""}${diff.differences.prompt.total}B`,
            "Duration change": `${diff.differences.response.duration > 0 ? "+" : ""}${diff.differences.response.duration}ms`,
            "Status changed": diff.differences.response.status ? "Yes" : "No",
          })
        );

        return;
      }

      // Handle explicit session ID mode
      if (!sessionId1 || !sessionId2) {
        console.error(
          errorBox("Either provide two session IDs or use --command --last", {
            usage1: "bozly diff <id1> <id2>",
            usage2: "bozly diff --command daily --last 2",
          })
        );
        process.exit(1);
      }

      await logger.info("Comparing sessions", {
        vaultPath,
        sessionId1,
        sessionId2,
      });

      // Query for both sessions
      const sessions = await querySessions(vaultPath, {});
      const sess1 = sessions.find((s) => s.id === sessionId1);
      const sess2 = sessions.find((s) => s.id === sessionId2);

      if (!sess1 || !sess2) {
        console.error(errorBox("One or both session IDs not found"));
        process.exit(1);
      }

      // Load session files
      const bozlyPath = path.join(vaultPath, ".bozly");
      const path1 = getSessionPath(bozlyPath, sess1.nodeId, sess1.timestamp, sess1.id);
      const path2 = getSessionPath(bozlyPath, sess2.nodeId, sess2.timestamp, sess2.id);

      const files1 = await loadSessionFiles(path1);
      const files2 = await loadSessionFiles(path2);

      if (!files1 || !files2) {
        console.error(errorBox("Failed to load session files"));
        process.exit(1);
      }

      console.log(infoBox("Comparing sessions", {}));
      console.log(`Session 1 (${sessionId1}):`);
      console.log(`  Command: ${sess1.command}`);
      console.log(`  Timestamp: ${sess1.timestamp}`);
      console.log(`  Provider: ${sess1.provider}`);
      console.log();
      console.log(`Session 2 (${sessionId2}):`);
      console.log(`  Command: ${sess2.command}`);
      console.log(`  Timestamp: ${sess2.timestamp}`);
      console.log(`  Provider: ${sess2.provider}`);
      console.log();

      // Show diff
      displayPromptDiff(files1.promptTxt, files2.promptTxt, sess1.timestamp, sess2.timestamp);

      // Show statistics
      const diff = diffSessions(sess1, sess2);
      console.log(
        infoBox("Statistics", {
          "Context size change": `${diff.differences.prompt.contextSize > 0 ? "+" : ""}${diff.differences.prompt.contextSize}B`,
          "Total prompt change": `${diff.differences.prompt.total > 0 ? "+" : ""}${diff.differences.prompt.total}B`,
          "Duration change": `${diff.differences.response.duration > 0 ? "+" : ""}${diff.differences.response.duration}ms`,
          "Status changed": diff.differences.response.status ? "Yes" : "No",
        })
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error("Failed to compare sessions", {
        error: errorMsg,
      });

      console.error(
        errorBox("Failed to compare sessions", {
          error: errorMsg,
        })
      );
      process.exit(1);
    }
  });

/**
 * Display a simple text diff of two prompts
 */
function displayPromptDiff(prompt1: string, prompt2: string, time1: string, time2: string): void {
  console.log(`\n--- Prompt from ${time1}`);
  console.log(`+++ Prompt from ${time2}\n`);

  const lines1 = prompt1.split("\n");
  const lines2 = prompt2.split("\n");

  const maxLen = Math.max(lines1.length, lines2.length);

  // Simple diff: show lines that differ
  let diffCount = 0;
  for (let i = 0; i < maxLen; i++) {
    const line1 = lines1[i] || "";
    const line2 = lines2[i] || "";

    if (line1 !== line2) {
      if (line1) {
        console.log(theme.error(`- ${line1.substring(0, 80)}`));
      }
      if (line2) {
        console.log(theme.success(`+ ${line2.substring(0, 80)}`));
      }
      diffCount++;
    }
  }

  if (diffCount === 0) {
    console.log(theme.muted("(No differences found in prompts)"));
  } else {
    console.log(theme.muted(`\n(${diffCount} lines changed)`));
  }
}
