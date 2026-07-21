import { expect, test } from "bun:test"
import { isValidElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import type { DynamicToolUIPart } from "ai"

import type { ChatToolSignInAction } from "../src/components/tools/error-attribution"
import { ChatMcpSignInButton, Tool } from "../src/components/ui/tool"

const connectUrl = "https://connect.example.test/salesforce/start?return=chat"

test("renders compact MCP attribution in a failed chat tool row", () => {
  const toolPart: DynamicToolUIPart = {
    type: "dynamic-tool",
    toolName: "openwork-cloud_execute_capability",
    toolCallId: "call-1",
    state: "output-error",
    input: {},
    errorText: JSON.stringify({
      error: "connection_failed",
      diagnostic: { code: "MCP_HTTP_504", httpStatus: 504 },
    }),
  }

  const html = renderToStaticMarkup(<Tool toolPart={toolPart} />)

  expect(html).toContain("Remote MCP · HTTP 504")
  expect(html).toContain("Error attribution: Remote MCP · HTTP 504. Confirmed.")
  expect(html).not.toContain(">failed<")
})

test("renders an inline reconnect button when Cloud capability discovery finds expired credentials", () => {
  const toolPart: DynamicToolUIPart = {
    type: "dynamic-tool",
    toolName: "openwork-cloud_search_capabilities",
    toolCallId: "call-reconnect",
    state: "output-available",
    input: {},
    output: JSON.stringify({
      matches: [{
        kind: "connection_status",
        connectionStatus: {
          version: 1,
          kind: "connection_action",
          source: "openwork-cloud",
          connectionId: "emc_knowledge",
          connectionName: "Knowledge Hub",
          authType: "oauth",
          credentialMode: "per_member",
          state: "reauth_required",
          actor: "member",
          action: {
            type: "reconnect",
            surface: "openwork_your_connections",
            retry: "search_capabilities",
          },
        },
      }],
    }),
  }

  const html = renderToStaticMarkup(
    <Tool toolPart={toolPart} onReconnect={async () => "connected"} />,
  )

  expect(html).toContain("Reconnect required")
  expect(html).toContain('aria-label="Reconnect Knowledge Hub"')
  expect(html).toContain("Reconnect</button>")
  expect(html).toContain("bg-amber-3/60")
  expect(html).toContain('data-testid="chat-mcp-reconnect-action"')
})

test("renders one structured sign-in action only for an authorization-required Cloud result", () => {
  const toolPart: DynamicToolUIPart = {
    type: "dynamic-tool",
    toolName: "openwork-cloud_execute_capability",
    toolCallId: "call-signin",
    state: "output-error",
    input: {},
    errorText: JSON.stringify({
      error: "authorization_required",
      data: { connect_url: connectUrl, provider: "salesforce" },
    }),
  }
  let openCalls = 0

  const html = renderToStaticMarkup(
    <Tool
      toolPart={toolPart}
      onOpenSignIn={async () => { openCalls += 1 }}
      onRetry={() => undefined}
    />,
  )

  expect(openCalls).toBe(0)
  expect(html).toContain('data-testid="chat-mcp-signin-action"')
  expect(html).toContain(`href="${connectUrl.replaceAll("&", "&amp;")}"`)
  expect(html).toContain('rel="noreferrer noopener"')
  expect(html).toContain("Sign in to salesforce")
  expect(html.match(/data-testid="chat-mcp-signin-action"/g)?.length).toBe(1)
})

test("does not render the structured sign-in action for an unsafe URL", () => {
  const toolPart: DynamicToolUIPart = {
    type: "dynamic-tool",
    toolName: "openwork-cloud_execute_capability",
    toolCallId: "call-unsafe-signin",
    state: "output-error",
    input: {},
    errorText: JSON.stringify({
      error: "authorization_required",
      data: { connect_url: "javascript:alert(1)", provider: "salesforce" },
    }),
  }

  const html = renderToStaticMarkup(
    <Tool toolPart={toolPart} onOpenSignIn={async () => undefined} />,
  )

  expect(html).not.toContain('data-testid="chat-mcp-signin-action"')
  expect(html).toContain(">failed<")
})

test("clicking the sign-in action passes the exact URL and render never opens it", () => {
  const opened: string[] = []
  const action = {
    connectUrl,
    provider: "salesforce",
    label: "Sign in",
  } satisfies ChatToolSignInAction
  const element = ChatMcpSignInButton({
    action,
    phase: "ready",
    onOpenSignIn: async (url) => { opened.push(url) },
  })

  expect(opened).toEqual([])
  if (!isValidElement<{
    onClick: (event: { preventDefault: () => void }) => void
    render?: unknown
  }>(element)) throw new Error("Sign-in action did not render a React element")
  let prevented = false
  element.props.onClick({ preventDefault: () => { prevented = true } })

  expect(prevented).toBe(true)
  expect(opened).toEqual([connectUrl])
})

test("the opened sign-in action invokes guarded retry instead of reopening", () => {
  const opened: string[] = []
  const retried: ChatToolSignInAction[] = []
  const action = {
    connectUrl,
    provider: "salesforce",
    label: "Sign in",
  } satisfies ChatToolSignInAction
  const element = ChatMcpSignInButton({
    action,
    phase: "opened",
    onOpenSignIn: async (url) => { opened.push(url) },
    onRetry: (retryAction) => {
      if ("connectUrl" in retryAction) retried.push(retryAction)
    },
  })

  if (!isValidElement<{
    onClick: (event: { preventDefault: () => void }) => void
  }>(element)) throw new Error("Retry action did not render a React element")
  element.props.onClick({ preventDefault: () => undefined })

  expect(opened).toEqual([])
  expect(retried).toEqual([action])
})

test("renders a copy action when a tool result is available", () => {
  const toolPart: DynamicToolUIPart = {
    type: "dynamic-tool",
    toolName: "openwork-cloud_search_capabilities",
    toolCallId: "call-copy",
    state: "output-available",
    input: { query: "Notion pages" },
    output: { matches: [{ name: "searchPages" }] },
  }

  const html = renderToStaticMarkup(<Tool toolPart={toolPart} />)

  expect(html).toContain('data-testid="tool-result-copy-action"')
  expect(html).toContain('aria-label="Copy tool result"')
})

test("does not render a copy action before a tool has a result", () => {
  const toolPart: DynamicToolUIPart = {
    type: "dynamic-tool",
    toolName: "openwork-cloud_search_capabilities",
    toolCallId: "call-running",
    state: "input-available",
    input: { query: "Notion pages" },
  }

  const html = renderToStaticMarkup(<Tool toolPart={toolPart} />)

  expect(html).not.toContain('data-testid="tool-result-copy-action"')
})
