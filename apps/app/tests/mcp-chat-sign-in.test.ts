import { describe, expect, test } from "bun:test"

import type { ChatToolSignInAction } from "../src/components/tools/error-attribution"
import {
  mcpChatRetryPrompt,
  openMcpChatSignIn,
} from "../src/react-app/domains/session/surface/mcp-chat-sign-in"

describe("chat MCP provider sign-in", () => {
  test("opens the exact connect URL through the desktop URL dependency", async () => {
    const connectUrl = "https://connect.example.test/salesforce/start?return=chat"
    const opened: string[] = []

    await openMcpChatSignIn(connectUrl, async (url) => { opened.push(url) })

    expect(opened).toEqual([connectUrl])
  })

  test("builds a guarded retry draft without any send side effect", () => {
    const action = {
      connectUrl: "https://connect.example.test/salesforce/start",
      provider: "salesforce",
      label: "Sign in",
    } satisfies ChatToolSignInAction
    let sends = 0

    const prompt = mcpChatRetryPrompt(action)

    expect(prompt).toContain("I finished signing in to salesforce")
    expect(prompt).toContain("Search for the capability again")
    expect(prompt).toContain("Before repeating any write action")
    expect(sends).toBe(0)
  })
})
