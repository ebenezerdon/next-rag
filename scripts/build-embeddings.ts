import { SimpleVectorStore } from '../lib/vector-store'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import OpenAI from 'openai'

dotenv.config({ path: '.env.local' })

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
})

const contentDir = path.join(process.cwd(), 'content')
const vectorStore = new SimpleVectorStore(
  path.join(process.cwd(), 'mastra-vectors.json'),
)

async function getEmbeddings(text: string) {
  const response = await openai.embeddings.create({
    model: 'openai/text-embedding-3-small',
    input: text,
  })
  return response.data[0].embedding
}

async function buildEmbeddings() {
  console.log('Building embeddings...')

  const files = fs
    .readdirSync(contentDir)
    .filter((file) => file.endsWith('.md'))

  for (const file of files) {
    console.log(`Processing ${file}...`)
    const filePath = path.join(contentDir, file)
    const content = fs.readFileSync(filePath, 'utf-8')

    // Simple chunking by double newline (paragraphs)
    const chunks = content.split('\n\n').filter((c) => c.trim().length > 0)

    const vectors: number[][] = []
    const metadata: any[] = []
    const ids: string[] = []

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const embedding = await getEmbeddings(chunk)

      vectors.push(embedding)
      metadata.push({
        source: file,
        content: chunk,
      })
      ids.push(`${file}-${i}`)
    }

    if (vectors.length > 0) {
      await vectorStore.upsert(vectors, metadata, ids)
    }
  }

  console.log('Embeddings build complete!')
}

buildEmbeddings().catch(console.error)
