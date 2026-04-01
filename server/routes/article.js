const express = require('express');
const router = express.Router();
const styleLoader = require('../services/styleLoader');
const ai = require('../services/ai');

router.post('/article', async (req, res) => {
  try {
    const { topic, styleId, apiUrl, apiKey, modelName } = req.body;

    if (!topic || !apiUrl || !apiKey || !modelName) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const style = styleLoader.getStyle(styleId);
    if (!style) {
      return res.status(404).json({ error: '未找到写作风格' });
    }

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const messages = [
      { role: 'system', content: style.content },
      { role: 'user', content: topic },
    ];

    const response = await ai.createChatCompletion({
      apiUrl, apiKey, modelName, messages, stream: true,
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
              }
            } catch (_) {}
          }
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (streamErr) {
      console.error('Stream read error:', streamErr);
      res.write(`data: ${JSON.stringify({ error: streamErr.message })}\n\n`);
      res.end();
    }
  } catch (err) {
    console.error('Article generation error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
});

module.exports = router;
