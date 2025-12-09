import fs from 'fs'

interface VectorEntry {
  id: string
  vector: number[]
  metadata: Record<string, unknown>
}

export const loadVectors = (filePath: string): VectorEntry[] => {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(content)
  }
  return []
}

export const saveVectors = (filePath: string, data: VectorEntry[]): void => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
}

export const upsertVectors = (
  filePath: string,
  vectors: number[][],
  metadata: Record<string, unknown>[],
  ids: string[],
): void => {
  const data = loadVectors(filePath)

  for (let i = 0; i < vectors.length; i++) {
    const existingIndex = data.findIndex((item) => item.id === ids[i])
    const entry = { id: ids[i], vector: vectors[i], metadata: metadata[i] }

    if (existingIndex >= 0) {
      data[existingIndex] = entry
    } else {
      data.push(entry)
    }
  }

  saveVectors(filePath, data)
}

const cosineSimilarity = (a: number[], b: number[]): number => {
  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

export const queryVectors = (
  filePath: string,
  queryVector: number[],
  topK: number = 5,
) => {
  const data = loadVectors(filePath)

  const scored = data.map((item) => ({
    ...item,
    score: cosineSimilarity(queryVector, item.vector),
  }))

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, topK)
}
