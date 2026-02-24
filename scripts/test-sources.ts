#!/usr/bin/env bun
import { sources } from "../src/sources/index.js"

const results: { source: string; status: "ok" | "fail"; error?: string }[] = []
const allSources = Object.keys(sources).sort()

console.log(`Testing ${allSources.length} sources...\n`)

for (const source of allSources) {
  process.stdout.write(`Testing: ${source}... `)
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)
    
    await Promise.race([
      sources[source](),
      new Promise((_, reject) => 
        controller.signal.addEventListener('abort', () => reject(new Error('Timeout')))
      )
    ])
    
    clearTimeout(timeout)
    results.push({ source, status: "ok" })
    console.log("OK")
  } catch (err: any) {
    results.push({ source, status: "fail", error: err.message })
    console.log(`FAIL: ${err.message}`)
  }
}

const ok = results.filter(r => r.status === "ok").map(r => r.source)
const fail = results.filter(r => r.status === "fail")

console.log(`\n${"=".repeat(60)}`)
console.log(`\nResults: ${ok.length}/${results.length} working`)
console.log(`\nFailed sources (${fail.length}):`)
for (const f of fail) {
  console.log(`  - ${f.source}: ${f.error}`)
}
