import { DEFAULT_OPENAI_MODEL } from './openaiModels';

const CONNECTION_TIMEOUT_MS = 15000;

const fetchWithConnectionTimeout = async (url, options, timeout = CONNECTION_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Connection check timed out. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

const readOpenAIError = async (response) => {
  let detail = '';
  try {
    const text = await response.text();
    if (text) {
      try {
        const errorData = JSON.parse(text);
        detail = errorData.error?.message || '';
      } catch {
        detail = text.length < 200 ? text : '';
      }
    }
  } catch {
    // Ignore unreadable error bodies.
  }
  return detail;
};

/**
 * Checks whether an OpenAI API key can reach the selected model.
 * This uses the Models API, so it validates authentication and model access
 * without creating a paid completion.
 *
 * @param {{ apiKey: string, model?: string }} params
 * @returns {Promise<{ ok: boolean, model: string, status: string, message: string, checkedAt: string }>}
 */
export const checkOpenAIConnection = async ({ apiKey, model = DEFAULT_OPENAI_MODEL }) => {
  const trimmedKey = apiKey?.trim();
  const selectedModel = model || DEFAULT_OPENAI_MODEL;

  if (!trimmedKey) {
    throw new Error('Enter an OpenAI API key before checking the connection.');
  }

  const response = await fetchWithConnectionTimeout(
    `https://api.openai.com/v1/models/${encodeURIComponent(selectedModel)}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${trimmedKey}`,
      },
    }
  );

  if (response.ok) {
    const data = await response.json();
    return {
      ok: true,
      model: data.id || selectedModel,
      status: 'connected',
      message: `Connected to OpenAI. ${data.id || selectedModel} is available for this key.`,
      checkedAt: new Date().toISOString(),
    };
  }

  const detail = await readOpenAIError(response);
  const suffix = detail ? ` ${detail}` : '';

  if (response.status === 401) {
    throw new Error(`OpenAI rejected this API key. Check that the key is correct and active.${suffix}`);
  }

  if (response.status === 403) {
    throw new Error(`This key is valid, but it does not have access to ${selectedModel}.${suffix}`);
  }

  if (response.status === 404) {
    throw new Error(`${selectedModel} is not available for this API key or project.${suffix}`);
  }

  if (response.status === 429) {
    return {
      ok: false,
      model: selectedModel,
      status: 'rate_limited',
      message: `OpenAI accepted the key, but the project is rate-limited right now.${suffix}`,
      checkedAt: new Date().toISOString(),
    };
  }

  throw new Error(`OpenAI connection check failed (${response.status}).${suffix}`);
};
