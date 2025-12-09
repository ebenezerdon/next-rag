import { MDocument } from '@mastra/rag'
import { LibSQLVector } from '@mastra/libsql'
import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// Initialize OpenAI client pointing to OpenRouter for embeddings
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
})

const contentDir = path.join(process.cwd(), 'content')

// Initialize the vector store
const vectorStore = new LibSQLVector({
  connectionUrl: `file:${path.join(process.cwd(), 'vectors.db')}`,
})

// Generate embeddings using OpenRouter
const getEmbeddings = async (texts: string[]): Promise<number[][]> => {
  const embeddings: number[][] = []

  // Process in batches to avoid rate limits
  for (const text of texts) {
    const response = await openai.embeddings.create({
      model: 'openai/text-embedding-3-small',
      input: text,
    })
    embeddings.push(response.data[0].embedding)
  }

  return embeddings
}

const buildEmbeddings = async () => {
  console.log('Building embeddings with Mastra...')

  // Read all markdown files
  const files = fs
    .readdirSync(contentDir)
    .filter((file) => file.endsWith('.md'))

  const allChunks: { text: string; source: string }[] = []

  // Process each file using Mastra's MDocument
  for (const file of files) {
    console.log(`Processing ${file}...`)
    const filePath = path.join(contentDir, file)
    const content = fs.readFileSync(filePath, 'utf-8')

    // Create a document from the text
    const doc = MDocument.fromText(content)

    // Chunk the document using Mastra's chunking strategy
    const chunks = await doc.chunk({
      strategy: 'recursive',
      maxSize: 512,
      overlap: 50,
    })

    // Add source metadata to each chunk
    chunks.forEach((chunk) => {
      allChunks.push({
        text: chunk.text,
        source: file,
      })
    })
  }

  console.log(`Created ${allChunks.length} chunks from ${files.length} files`)

  // Generate embeddings for all chunks
  console.log('Generating embeddings...')
  const embeddings = await getEmbeddings(allChunks.map((chunk) => chunk.text))

  // Create the index if it doesn't exist
  console.log('Creating vector index...')
  await vectorStore.createIndex({
    indexName: 'embeddings',
    dimension: 1536, // text-embedding-3-small dimension
  })

  // Store embeddings in the vector database
  console.log('Storing embeddings...')
  await vectorStore.upsert({
    indexName: 'embeddings',
    vectors: embeddings,
    metadata: allChunks.map((chunk) => ({
      text: chunk.text,
      source: chunk.source,
    })),
  })

  console.log('Embeddings build complete!')
}

buildEmbeddings().catch(console.error)
