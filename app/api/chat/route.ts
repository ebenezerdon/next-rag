import { streamText } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { queryVectors } from '@/lib/vector-store'
import OpenAI from 'openai'
import path from 'path'

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
})

const vectorStorePath = path.join(process.cwd(), 'mastra-vectors.json')

const getEmbedding = async (text: string): Promise<number[]> => {
  const response = await openai.embeddings.create({
    model: 'openai/text-embedding-3-small',
    input: text,
  })
  return response.data[0].embedding
}

const getRelevantContext = async (query: string): Promise<string> => {
  const queryVector = await getEmbedding(query)
  const results = queryVectors(vectorStorePath, queryVector, 5)

  if (results.length === 0) {
    return 'No relevant context found.'
  }

  return results.map((r) => r.metadata.content).join('\n\n---\n\n')
}

export const POST = async (request: Request) => {
  const { messages } = await request.json()
  const lastMessage = messages[messages.length - 1]

  const context = await getRelevantContext(lastMessage.content)

  const systemPrompt = `You are a helpful HR assistant for AskHR. Use the following context to answer questions about company policies, benefits, and procedures. If the context doesn't contain relevant information, say so honestly.

Context:
${context}`

  const result = streamText({
    model: openrouter('openai/gpt-4o-mini'),
    system: systemPrompt,
    messages,
  })

  return result.toTextStreamResponse()
}
