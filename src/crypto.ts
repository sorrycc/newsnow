import { createHash } from "node:crypto"

export async function md5(input: string): Promise<string> {
  return createHash("md5").update(input).digest("hex")
}

export async function myCrypto(data: string, algorithm: string): Promise<string> {
  const alg = algorithm.toLowerCase().replace("-", "")
  return createHash(alg === "sha1" ? "sha1" : alg).update(data).digest("hex")
}

export function encodeBase64(input: string): string {
  return Buffer.from(input).toString("base64")
}
