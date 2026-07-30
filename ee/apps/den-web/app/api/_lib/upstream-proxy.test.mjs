import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { context, trace, TraceFlags } from "@opentelemetry/api";
import { NextRequest } from "next/server";

import { setStructuredLogSink, useJsonStdoutStructuredLogSink } from "../../../observability/runtime-logger.ts";

const previousDenApiBase = process.env.DEN_API_BASE;
const previousDenWebPublicOrigin = process.env.DEN_WEB_PUBLIC_ORIGIN;
const previousFetch = globalThis.fetch;

describe("Den upstream proxy", () => {
  let observed = null;
  let upstreamRequestCount = 0;
  let logs = [];

  beforeAll(() => {
    process.env.DEN_API_BASE = "https://den.example.test";
  });

  beforeEach(() => {
    observed = null;
    upstreamRequestCount = 0;
    logs = [];
    setStructuredLogSink({
      log(level, message, fields) {
        logs.push({ level, message, fields });
      },
    });
    globalThis.fetch = async (input, init) => {
      upstreamRequestCount += 1;
      const request = new Request(input, init);
      const url = new URL(request.url);
      observed = {
        method: request.method,
        path: `${url.pathname}${url.search}`,
        body: await request.text(),
        contentType: request.headers.get("content-type"),
        cookie: request.headers.get("cookie"),
        authorization: request.headers.get("authorization"),
        custom: request.headers.get("x-custom-proxy-test"),
        forwarded: request.headers.get("forwarded"),
        forwardedHost: request.headers.get("x-forwarded-host"),
        forwardedPrefix: request.headers.get("x-forwarded-prefix"),
        forwardedProto: request.headers.get("x-forwarded-proto"),
        traceparent: request.headers.get("traceparent"),
        tracestate: request.headers.get("tracestate"),
      };

      if (url.pathname === "/v1/compressed") {
        return new Response(JSON.stringify({ ok: true, source: "gzip" }), {
          headers: {
            "content-type": "application/json",
            "content-encoding": "gzip",
          },
        });
      }

      if (url.pathname === "/v1/error") {
        return new Response("upstream unavailable", { status: 502 });
      }

      return new Response("proxied", {
        status: 207,
        headers: {
          "content-type": "text/plain",
          "set-cookie": "sid=abc; Path=/; HttpOnly",
          "x-upstream-result": "ok",
        },
      });
    };
  });

  afterAll(() => {
    useJsonStdoutStructuredLogSink();
    globalThis.fetch = previousFetch;
    if (previousDenApiBase === undefined) {
      delete process.env.DEN_API_BASE;
    } else {
      process.env.DEN_API_BASE = previousDenApiBase;
    }
    if (previousDenWebPublicOrigin === undefined) {
      delete process.env.DEN_WEB_PUBLIC_ORIGIN;
    } else {
      process.env.DEN_WEB_PUBLIC_ORIGIN = previousDenWebPublicOrigin;
    }
  });

  const INSTANCE_ORIGIN = "https://8787-2bnptanfwxs5j8vu.daytonaproxy01.net";
  const TEST_BODY_LIMIT = 12;
  const limitedProxyOptions = { routePrefix: "/api/den", maxRequestBodyBytes: TEST_BODY_LIMIT };

  test("answers the preflight for a rotating Cloud instance origin", async () => {
    const { proxyUpstream } = await import("./upstream-proxy.ts");
    const request = new NextRequest("https://app.example.com/api/den/v1/me", {
      method: "OPTIONS",
      headers: {
        origin: INSTANCE_ORIGIN,
        "access-control-request-method": "GET",
        "access-control-request-headers": "authorization,content-type",
      },
    });

    const response = await proxyUpstream(request, [], { routePrefix: "/api/den" });

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(INSTANCE_ORIGIN);
    expect(response.headers.get("access-control-allow-credentials")).toBe("true");
    expect(response.headers.get("access-control-allow-headers")).toBe("authorization,content-type");
    expect(response.headers.get("vary")).toContain("Origin");
  });

  test("reflects the instance origin on the real response and strips cookies upstream", async () => {
    const { proxyUpstream } = await import("./upstream-proxy.ts");
    const request = new NextRequest("https://app.example.com/api/den/v1/me", {
      method: "GET",
      headers: {
        origin: INSTANCE_ORIGIN,
        authorization: "Bearer tok_instance",
        cookie: "ow_session=must_not_leak",
      },
    });

    const response = await proxyUpstream(request, [], { routePrefix: "/api/den" });

    expect(response.headers.get("access-control-allow-origin")).toBe(INSTANCE_ORIGIN);
    // The whole safety argument: an instance-origin call is bearer-only and can
    // never ride the viewer's dashboard session.
    expect(observed.cookie).toBeNull();
    expect(observed.authorization).toBe("Bearer tok_instance");
  });

  test("does not reflect a non-instance origin and keeps its cookies", async () => {
    const { proxyUpstream } = await import("./upstream-proxy.ts");
    const request = new NextRequest("https://app.example.com/api/den/v1/me", {
      method: "GET",
      headers: {
        origin: "https://evil.example.com",
        cookie: "ow_session=sess_test",
      },
    });

    const response = await proxyUpstream(request, [], { routePrefix: "/api/den" });

    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(observed.cookie).toBe("ow_session=sess_test");
  });

  test("does not reflect instance origins on the auth proxy", async () => {
    const { proxyUpstream } = await import("./upstream-proxy.ts");
    const request = new NextRequest("https://app.example.com/api/auth/session", {
      method: "GET",
      headers: { origin: INSTANCE_ORIGIN, cookie: "ow_session=sess_test" },
    });

    const response = await proxyUpstream(request, [], { routePrefix: "/api/auth", upstreamPathPrefix: "api/auth" });

    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(observed.cookie).toBe("ow_session=sess_test");
  });

  test("rejects http and lookalike hostnames", async () => {
    const { proxyUpstream } = await import("./upstream-proxy.ts");
    for (const origin of ["http://8787-x.daytonaproxy01.net", "https://daytonaproxy01.net.evil.com"]) {
      const request = new NextRequest("https://app.example.com/api/den/v1/me", {
        method: "GET",
        headers: { origin },
      });
      const response = await proxyUpstream(request, [], { routePrefix: "/api/den" });
      expect(response.headers.get("access-control-allow-origin")).toBeNull();
    }
  });

  test("passes method, path, query, body, cookies, auth, status, and headers through", async () => {
    const { proxyUpstream } = await import("./upstream-proxy.ts");
    const request = new NextRequest("https://app.example.com/api/den/v1/me?include=org", {
      method: "POST",
      headers: {
        authorization: "Bearer tok_test",
        cookie: "ow_session=sess_test",
        "content-type": "application/json",
        "x-custom-proxy-test": "kept",
      },
      body: JSON.stringify({ ok: true }),
    });

    const response = await proxyUpstream(request, [], { routePrefix: "/api/den" });

    expect(observed).toEqual({
      method: "POST",
      path: "/v1/me?include=org",
      body: JSON.stringify({ ok: true }),
      contentType: "application/json",
      cookie: "ow_session=sess_test",
      authorization: "Bearer tok_test",
      custom: "kept",
      forwarded: null,
      forwardedHost: "app.example.com",
      forwardedPrefix: "/api/den",
      forwardedProto: "https",
      traceparent: null,
      tracestate: null,
    });
    expect(response.status).toBe(207);
    expect(response.headers.get("x-upstream-result")).toBe("ok");
    expect(response.headers.get("set-cookie")).toContain("sid=abc");
    expect(await response.text()).toBe("proxied");
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      level: "info",
      message: "den-web upstream proxy completed",
      fields: {
        route_prefix: "/api/den",
        method: "POST",
        upstream_path: "/v1/me",
        status: 207,
      },
    });
    expect(typeof logs[0].fields.duration_ms).toBe("number");
    const serializedLog = JSON.stringify(logs[0]);
    expect(serializedLog).not.toContain("include=org");
    expect(serializedLog).not.toContain("tok_test");
    expect(serializedLog).not.toContain("sess_test");
    expect(serializedLog).not.toContain(JSON.stringify({ ok: true }));
  });

  test("rejects an oversized declared body before contacting Den", async () => {
    const { proxyUpstream } = await import("./upstream-proxy.ts");
    const request = new NextRequest("https://app.example.com/api/den/v1/me", {
      method: "POST",
      headers: {
        "content-length": String(TEST_BODY_LIMIT + 1),
        "content-type": "application/json",
        "x-request-id": "declared-limit-request",
        authorization: "Bearer must-not-log",
        origin: INSTANCE_ORIGIN,
      },
      body: "{}",
    });

    const response = await proxyUpstream(request, [], limitedProxyOptions);

    expect(response.status).toBe(413);
    expect(response.headers.get("x-request-id")).toBe("declared-limit-request");
    expect(response.headers.get("access-control-allow-origin")).toBe(INSTANCE_ORIGIN);
    expect(await response.json()).toEqual({
      error: "request_too_large",
      requestId: "declared-limit-request",
      maxBytes: TEST_BODY_LIMIT,
      declaredBytes: TEST_BODY_LIMIT + 1,
    });
    expect(upstreamRequestCount).toBe(0);
    expect(observed).toBeNull();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      level: "warn",
      message: "den-web upstream proxy rejected request body",
      fields: {
        route_prefix: "/api/den",
        method: "POST",
        status: 413,
        max_bytes: TEST_BODY_LIMIT,
        declared_bytes: TEST_BODY_LIMIT + 1,
      },
    });
    expect(JSON.stringify(logs[0])).not.toContain("must-not-log");
  });

  test("stops an oversized chunked body and does not contact Den", async () => {
    const { proxyUpstream } = await import("./upstream-proxy.ts");
    const encoder = new TextEncoder();
    let cancelled = false;
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode("12345678"));
        controller.enqueue(encoder.encode("90123"));
        controller.enqueue(encoder.encode("secret multipart filename.png"));
      },
      cancel() {
        cancelled = true;
      },
    });
    const request = new NextRequest("https://app.example.com/api/den/v1/me", {
      method: "POST",
      headers: { "x-request-id": "chunked-limit-request" },
      body,
      duplex: "half",
    });
    expect(request.headers.get("content-length")).toBeNull();

    const response = await proxyUpstream(request, [], limitedProxyOptions);

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({
      error: "request_too_large",
      requestId: "chunked-limit-request",
      maxBytes: TEST_BODY_LIMIT,
      observedBytes: TEST_BODY_LIMIT + 1,
    });
    expect(cancelled).toBe(true);
    expect(upstreamRequestCount).toBe(0);
    expect(observed).toBeNull();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      level: "warn",
      message: "den-web upstream proxy rejected request body",
      fields: {
        route_prefix: "/api/den",
        method: "POST",
        status: 413,
        max_bytes: TEST_BODY_LIMIT,
        observed_bytes: TEST_BODY_LIMIT + 1,
      },
    });
    const serializedLog = JSON.stringify(logs[0]);
    expect(serializedLog).not.toContain("secret");
    expect(serializedLog).not.toContain("filename.png");
  });

  test("accepts request bodies exactly at and immediately below the limit", async () => {
    const { proxyUpstream } = await import("./upstream-proxy.ts");

    for (const size of [TEST_BODY_LIMIT - 1, TEST_BODY_LIMIT]) {
      const body = "x".repeat(size);
      const request = new NextRequest("https://app.example.com/api/den/v1/me", {
        method: "POST",
        headers: { "content-length": String(size) },
        body,
      });

      const response = await proxyUpstream(request, [], limitedProxyOptions);

      expect(response.status).toBe(207);
      expect(observed.body).toBe(body);
    }
    expect(upstreamRequestCount).toBe(2);
  });

  test("continues to proxy ordinary multipart requests without logging their contents", async () => {
    const { proxyUpstream } = await import("./upstream-proxy.ts");
    const body = new FormData();
    body.set("logo", new File(["multipart-private-content"], "private-brand-name.png", { type: "image/png" }));
    const request = new NextRequest("https://app.example.com/api/den/v1/org/brand-assets", {
      method: "POST",
      body,
    });

    const response = await proxyUpstream(request, [], { routePrefix: "/api/den" });

    expect(response.status).toBe(207);
    expect(observed.contentType).toStartWith("multipart/form-data; boundary=");
    expect(observed.body).toContain("private-brand-name.png");
    expect(observed.body).toContain("multipart-private-content");
    expect(upstreamRequestCount).toBe(1);
    const serializedLog = JSON.stringify(logs[0]);
    expect(serializedLog).not.toContain("private-brand-name.png");
    expect(serializedLog).not.toContain("multipart-private-content");
  });

  test("drops content-encoding after upstream fetch decompresses the body", async () => {
    const { proxyUpstream } = await import("./upstream-proxy.ts");
    const request = new NextRequest("https://app.example.com/api/den/v1/compressed");

    const response = await proxyUpstream(request, [], { routePrefix: "/api/den" });

    expect(response.headers.get("content-encoding")).toBeNull();
    expect(await response.json()).toEqual({ ok: true, source: "gzip" });
  });

  test("logs non-ok upstream completions without credentials or query strings", async () => {
    const { proxyUpstream } = await import("./upstream-proxy.ts");
    const request = new NextRequest("https://app.example.com/api/den/v1/error?token=secret", {
      headers: {
        authorization: "Bearer should-not-log",
        cookie: "ow_session=should-not-log",
      },
    });

    const response = await proxyUpstream(request, [], { routePrefix: "/api/den" });

    expect(response.status).toBe(502);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      level: "warn",
      message: "den-web upstream proxy completed",
      fields: {
        route_prefix: "/api/den",
        method: "GET",
        upstream_path: "/v1/error",
        status: 502,
      },
    });
    const serializedLog = JSON.stringify(logs[0]);
    expect(serializedLog).not.toContain("token=secret");
    expect(serializedLog).not.toContain("should-not-log");
  });

  test("continues W3C trace context into upstream requests", async () => {
    const { proxyUpstream } = await import("./upstream-proxy.ts");
    const traceparent = "00-0af7651916cd43dd8448eb211c80319c-b9c7c989f97918e1-01";
    const tracestate = "vendor=value";
    const request = new NextRequest("https://app.example.com/api/den/v1/me", {
      headers: { traceparent, tracestate },
    });

    await proxyUpstream(request, [], { routePrefix: "/api/den" });

    expect(observed.traceparent).toBe(traceparent);
    expect(observed.tracestate).toBe(tracestate);
  });

  test("overwrites spoofable forwarded headers", async () => {
    const { proxyUpstream } = await import("./upstream-proxy.ts");
    const request = new NextRequest("https://app.example.com/api/den/v1/me", {
      headers: {
        forwarded: "host=evil.example;proto=http",
        "x-forwarded-host": "evil.example",
        "x-forwarded-prefix": "/evil",
        "x-forwarded-proto": "http",
      },
    });

    await proxyUpstream(request, [], { routePrefix: "/api/den" });

    expect(observed.forwardedHost).toBe("app.example.com");
    expect(observed.forwardedPrefix).toBe("/api/den");
    expect(observed.forwardedProto).toBe("https");
    expect(observed.forwarded).toBeNull();
  });

  test("injects the active W3C trace context into upstream requests", async () => {
    const { proxyUpstream } = await import("./upstream-proxy.ts");
    const request = new NextRequest("https://app.example.com/api/den/v1/me");
    const spanContext = {
      traceId: "0af7651916cd43dd8448eb211c80319c",
      spanId: "b9c7c989f97918e1",
      traceFlags: TraceFlags.SAMPLED,
    };

    const activeContext = trace.setSpanContext(context.active(), spanContext);
    const contextManager = {
      active: () => activeContext,
      with: (nextContext, callback, thisArg, ...args) => callback.apply(thisArg, args),
      bind: (nextContext, target) => target,
      enable: () => contextManager,
      disable: () => contextManager,
    };

    context.setGlobalContextManager(contextManager);
    try {
      await proxyUpstream(request, [], { routePrefix: "/api/den" });
    } finally {
      context.disable();
    }

    expect(observed.traceparent).toBe("00-0af7651916cd43dd8448eb211c80319c-b9c7c989f97918e1-01");
  });
});
