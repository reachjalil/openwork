import { afterEach, describe, expect, test } from "bun:test";
import type { UIMessage } from "ai";

import type { OpenworkSessionSnapshot } from "../src/app/lib/openwork-server";
import { deriveRenderedSessionMessages } from "../src/react-app/domains/session/surface/session-render-state";
import { mergeSnapshotIntoCachedMessages } from "../src/react-app/domains/session/sync/message-merge";
import {
  seedSessionState,
  transcriptKey,
} from "../src/react-app/domains/session/sync/session-sync";
import { reconcileTranscriptMessages } from "../src/react-app/domains/session/sync/transcript-reconcile";
import { snapshotToUIMessages } from "../src/react-app/domains/session/sync/usechat-adapter";
import { getReactQueryClient } from "../src/react-app/infra/query-client";

function snapshotWithHistory(
  sessionId = "session-render-cycle",
  content = { prompt: "First prompt", answer: "First answer" },
): OpenworkSessionSnapshot {
  return {
    session: {
      id: sessionId,
      title: "Render-cycle history",
      time: { created: 1, updated: 2 },
      version: "0",
    },
    messages: [
      { id: "historical-user", role: "user", text: content.prompt },
      { id: "historical-assistant", role: "assistant", text: content.answer },
    ].map((message, index) => ({
      info: {
        id: message.id,
        role: message.role,
        sessionID: sessionId,
        time: { created: index + 1 },
      },
      parts: [{
        id: `part-${message.id}`,
        type: "text",
        text: message.text,
        sessionID: sessionId,
        messageID: message.id,
      }],
    })),
    todos: [],
    status: { type: "idle" },
  } as unknown as OpenworkSessionSnapshot;
}

function message(id: string, role: "user" | "assistant", text: string, created: number): UIMessage {
  return {
    id,
    role,
    metadata: { opencode: { created } },
    parts: [{ type: "text", text, state: "done" }],
  };
}

function legacyMessage(id: string, text: string): UIMessage {
  return {
    id,
    role: "assistant",
    parts: [{ type: "text", text, state: "done" }],
  };
}

afterEach(() => {
  getReactQueryClient().clear();
});

