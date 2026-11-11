import Anthropic from "@anthropic-ai/sdk";
import type { ClassificationResult } from "./llm";
import { CLASSIFIER_SYSTEM } from "./llm";

// API key is never stored — it arrives from request headers, is used here, and discarded
export class AnthropicProvider {
  private client: Anthropic;
  model: string;

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async chat(
    messages: { role: string; content: string }[],
    system: string,
    stream: boolean,
  ): Promise<string | AsyncIterable<string>> {
    const params = {
      model: this.model,
      max_tokens: 8192,
      system,
      messages: messages as Anthropic.MessageParam[],
    };

    if (!stream) {
      const response = await this.client.messages.create(params);
      const block = response.content[0];
      return block.type === "text" ? block.text : "";
    }

    // Return a lazy async iterable — caller drives consumption
    const clientRef = this.client;
    return (async function* () {
      const s = clientRef.messages.stream(params);
      for await (const event of s) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          yield event.delta.text;
        }
      }
    })();
  }

  // Anthropic has no embeddings API — callers must use OpenAIProvider for pgvector search
  async embed(_text: string): Promise<number[]> {
    throw new Error(
      "Anthropic doesn't support embeddings — use OpenAI provider for semantic search",
    );
  }

  async classifyQuery(
    userMessage: string,
    conversationHistory: { role: string; content: string }[],
  ): Promise<ClassificationResult> {
    // Use the cheapest fast model; classification results are small JSON blobs
    const response = await this.client.messages.create({
      model: "claude-haiku-3-5",
      max_tokens: 512,
      system: CLASSIFIER_SYSTEM,
      messages: [
        ...(conversationHistory as Anthropic.MessageParam[]),
        { role: "user", content: userMessage },
      ],
    });
    const block = response.content[0];
    const text = block.type === "text" ? block.text : "{}";
    return JSON.parse(text) as ClassificationResult;
  }
}
