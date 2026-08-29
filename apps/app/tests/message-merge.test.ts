import { describe, expect, test } from "bun:test";
import type { DynamicToolUIPart, UIMessage } from "ai";

import {
  mergeSnapshotAndLiveMessages,
  mergeSnapshotIntoCachedMessages,
} from "../src/react-app/domains/session/sync/message-merge";

function message(id: string, created?: number, text = id): UIMessage {
  return {
    id,
    role: id.includes("assistant") ? "assistant" : "user",
    ...(created === undefined ? {} : { metadata: { opencode: { created } } }),
    parts: [{ type: "text", text, state: "done" }],
  };
}

function counted(messages: UIMessage[], reads: { count: number }) {
  return new Proxy(messages, {
    get(target, property, receiver) {
      if (typeof property === "string" && /^\d+$/.test(property)) reads.count += 1;
      return Reflect.get(target, property, receiver);
    },
  });
}

describe("message reconciliation", () => {
  test("merges a large cached transcript within a deterministic linear source-read budget", () => {
    const size = 2_000;
    const live = Array.from({ length: size }, (_, index) => message(`message-${index}`));
    const snapshot = live.filter((_, index) => index % 2 === 0).map((item) => message(item.id));
    const reads = { count: 0 };

    const merged = mergeSnapshotIntoCachedMessages(counted(snapshot, reads), counted(live, reads));

    expect(merged.map((item) => item.id)).toEqual(live.map((item) => item.id));
    expect(reads.count).toBeLessThan(size * 12);
  });

  test("returns the cached array and its message and part references for a semantic no-op", () => {
    const cached = [message("user-1", 1), message("assistant-1", 2)];
    const snapshot = [message("user-1", 1), message("assistant-1", 2)];

    const merged = mergeSnapshotIntoCachedMessages(snapshot, cached);

    expect(merged).toBe(cached);
    expect(merged[0]).toBe(cached[0]);
    expect(merged[0]?.parts).toBe(cached[0]?.parts);
    expect(merged[0]?.parts[0]).toBe(cached[0]?.parts[0]);
  });

  test("keeps equivalent tool parts stable when server metadata advances", () => {
    const tool: DynamicToolUIPart = {
      type: "dynamic-tool",
      toolName: "bash",
      toolCallId: "tool-1",
      state: "output-available",
      input: { command: "pwd" },
      output: "/workspace",
    };
    const live: UIMessage = {
      id: "assistant-tool",
      role: "assistant",
      metadata: { opencode: { created: 1 } },
      parts: [tool],
    };
    const snapshot: UIMessage = {
      ...live,
      metadata: { opencode: { created: 1, completed: 2 } },
      parts: [{ ...tool }],
    };

    const [merged] = mergeSnapshotIntoCachedMessages([snapshot], [live]);

    expect(merged).not.toBe(live);
    expect(merged?.parts[0]).toBe(tool);
    expect(merged?.parts).toBe(live.parts);
  });

  test("replaces optimistic duplicates once while preserving snapshot chronology", () => {
    const optimistic = message("user-optimistic", 2, "draft");
    const confirmed = message("user-optimistic", 2, "confirmed");
    const merged = mergeSnapshotAndLiveMessages(
      [message("user-before", 1), confirmed, message("assistant-after", 3)],
      [optimistic, optimistic],
      { appendLiveOnlyMessages: true },
    );

    expect(merged.map((item) => item.id)).toEqual([
      "user-before",
      "user-optimistic",
      "assistant-after",
    ]);
    expect(merged[1]?.parts[0]).toMatchObject({ text: "confirmed" });
  });

  test("deduplicates both sources and orders live-only messages by timestamp", () => {
    const merged = mergeSnapshotAndLiveMessages(
      [message("user-1", 1), message("user-1", 1), message("assistant-3", 3)],
      [message("assistant-2", 2), message("assistant-2", 2), message("assistant-4", 4)],
      { appendLiveOnlyMessages: true },
    );

    expect(merged.map((item) => item.id)).toEqual([
      "user-1",
      "assistant-2",
      "assistant-3",
      "assistant-4",
    ]);
  });
});
