import { describe, expect, test } from "bun:test"
import { getSourcesByProfile, isSourceProfile } from "../src/source-profiles.js"

describe("source profiles", () => {
  const all = [
    "weibo",
    "thepaper",
    "zhihu",
    "hackernews",
    "linuxdo",
    "toutiao",
    "jin10",
  ]

  test("validates profile names", () => {
    expect(isSourceProfile("high-quality")).toBe(true)
    expect(isSourceProfile("trending")).toBe(true)
    expect(isSourceProfile("all")).toBe(true)
    expect(isSourceProfile("unknown")).toBe(false)
  })

  test("returns all sources for all profile", () => {
    expect(getSourcesByProfile("all", all)).toEqual([...all].sort())
  })

  test("high-quality profile filters out trending-only sources", () => {
    const list = getSourcesByProfile("high-quality", all)
    expect(list).toContain("thepaper")
    expect(list).toContain("jin10")
    expect(list).not.toContain("weibo")
    expect(list).not.toContain("toutiao")
  })

  test("trending profile contains trending sources", () => {
    const list = getSourcesByProfile("trending", all)
    expect(list).toContain("weibo")
    expect(list).toContain("toutiao")
    expect(list).not.toContain("jin10")
  })
})
