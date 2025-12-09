import { Mastra } from '@mastra/core/mastra'
import { Agent } from '@mastra/core/agent'
import { LibSQLVector, LIBSQL_PROMPT } from '@mastra/libsql'
import { createVectorQueryTool } from '@mastra/rag'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import path from 'path'

// Initialize OpenRouter provider for both LLM and embeddings
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

// Initialize vector store with file-based LibSQL
const vectorStore = new LibSQLVector({
  connectionUrl: `file:${path.join(process.cwd(), 'vectors.db')}`,
})

// Create the vector query tool for RAG using OpenRouter's embedding model
const vectorQueryTool = createVectorQueryTool({
  vectorStoreName: 'vectorStore',
  indexName: 'embeddings',
  model: openrouter.textEmbeddingModel('openai/text-embedding-3-small'),
})

// Create the HR assistant agent
export const hrAgent = new Agent({
  name: 'HR Assistant',
  instructions: `You are a helpful HR assistant for AskHR. Use the provided context to answer questions about company policies, benefits, and procedures.

${LIBSQL_PROMPT}

Important guidelines:
- Base your answers only on the context provided by the vector query tool
- If the context doesn't contain relevant information, say so honestly
- Keep your answers concise and helpful
- Format responses with markdown when appropriate (lists, bold, etc.)`,
  model: openrouter('openai/gpt-4o-mini'),
  tools: { vectorQueryTool },
})

// Initialize Mastra with the agent and vector store
export const mastra = new Mastra({
  agents: { hrAgent },
  vectors: { vectorStore },
})

// Export the vector store for use in the build script
export { vectorStore }