describe("session render state", () => {
  test("maps a small snapshot once for seeding and rendering", () => {
    const snapshot = snapshotWithHistory();

    expect(snapshotToUIMessages(snapshot)).toBe(snapshotToUIMessages(snapshot));
  });

  test("reuses the canonical transcript array for an unchanged rehydrate", () => {
    const current = snapshotToUIMessages(snapshotWithHistory());
    const incoming = snapshotToUIMessages(snapshotWithHistory());

    expect(reconcileTranscriptMessages({
      currentMessages: current,
      snapshotMessages: incoming,
      reason: "snapshot",
    })).toBe(current);
  });

  test("does not notify transcript observers for an unchanged rehydrate", () => {
    const workspaceId = "workspace-unchanged";
    const sessionId = "session-unchanged";
    const key = transcriptKey(workspaceId, sessionId);
    seedSessionState(workspaceId, snapshotWithHistory(sessionId));
    const transcriptQuery = getReactQueryClient().getQueryCache().find({ queryKey: key, exact: true });
    let updates = 0;
    const unsubscribe = getReactQueryClient().getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.query === transcriptQuery) updates += 1;
    });

    seedSessionState(workspaceId, snapshotWithHistory(sessionId));
    unsubscribe();

    expect(updates).toBe(0);
  });

  test("batch-reconciles a large cached transcript with a bounded snapshot tail", () => {
    const current = Array.from({ length: 4_000 }, (_, index) =>
      message(`message-${index}`, index % 2 === 0 ? "user" : "assistant", `content-${index}`, index),
    );
    const snapshotTail = current.slice(-140).map((item, index) =>
      message(item.id, item.role === "user" ? "user" : "assistant", `content-${3_860 + index}`, 3_860 + index),
    );

    const reconciled = mergeSnapshotIntoCachedMessages(snapshotTail, current);

    expect(reconciled).toBe(current);
    expect(reconciled).toHaveLength(4_000);
    expect(reconciled[0]?.id).toBe("message-0");
    expect(reconciled[3_999]?.id).toBe("message-3999");
  });

  test("keeps a live message missed by the snapshot in chronological position", () => {
    const current = [
      message("message-1", "user", "first", 1),
      message("message-2", "assistant", "missed event", 2),
      message("message-3", "user", "third", 3),
    ];
    const snapshot = [
      message("message-1", "user", "first", 1),
      message("message-3", "user", "third", 3),
    ];

    expect(mergeSnapshotIntoCachedMessages(snapshot, current)).toBe(current);
  });

  test("falls back to source order for older messages without timestamps", () => {
    const current = [
      legacyMessage("message-1", "first"),
      legacyMessage("message-2", "cached-only"),
      legacyMessage("message-3", "third"),
    ];
    const snapshot = [
      legacyMessage("message-1", "first"),
      legacyMessage("message-3", "third"),
    ];

    const reconciled = mergeSnapshotIntoCachedMessages(snapshot, current);

    expect(reconciled.map((item) => item.id)).toEqual(["message-1", "message-2", "message-3"]);
  });

  test("falls back to source order when message timestamps collide", () => {
    const current = [
      message("message-1", "user", "first", 1),
      message("message-2", "assistant", "cached-only", 1),
      message("message-3", "user", "third", 1),
    ];
    const snapshot = [
      message("message-1", "user", "first", 1),
      message("message-3", "user", "third", 1),
    ];

    expect(mergeSnapshotIntoCachedMessages(snapshot, current)).toBe(current);
  });

  test("keeps snapshot hydration isolated by workspace and session", () => {
    seedSessionState("workspace-a", snapshotWithHistory("session-a", { prompt: "A prompt", answer: "A answer" }));
    seedSessionState("workspace-a", snapshotWithHistory("session-b", { prompt: "B prompt", answer: "B answer" }));
    seedSessionState("workspace-b", snapshotWithHistory("session-a", { prompt: "Other prompt", answer: "Other answer" }));

    expect(getReactQueryClient().getQueryData<UIMessage[]>(transcriptKey("workspace-a", "session-a"))?.[0]?.parts[0])
      .toMatchObject({ text: "A prompt" });
    expect(getReactQueryClient().getQueryData<UIMessage[]>(transcriptKey("workspace-a", "session-b"))?.[0]?.parts[0])
      .toMatchObject({ text: "B prompt" });
    expect(getReactQueryClient().getQueryData<UIMessage[]>(transcriptKey("workspace-b", "session-a"))?.[0]?.parts[0])
      .toMatchObject({ text: "Other prompt" });
  });

  test("preserves completed message references while the active answer advances", () => {
    const snapshot = snapshotWithHistory();
    const historicalUser = message("historical-user", "user", "First prompt", 1);
    const historicalAssistant = message("historical-assistant", "assistant", "First answer", 2);
    const activeUser = message("active-user", "user", "Second prompt", 3);
    const first = deriveRenderedSessionMessages({
      snapshot,
      transcriptState: [
        historicalUser,
        historicalAssistant,
        activeUser,
        message("active-assistant", "assistant", "chunk-1 ", 4),
      ],
    });
    const second = deriveRenderedSessionMessages({
      snapshot: snapshotWithHistory(),
      transcriptState: [
        ...first.slice(0, 3),
        message("active-assistant", "assistant", "chunk-1 chunk-2 ", 4),
      ],
    });

    expect(second[0]).toBe(first[0]);
    expect(second[1]).toBe(first[1]);
    expect(second[2]).toBe(first[2]);
    expect(second[3]).not.toBe(first[3]);
    expect(second[3]?.parts).toEqual([{ type: "text", text: "chunk-1 chunk-2 ", state: "done" }]);
  });
});
