import { afterEach, describe, expect, test } from "bun:test";

import type { OpenworkSessionSnapshot } from "../src/app/lib/openwork-server";
import { getReactQueryClient } from "../src/react-app/infra/query-client";
import {
  seedSessionState,
  transcriptKey,
} from "../src/react-app/domains/session/sync/session-sync";
import { snapshotToUIMessages } from "../src/react-app/domains/session/sync/usechat-adapter";

function snapshot(): OpenworkSessionSnapshot {
  return {
    session: {
      id: "session-no-op",
      title: "No-op",
      time: { created: 1, updated: 2 },
      version: "0",
    },
    messages: [{
      info: {
        id: "user-1",
        role: "user",
        sessionID: "session-no-op",
        time: { created: 1 },
      },
      parts: [{
        id: "part-1",
        type: "text",
        text: "hello",
        sessionID: "session-no-op",
        messageID: "user-1",
      }],
    }],
    todos: [],
    status: { type: "idle" },
  } as unknown as OpenworkSessionSnapshot;
}

afterEach(() => getReactQueryClient().clear());

describe("session snapshot reconciliation publication", () => {
  test("does not publish an equivalent transcript rehydration", () => {
    const queryClient = getReactQueryClient();
    const nextSnapshot = snapshot();
    const key = transcriptKey("workspace-no-op", nextSnapshot.session.id);
    const existing = snapshotToUIMessages(nextSnapshot);
    queryClient.setQueryData(key, existing);
    let publications = 0;
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.query.queryHash.includes("react-session-transcript")) {
        publications += 1;
      }
    });

    try {
      seedSessionState("workspace-no-op", nextSnapshot);
      expect(queryClient.getQueryData(key)).toBe(existing);
      expect(publications).toBe(0);
    } finally {
      unsubscribe();
    }
  });
});
