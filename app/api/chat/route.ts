import { agent } from '@/mastra';
import { streamText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  console.log('Received messages:', JSON.stringify(messages, null, 2));

  const result = streamText({
    model: openrouter('openai/gpt-4o-mini'), // Using a known working model
    messages,
    tools: agent.tools as any,
    system: agent.instructions,
  });

  console.log('StreamText result created');

  return result.toTextStreamResponse();
}
