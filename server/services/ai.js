/**
 * AI Service - OpenAI Compatible API Wrapper
 */

/**
 * Build endpoint URL from user-provided base URL.
 * Tries to be smart about what the user entered:
 *
 * 1. Full endpoint already present → use as-is
 * 2. Version prefix only (/v1, /v4) → append the action path
 * 3. Bare domain → append /v1 + action path
 * 4. Any other path that doesn't end with a known action → use as-is
 *    (user may have entered a custom endpoint that doesn't follow OpenAI convention)
 */
function buildEndpoint(apiUrl, defaultPath) {
  const base = apiUrl.replace(/\/+$/, '');

  // Already a known full endpoint path
  if (base.includes('/chat/completions') || base.includes('/images/generations')) {
    return base;
  }

  // Ends with a version prefix like /v1, /v4, /v1beta etc.
  if (/\/v\d+(?:beta|alpha)?$/.test(base)) {
    return `${base}${defaultPath}`;
  }

  // Bare domain (no path or only a simple path like /api)
  // → use the conventional /v1 + default path
  if (!base.includes('/') || /^https?:\/\/[^/]+$/.test(base)) {
    return `${base}/v1${defaultPath}`;
  }

  // Has a path but doesn't match any known endpoint pattern
  // → trust the user and use as-is (they may have entered a custom endpoint)
  return base;
}

async function createChatCompletion({ apiUrl, apiKey, modelName, messages, stream = false }) {
  const url = buildEndpoint(apiUrl, '/chat/completions');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelName,
      messages,
      stream,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API Error (${response.status}) [${url}]: ${errorText}`);
  }

  return response;
}

async function createChatCompletionJSON({ apiUrl, apiKey, modelName, messages }) {
  const url = buildEndpoint(apiUrl, '/chat/completions');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelName,
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API Error (${response.status}) [${url}]: ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function createImage({ apiUrl, apiKey, modelName, prompt, size = '3008x1280' }) {
  const url = buildEndpoint(apiUrl, '/images/generations');
  const isDashScope = /dashscope/i.test(url);

  // Build request body based on API provider
  let requestBody;
  if (isDashScope) {
    // DashScope (通义万相) format: uses input.messages
    requestBody = {
      model: modelName,
      input: {
        messages: [
          { role: 'user', content: [{ text: prompt }] }
        ]
      },
      parameters: {
        size: size.replace('x', '*')
      }
    };
  } else {
    // OpenAI compatible format
    requestBody = {
      model: modelName,
      prompt,
      n: 1,
      size,
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Image API Error (${response.status}) [${url}]: ${errorText}`);
  }

  const result = await response.json();

  // Parse response based on API provider
  if (isDashScope) {
    // DashScope: try multiple response paths to locate image URL
    const imageUrl =
      result.output?.results?.[0]?.url ||
      result.output?.results?.[0]?.b64_image ||
      result.output?.choices?.[0]?.message?.content?.find(c => c.image)?.image ||
      null;

    // If async task, return task info for polling
    const taskId = result.output?.task_id;
    if (!imageUrl && taskId) {
      return { url: null, b64_json: null, taskId, revised_prompt: prompt, async: true };
    }

    return { url: imageUrl, b64_json: null, revised_prompt: prompt };
  } else {
    // OpenAI format
    const imageData = result.data?.[0];
    return {
      url: imageData?.url || null,
      b64_json: imageData?.b64_json || null,
      revised_prompt: imageData?.revised_prompt || prompt,
    };
  }
}

/**
 * Extract and parse JSON from AI response text.
 * Uses a state-machine approach to robustly handle:
 * - Markdown code fences
 * - Trailing commas
 * - Unescaped newlines / tabs inside string values
 */
function parseJSON(raw) {
  let text = raw.trim();

  // Strip markdown code fences
  text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');

  // Extract the JSON structure (array or object)
  const match = text.match(/[\[{][\s\S]*[\]}]/);
  if (!match) throw new Error('未找到有效的 JSON 结构');
  let jsonStr = match[0];

  // Remove trailing commas before } or ]
  jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');

  // Quick try
  try { return JSON.parse(jsonStr); } catch (_) {}

  // State-machine: walk char by char, fix unescaped chars inside strings
  let fixed = '';
  let inStr = false;
  let esc = false;

  for (let i = 0; i < jsonStr.length; i++) {
    const ch = jsonStr[i];

    if (esc) {
      fixed += ch;
      esc = false;
      continue;
    }

    if (ch === '\\' && inStr) {
      fixed += ch;
      esc = true;
      continue;
    }

    if (ch === '"') {
      inStr = !inStr;
      fixed += ch;
      continue;
    }

    if (inStr) {
      // Inside a string – escape raw control characters
      if (ch === '\n') { fixed += '\\n'; }
      else if (ch === '\r') { fixed += '\\r'; }
      else if (ch === '\t') { fixed += '\\t'; }
      else { fixed += ch; }
    } else {
      fixed += ch;
    }
  }

  try { return JSON.parse(fixed); } catch (_) {}

  throw new Error(`JSON 解析失败。原始返回前200字符: ${text.substring(0, 200)}`);
}

module.exports = { createChatCompletion, createChatCompletionJSON, createImage, parseJSON };
