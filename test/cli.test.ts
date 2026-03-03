import { describe, test, expect } from "bun:test"
import { sources } from "../src/sources/index.js"

describe("registry", () => {
  test("has sources registered", () => {
    const names = Object.keys(sources)
    expect(names.length).toBeGreaterThan(40)
  })

  test("all sources are functions", () => {
    for (const [name, handler] of Object.entries(sources)) {
      expect(typeof handler).toBe("function")
    }
  })

  test("contains expected source names", () => {
    const expected = [
      "baidu", "bilibili", "hackernews", "github", "weibo",
      "zhihu", "v2ex", "juejin", "36kr", "toutiao",
    ]
    for (const name of expected) {
      expect(sources).toHaveProperty(name)
    }
  })
})

describe("cli", () => {
  test("list command outputs all sources with profile all", async () => {
    const proc = Bun.spawn(["bun", "src/cli.ts", "list", "--json", "--profile", "all"], {
      cwd: import.meta.dir + "/..",
      stdout: "pipe",
    })
    const output = await new Response(proc.stdout).text()
    const names = JSON.parse(output)
    expect(Array.isArray(names)).toBe(true)
    expect(names.length).toBeGreaterThan(40)
    expect(names).toContain("hackernews")
  })

  test("list defaults to high-quality profile", async () => {
    const proc = Bun.spawn(["bun", "src/cli.ts", "list", "--json"], {
      cwd: import.meta.dir + "/..",
      stdout: "pipe",
    })
    const output = await new Response(proc.stdout).text()
    const names = JSON.parse(output)
    expect(Array.isArray(names)).toBe(true)
    expect(names.length).toBeGreaterThan(10)
    expect(names).toContain("thepaper")
    expect(names).not.toContain("weibo")
  })

  test("help command works", async () => {
    const proc = Bun.spawn(["bun", "src/cli.ts", "--help"], {
      cwd: import.meta.dir + "/..",
      stdout: "pipe",
    })
    const output = await new Response(proc.stdout).text()
    expect(output).toContain("Usage:")
  })

  test("unknown source shows error", async () => {
    const proc = Bun.spawn(["bun", "src/cli.ts", "nonexistent_xyz"], {
      cwd: import.meta.dir + "/..",
      stderr: "pipe",
    })
    const err = await new Response(proc.stderr).text()
    expect(err).toContain("Unknown source")
  })

  test("missing value for profile fails fast", async () => {
    const proc = Bun.spawn(["bun", "src/cli.ts", "list", "--profile", "--json"], {
      cwd: import.meta.dir + "/..",
      stderr: "pipe",
    })
    const err = await new Response(proc.stderr).text()
    const code = await proc.exited
    expect(code).not.toBe(0)
    expect(err).toContain("Missing value for --profile")
  })

  test("quality-rubric command returns schema json", async () => {
    const proc = Bun.spawn(["bun", "src/cli.ts", "quality-rubric", "--json"], {
      cwd: import.meta.dir + "/..",
      stdout: "pipe",
    })
    const output = await new Response(proc.stdout).text()
    const parsed = JSON.parse(output)
    expect(parsed.quality_schema_version).toBeDefined()
    expect(parsed.ai_output_schema?.properties?.decision?.enum).toContain("downrank")
  })
})

describe("fetch source", () => {
  test("hackernews returns items", async () => {
    const handler = sources["hackernews"]
    const items = await handler()
    expect(items.length).toBeGreaterThan(0)
    expect(items[0]).toHaveProperty("title")
    expect(items[0]).toHaveProperty("id")
    expect(items[0]).toHaveProperty("url")
  }, 15000)

  test("hackernews quality-signals json includes monitor fields", async () => {
    const proc = Bun.spawn(["bun", "src/cli.ts", "hackernews", "--json", "--quality-signals"], {
      cwd: import.meta.dir + "/..",
      stdout: "pipe",
    })
    const output = await new Response(proc.stdout).text()
    const parsed = JSON.parse(output)
    expect(parsed.quality_schema_version).toBeDefined()
    expect(parsed.quality_monitor).toBeDefined()
    expect(Array.isArray(parsed.items)).toBe(true)
    if (parsed.items.length > 0) {
      expect(parsed.items[0].quality_signals).toBeDefined()
      expect(parsed.items[0].quality_gate_hint).toBeDefined()
      expect(Array.isArray(parsed.items[0].quality_reasons)).toBe(true)
    }
  }, 30000)
})
