import { Mastra, Agent } from '@mastra/core';
import { createTool } from '@mastra/core/tools';
import { SimpleVectorStore } from '../lib/vector-store';
import path from 'path';
import { z } from 'zod';

const vectorStore = new SimpleVectorStore(path.join(process.cwd(), 'mastra-vectors.json'));

const searchKnowledgeBase = createTool({
  id: 'searchKnowledgeBase',
  description: 'Search the knowledge base for relevant information about space travel, alien flora, and ship maintenance.',
  inputSchema: z.object({
    query: z.string().describe('The search query'),
  }),
  execute: async ({ context }) => {
    // We need to generate embedding for the query here.
    // Ideally we inject the embedder or use the same OpenAI instance.
    // For simplicity, we'll assume the vector store can handle text query if we upgrade it,
    // OR we instantiate OpenAI here.
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
    });

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: context.query,
    });
    const embedding = response.data[0].embedding;

    const results = await vectorStore.query(embedding);
    return results.map(r => r.metadata.content).join('\n\n');
  },
});

export const agent = new Agent({
  name: 'RAG Agent',
  instructions: 'You are a helpful assistant. Use the provided context to answer questions about space travel, alien flora, and ship maintenance.',
  model: {
    provider: 'OPENROUTER',
    id: 'openai/gpt-5-nano',
  },
  tools: {
    searchKnowledgeBase,
  },
});

export const mastra = new Mastra({
  agents: {
    ragAgent: agent,
  },
});
