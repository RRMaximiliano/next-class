export const DEFAULT_OPENAI_MODEL = 'gpt-5.4';

export const AVAILABLE_OPENAI_MODELS = [
  {
    id: 'gpt-5.4',
    name: 'GPT-5.4 (Recommended)',
    description: 'Best default for nuanced teaching feedback and complex reasoning.',
  },
  {
    id: 'gpt-5.4-mini',
    name: 'GPT-5.4 Mini',
    description: 'Lower latency and cost while keeping strong reasoning quality.',
  },
  {
    id: 'gpt-5.4-nano',
    name: 'GPT-5.4 Nano',
    description: 'Fastest and lowest cost; best for simpler or high-volume runs.',
  },
  {
    id: 'gpt-5.2',
    name: 'GPT-5.2',
    description: 'Previous flagship model; useful as a compatibility fallback.',
  },
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    description: 'Legacy non-reasoning fallback for accounts without newer model access.',
  },
];

export const getOpenAIModel = (modelId) =>
  AVAILABLE_OPENAI_MODELS.find(model => model.id === modelId);

export const normalizeOpenAIModel = (modelId) =>
  getOpenAIModel(modelId)?.id || DEFAULT_OPENAI_MODEL;
