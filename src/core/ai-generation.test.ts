import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as childProcess from "child_process";
import type { ChildProcess } from "child_process";
import {
  generateCommandContent,
  generateTemplateFromVault,
  generateCommandSuggestions,
} from "./ai-generation.js";

describe("ai-generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("generateCommandContent", () => {
    it("should generate command content from description", async () => {
      const mockProc = {
        stdin: { write: vi.fn(), end: vi.fn() },
        stdout: {
          setEncoding: vi.fn(),
          on: vi.fn((event, handler) => {
            if (event === "data") {
              handler(Buffer.from("Generate a summary of the text provided."));
            }
          }),
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, handler) => {
          if (event === "close") {
            handler(0);
          }
        }),
        kill: vi.fn(),
      };

      vi.spyOn(childProcess, "spawn").mockReturnValue(mockProc as unknown as ChildProcess);

      // Mock validateProvider to avoid actual provider check
      vi.mock("./providers.js", () => ({
        validateProvider: vi.fn().mockResolvedValue(undefined),
        getProviderConfig: vi.fn().mockReturnValue({
          name: "claude",
          displayName: "Claude",
          command: "claude",
          args: ["-p"],
        }),
      }));

      const result = await generateCommandContent(
        "summarize",
        "Create concise summaries of long text",
        "Use cases: articles, essays, documents",
        "claude"
      );

      expect(result).toBe("Generate a summary of the text provided.");
      expect(mockProc.stdin.write).toHaveBeenCalled();
      expect(mockProc.stdin.end).toHaveBeenCalled();
    });

    it("should remove markdown code fences from response", async () => {
      const mockProc = {
        stdin: { write: vi.fn(), end: vi.fn() },
        stdout: {
          setEncoding: vi.fn(),
          on: vi.fn((event, handler) => {
            if (event === "data") {
              handler(Buffer.from("```\nGenerate a summary of the text provided.\n```"));
            }
          }),
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, handler) => {
          if (event === "close") {
            handler(0);
          }
        }),
        kill: vi.fn(),
      };

      vi.spyOn(childProcess, "spawn").mockReturnValue(mockProc as unknown as ChildProcess);

      const result = await generateCommandContent("test", "Test purpose", "", "claude");

      expect(result).toBe("Generate a summary of the text provided.");
      expect(result).not.toContain("```");
    });

    it("should remove json code fences", async () => {
      const mockProc = {
        stdin: { write: vi.fn(), end: vi.fn() },
        stdout: {
          setEncoding: vi.fn(),
          on: vi.fn((event, handler) => {
            if (event === "data") {
              handler(Buffer.from('```json\n{\n  "name": "test"\n}\n```'));
            }
          }),
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, handler) => {
          if (event === "close") {
            handler(0);
          }
        }),
        kill: vi.fn(),
      };

      vi.spyOn(childProcess, "spawn").mockReturnValue(mockProc as unknown as ChildProcess);

      const result = await generateCommandContent("test", "Test purpose", "", "claude");

      expect(result).toBe('{\n  "name": "test"\n}');
    });

    it("should throw error if provider validation fails", async () => {
      // This test expects validateProvider to throw
      const mockError = new Error("Provider not installed");

      vi.mock("./providers.js", () => ({
        validateProvider: vi.fn().mockRejectedValue(mockError),
      }));

      await expect(generateCommandContent("test", "Test purpose", "", "invalid")).rejects.toThrow();
    });

    it("should throw error if provider process exits with error code", async () => {
      const mockProc = {
        stdin: { write: vi.fn(), end: vi.fn() },
        stdout: {
          setEncoding: vi.fn(),
          on: vi.fn(),
        },
        stderr: {
          on: vi.fn((event, handler) => {
            if (event === "data") {
              handler(Buffer.from("Provider error"));
            }
          }),
        },
        on: vi.fn((event, handler) => {
          if (event === "close") {
            handler(1);
          }
        }),
        kill: vi.fn(),
      };

      vi.spyOn(childProcess, "spawn").mockReturnValue(mockProc as unknown as ChildProcess);

      await expect(generateCommandContent("test", "Test purpose", "", "claude")).rejects.toThrow(
        "Provider error"
      );
    });

    it("should include examples in generation prompt", async () => {
      const mockProc = {
        stdin: { write: vi.fn(), end: vi.fn() },
        stdout: {
          setEncoding: vi.fn(),
          on: vi.fn((event, handler) => {
            if (event === "data") {
              handler(Buffer.from("Generated prompt"));
            }
          }),
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, handler) => {
          if (event === "close") {
            handler(0);
          }
        }),
        kill: vi.fn(),
      };

      vi.spyOn(childProcess, "spawn").mockReturnValue(mockProc as unknown as ChildProcess);

      await generateCommandContent("test", "Test purpose", "Example 1, Example 2", "claude");

      const writeCall = mockProc.stdin.write.mock.calls[0][0];
      expect(writeCall).toContain("Example 1, Example 2");
    });
  });

  describe("generateTemplateFromVault", () => {
    it("should generate template from vault structure", async () => {
      const mockProc = {
        stdin: { write: vi.fn(), end: vi.fn() },
        stdout: {
          setEncoding: vi.fn(),
          on: vi.fn((event, handler) => {
            if (event === "data") {
              handler(
                Buffer.from('{"name": "music-vault", "description": "Music collection template"}')
              );
            }
          }),
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, handler) => {
          if (event === "close") {
            handler(0);
          }
        }),
        kill: vi.fn(),
      };

      vi.spyOn(childProcess, "spawn").mockReturnValue(mockProc as unknown as ChildProcess);

      const result = await generateTemplateFromVault(
        "music-vault",
        '{"commands": ["analyze", "compare"]}',
        "claude"
      );

      expect(result).toContain("music-vault");
      expect(result).toContain("description");
    });

    it("should validate JSON structure in template", async () => {
      const mockProc = {
        stdin: { write: vi.fn(), end: vi.fn() },
        stdout: {
          setEncoding: vi.fn(),
          on: vi.fn((event, handler) => {
            if (event === "data") {
              handler(Buffer.from('```json\n{"name": "test-template"}\n```'));
            }
          }),
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, handler) => {
          if (event === "close") {
            handler(0);
          }
        }),
        kill: vi.fn(),
      };

      vi.spyOn(childProcess, "spawn").mockReturnValue(mockProc as unknown as ChildProcess);

      const result = await generateTemplateFromVault("test", "{}", "claude");

      expect(result).toBe('{"name": "test-template"}');
    });

    it("should include vault name in generation prompt", async () => {
      const mockProc = {
        stdin: { write: vi.fn(), end: vi.fn() },
        stdout: {
          setEncoding: vi.fn(),
          on: vi.fn((event, handler) => {
            if (event === "data") {
              handler(Buffer.from("{}"));
            }
          }),
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, handler) => {
          if (event === "close") {
            handler(0);
          }
        }),
        kill: vi.fn(),
      };

      vi.spyOn(childProcess, "spawn").mockReturnValue(mockProc as unknown as ChildProcess);

      await generateTemplateFromVault("my-vault", "{}", "claude");

      const writeCall = mockProc.stdin.write.mock.calls[0][0];
      expect(writeCall).toContain("my-vault");
    });
  });

  describe("generateCommandSuggestions", () => {
    it("should generate suggestions from session history", async () => {
      const mockProc = {
        stdin: { write: vi.fn(), end: vi.fn() },
        stdout: {
          setEncoding: vi.fn(),
          on: vi.fn((event, handler) => {
            if (event === "data") {
              handler(Buffer.from('[{"name": "analyze", "confidence": 0.9}]'));
            }
          }),
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, handler) => {
          if (event === "close") {
            handler(0);
          }
        }),
        kill: vi.fn(),
      };

      vi.spyOn(childProcess, "spawn").mockReturnValue(mockProc as unknown as ChildProcess);

      const result = await generateCommandSuggestions(
        "10 sessions, mostly music analysis",
        "claude"
      );

      expect(result).toContain("analyze");
      expect(result).toContain("0.9");
    });

    it("should format suggestions as JSON array", async () => {
      const mockProc = {
        stdin: { write: vi.fn(), end: vi.fn() },
        stdout: {
          setEncoding: vi.fn(),
          on: vi.fn((event, handler) => {
            if (event === "data") {
              handler(Buffer.from('```json\n[{"name": "cmd1"}, {"name": "cmd2"}]\n```'));
            }
          }),
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, handler) => {
          if (event === "close") {
            handler(0);
          }
        }),
        kill: vi.fn(),
      };

      vi.spyOn(childProcess, "spawn").mockReturnValue(mockProc as unknown as ChildProcess);

      const result = await generateCommandSuggestions("Session history", "claude");

      expect(result).toBe('[{"name": "cmd1"}, {"name": "cmd2"}]');
    });

    it("should include session history in prompt", async () => {
      const mockProc = {
        stdin: { write: vi.fn(), end: vi.fn() },
        stdout: {
          setEncoding: vi.fn(),
          on: vi.fn((event, handler) => {
            if (event === "data") {
              handler(Buffer.from("[]"));
            }
          }),
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, handler) => {
          if (event === "close") {
            handler(0);
          }
        }),
        kill: vi.fn(),
      };

      vi.spyOn(childProcess, "spawn").mockReturnValue(mockProc as unknown as ChildProcess);

      const historyText = "Recent sessions: music analysis, text summarization";
      await generateCommandSuggestions(historyText, "claude");

      const writeCall = mockProc.stdin.write.mock.calls[0][0];
      expect(writeCall).toContain(historyText);
    });
  });

  describe("error handling", () => {
    it("should handle provider spawn errors", async () => {
      const mockError = new Error("ENOENT: command not found");
      vi.spyOn(childProcess, "spawn").mockImplementation(() => {
        const proc = {
          stdin: { write: vi.fn(), end: vi.fn() },
          stdout: { setEncoding: vi.fn(), on: vi.fn() },
          stderr: { on: vi.fn() },
          on: vi.fn((event, handler) => {
            if (event === "error") {
              handler(mockError);
            }
          }),
          kill: vi.fn(),
        } as unknown as ChildProcess;
        return proc;
      });

      await expect(generateCommandContent("test", "Test", "", "claude")).rejects.toThrow(
        "Failed to execute"
      );
    });

    it("should handle timeout gracefully", async () => {
      vi.useFakeTimers();

      const mockProc = {
        stdin: { write: vi.fn(), end: vi.fn() },
        stdout: {
          setEncoding: vi.fn(),
          on: vi.fn(),
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, _handler) => {
          if (event === "close") {
            // Simulate never closing
          }
        }),
        kill: vi.fn(),
      };

      vi.spyOn(childProcess, "spawn").mockReturnValue(mockProc as unknown as ChildProcess);

      const promise = generateCommandContent("test", "Test", "", "claude");

      vi.advanceTimersByTime(70000);

      await expect(promise).rejects.toThrow("timed out");
      vi.useRealTimers();
    });

    it("should trim whitespace from output", async () => {
      const mockProc = {
        stdin: { write: vi.fn(), end: vi.fn() },
        stdout: {
          setEncoding: vi.fn(),
          on: vi.fn((event, handler) => {
            if (event === "data") {
              handler(Buffer.from("\n\n  Generated content with extra whitespace  \n\n"));
            }
          }),
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, handler) => {
          if (event === "close") {
            handler(0);
          }
        }),
        kill: vi.fn(),
      };

      vi.spyOn(childProcess, "spawn").mockReturnValue(mockProc as unknown as ChildProcess);

      const result = await generateCommandContent("test", "Test", "", "claude");

      expect(result).toBe("Generated content with extra whitespace");
      expect(result).not.toMatch(/^\s/);
      expect(result).not.toMatch(/\s$/);
    });
  });
});
