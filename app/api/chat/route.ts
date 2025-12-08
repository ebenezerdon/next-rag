import { streamText } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { SimpleVectorStore } from '@/lib/vector-store'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Initialize clients once at module level
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
})

const vectorStore = new SimpleVectorStore(
  path.join(process.cwd(), 'mastra-vectors.json'),
)

async function getRelevantContext(query: string): Promise<string> {
  const response = await openai.embeddings.create({
    model: 'openai/text-embedding-3-small',
    input: query,
  })

  const results = await vectorStore.query(response.data[0].embedding, 5)
  return results.map((r) => r.metadata.content).join('\n\n')
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop()
    const context = await getRelevantContext(lastUserMessage?.content || '')

    const systemPrompt = `You are a helpful HR assistant. Answer questions using this context from our employee handbook:

${context}

If the context doesn't contain relevant information, say so politely.`

    const result = streamText({
      model: openrouter('openai/gpt-4o-mini'),
      messages,
      system: systemPrompt,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('Chat error:', error)
    return new Response('Error processing request', { status: 500 })
  }
}
