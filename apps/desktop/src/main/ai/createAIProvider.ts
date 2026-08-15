import type { AIProvider, AIProviderKind } from './AIProvider'
import { DemoAIProvider } from './DemoAIProvider'
import { OpenAIProvider } from './OpenAIProvider'

export type AIProviderConfig =
  | { kind: 'demo' }
  | { kind: 'openai'; apiKey: string; model?: string }

// The exhaustive switch (no `default` case) means adding a third
// AIProviderKind without a matching branch here is a type error, not a
// silent runtime gap.
export function createAIProvider(config: AIProviderConfig): AIProvider {
  switch (config.kind) {
    case 'demo':
      return new DemoAIProvider()
    case 'openai':
      return new OpenAIProvider({ apiKey: config.apiKey, model: config.model })
  }
}

export type { AIProviderKind }
