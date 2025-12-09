import { mastra } from '@/mastra'

export const POST = async (request: Request) => {
  const { messages } = await request.json()

  // Get the HR agent from Mastra
  const agent = mastra.getAgent('hrAgent')

  // Get the last user message for the query
  const lastMessage = messages[messages.length - 1]

  // Use the agent to generate a streaming response with AI SDK format
  // The agent will automatically use the vector query tool to retrieve relevant context
  const stream = await agent.stream(lastMessage.content, {
    format: 'aisdk',
  })

  return stream.toTextStreamResponse()
}
