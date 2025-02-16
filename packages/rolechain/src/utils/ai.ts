import { createDeepInfra } from "@ai-sdk/deepinfra";
import OpenAI from "openai";
import { generateText } from "ai";
import { SYSTEM_PROMPT } from "../prompts/systemPrompt";

export const getAIModel = () => {
  const AI_PROVIDER = process.env.AI_PROVIDER || 'deepinfra';

  switch (AI_PROVIDER) {
    case 'openai':
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      return async ({ messages }: { messages: any[] }) => {
        const response = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages
          ],
          temperature: 0.7,
        });
        
        let text = response.choices[0].message.content || '';
        text = text.replace(/```json\n?|\n?```/g, '');
        text = text.trim();
        
        return { text };
      };

    case 'deepinfra':
    default:
      const deepinfra = createDeepInfra({
        apiKey: process.env.DEEPINFRA_API_TOKEN as string,
      });
      return ({ messages }: { messages: any[] }) => 
        generateText({
          model: deepinfra("mistralai/Mixtral-8x7B-Instruct-v0.1"),
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages
          ]
        });
  }
}; 