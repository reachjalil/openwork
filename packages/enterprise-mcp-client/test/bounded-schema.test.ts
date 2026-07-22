import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  assertEnterpriseMcpSchema,
  ENTERPRISE_MCP_TOOL_SCHEMA_COMPOSITION_BRANCH_LIMIT,
  ENTERPRISE_MCP_TOOL_SCHEMA_REFERENCE_DEPTH_LIMIT,
  EnterpriseMcpCatalogError,
  extractEnterpriseMcpHeaderParameterBindings,
} from "../src/index.js"

describe("bounded JSON Schema 2020-12", () => {
  it("preserves bounded composition, conditionals, definitions, and local references", () => {
    assert.doesNotThrow(() => assertEnterpriseMcpSchema({
      type: "object",
      $defs: {
        query: {
          type: "object",
          properties: { text: { type: "string", minLength: 1, maxLength: 200 } },
          required: ["text"],
        },
      },
      properties: {
        query: { $ref: "#/$defs/query" },
        mode: { oneOf: [{ const: "fast" }, { const: "complete" }] },
      },
      if: { properties: { mode: { const: "complete" } } },
      then: { required: ["query"] },
    }))
  })

  it("rejects external, unresolved, and cyclic references", () => {
    for (const [schema, code] of [
      [{ $ref: "https://schemas.example.test/tool.json" }, "MCP_CATALOG_SCHEMA_EXTERNAL_REFERENCE"],
      [{ $ref: "#/$defs/missing", $defs: {} }, "MCP_CATALOG_SCHEMA_REFERENCE_UNRESOLVED"],
      [{ $ref: "#/$defs/node", $defs: { node: { $ref: "#/$defs/node" } } }, "MCP_CATALOG_SCHEMA_REFERENCE_CYCLE"],
    ]) {
      assert.throws(
        () => assertEnterpriseMcpSchema(schema),
        (error: unknown) => error instanceof EnterpriseMcpCatalogError && error.code === code,
      )
    }
  })

  it("rejects excessive composition fan-out", () => {
    assert.throws(
      () => assertEnterpriseMcpSchema({
        oneOf: Array.from(
          { length: ENTERPRISE_MCP_TOOL_SCHEMA_COMPOSITION_BRANCH_LIMIT + 1 },
          (_value, index) => ({ const: index }),
        ),
      }),
      (error: unknown) => error instanceof EnterpriseMcpCatalogError
        && error.code === "MCP_CATALOG_SCHEMA_COMPOSITION_LIMIT",
    )
  })

  it("extracts nested and referenced x-mcp-header annotations without rewriting the schema", () => {
    const schema = {
      type: "object",
      $defs: {
        routing: {
          type: "object",
          properties: {
            region: { type: "string", "x-mcp-header": "Region" },
          },
        },
      },
      properties: {
        tenant: { type: "string", "x-mcp-header": "Tenant" },
        routing: { $ref: "#/$defs/routing" },
      },
    }
    const before = JSON.stringify(schema)
    assert.deepEqual(extractEnterpriseMcpHeaderParameterBindings(schema), [
      { parameterPath: ["tenant"], headerName: "Tenant" },
      { parameterPath: ["routing", "region"], headerName: "Region" },
    ])
    assert.equal(JSON.stringify(schema), before)
  })

  it("rejects invalid, non-primitive, floating-point, and duplicate routing headers", () => {
    for (const schema of [
      {
        type: "object",
        properties: { value: { type: "string", "x-mcp-header": "bad header" } },
      },
      {
        type: "object",
        properties: { value: { type: "number", "x-mcp-header": "Value" } },
      },
      {
        type: "object",
        properties: { value: { type: "object", "x-mcp-header": "Value" } },
      },
      {
        type: "object",
        properties: {
          left: { type: "string", "x-mcp-header": "Region" },
          right: { type: "string", "x-mcp-header": "REGION" },
        },
      },
    ]) {
      assert.throws(
        () => extractEnterpriseMcpHeaderParameterBindings(schema),
        (error: unknown) => error instanceof EnterpriseMcpCatalogError
          && error.code === "MCP_CATALOG_TOOL_ROUTING_HEADER_INVALID",
      )
    }
  })

  it("validates a heavily shared reference graph in near-linear time", () => {
    // Every property `$ref`s one large shared definition. All limits (byte,
    // node, depth) are satisfied, but recreating the validated-subtree set per
    // reference re-walked the shared definition once per reference. This 4000
    // x 4000 shape is ~16M redundant node visits (multiple seconds) before the
    // fix and a single subtree walk afterwards.
    const shared: { type: string; properties: Record<string, unknown> } = {
      type: "object",
      properties: {},
    }
    for (let index = 0; index < 4_000; index += 1) {
      shared.properties[`p${index}`] = { type: "string" }
    }
    const root: {
      type: string
      $defs: Record<string, unknown>
      properties: Record<string, unknown>
    } = { type: "object", $defs: { shared }, properties: {} }
    for (let index = 0; index < 4_000; index += 1) {
      root.properties[`r${index}`] = { $ref: "#/$defs/shared" }
    }

    const startedNs = process.hrtime.bigint()
    assert.doesNotThrow(() => assertEnterpriseMcpSchema(root))
    const elapsedMs = Number(process.hrtime.bigint() - startedNs) / 1e6
    assert.ok(
      elapsedMs < 2_000,
      `shared-reference validation must stay near-linear (took ${elapsedMs.toFixed(0)}ms)`,
    )
  })

  it("preserves the reference-depth limit when a descendant target is cached first", () => {
    // Measurement visits object values in stack order, so these ascending
    // definitions discover the deepest target before the chain root. A shared
    // boolean cache would then skip that completed descendant when validating
    // the longer chain and incorrectly accept the schema.
    const $defs: Record<string, unknown> = {}
    for (let depth = 0; depth <= ENTERPRISE_MCP_TOOL_SCHEMA_REFERENCE_DEPTH_LIMIT + 2; depth += 1) {
      $defs[`level${depth}`] = depth === ENTERPRISE_MCP_TOOL_SCHEMA_REFERENCE_DEPTH_LIMIT + 2
        ? { type: "string" }
        : { $ref: `#/$defs/level${depth + 1}` }
    }

    assert.throws(
      () => assertEnterpriseMcpSchema({ type: "object", $defs }),
      (error: unknown) => error instanceof EnterpriseMcpCatalogError
        && error.code === "MCP_CATALOG_SCHEMA_REFERENCE_DEPTH_LIMIT",
    )
  })

  it("extracts routing bindings from a doubling reference graph without exponential fan-out", () => {
    // Each layer references the next layer twice. Without barren-reference
    // memoization this is 2^depth traversals of annotation-free subtrees
    // (unbounded CPU) even though the schema itself is tiny and acyclic.
    const $defs: Record<string, unknown> = {}
    const layers = 30
    for (let layer = layers; layer >= 1; layer -= 1) {
      $defs[`l${layer}`] = layer === layers
        ? { type: "string" }
        : {
            type: "object",
            properties: {
              a: { $ref: `#/$defs/l${layer + 1}` },
              b: { $ref: `#/$defs/l${layer + 1}` },
            },
          }
    }
    const schema = { type: "object", $defs, properties: { start: { $ref: "#/$defs/l1" } } }

    const startedNs = process.hrtime.bigint()
    const bindings = extractEnterpriseMcpHeaderParameterBindings(schema)
    const elapsedMs = Number(process.hrtime.bigint() - startedNs) / 1e6
    assert.deepEqual(bindings, [])
    assert.ok(
      elapsedMs < 2_000,
      `routing extraction must not fan out exponentially (took ${elapsedMs.toFixed(0)}ms)`,
    )
  })

  it("still surfaces a routing annotation that hides behind a shared reference", () => {
    // Guards the barren-reference memoization: a reference whose closure does
    // contain an annotation must never be treated as barren.
    const schema = {
      type: "object",
      $defs: {
        routing: {
          type: "object",
          properties: { region: { type: "string", "x-mcp-header": "Region" } },
        },
      },
      properties: {
        first: { $ref: "#/$defs/routing" },
        second: { type: "object", properties: { plain: { type: "string" } } },
      },
    }
    assert.deepEqual(extractEnterpriseMcpHeaderParameterBindings(schema), [
      { parameterPath: ["first", "region"], headerName: "Region" },
    ])
  })
})
