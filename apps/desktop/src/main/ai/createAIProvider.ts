import type { AIProvider, AIProviderKind } from './AIProvider'
import { DemoAIProvider } from './DemoAIProvider'
import { OpenAIProvider } from './OpenAIProvider'

export type AIProviderConfig =
  | { kind: 'demo' }
  | { kind: 'openai'; apiKey: string; model?: string }

// no default case on purpose - if we add a third provider type and forget
// to handle it here, typescript will yell at us instead of it silently
// breaking
export function createAIProvider(config: AIProviderConfig): AIProvider {
  switch (config.kind) {
    case 'demo':
      return new DemoAIProvider()
    case 'openai':
      return new OpenAIProvider({ apiKey: config.apiKey, model: config.model })
  }
}

export type { AIProviderKind }
