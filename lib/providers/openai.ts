import OpenAI from "openai";
import type { ClassificationResult } from "./llm";
import { CLASSIFIER_SYSTEM } from "./llm";

// API key is never stored — it arrives from request headers, is used here, and discarded
export class OpenAIProvider {
  private client: OpenAI;
  model: string;

  constructor(apiKey: string, model: string) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async chat(
    messages: { role: string; content: string }[],
    system: string,
    stream: boolean,
  ): Promise<string | AsyncIterable<string>> {
    const allMessages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: system },
      ...(messages as OpenAI.ChatCompletionMessageParam[]),
    ];

    if (!stream) {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: allMessages,
      });
      return response.choices[0]?.message?.content ?? "";
    }

    const clientRef = this.client;
    const modelRef = this.model;
    return (async function* () {
      const s = await clientRef.chat.completions.create({
        model: modelRef,
        messages: allMessages,
        stream: true,
      });
      for await (const chunk of s) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) yield delta;
      }
    })();
  }

  // text-embedding-3-small returns 1536-dimensional vectors for pgvector
  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return response.data[0].embedding;
  }

  async classifyQuery(
    userMessage: string,
    conversationHistory: { role: string; content: string }[],
  ): Promise<ClassificationResult> {
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: CLASSIFIER_SYSTEM },
      ...(conversationHistory as OpenAI.ChatCompletionMessageParam[]),
      { role: "user", content: userMessage },
    ];
    const response = await this.client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      response_format: { type: "json_object" },
    });
    const text = response.choices[0]?.message?.content ?? "{}";
    return JSON.parse(text) as ClassificationResult;
  }
}
