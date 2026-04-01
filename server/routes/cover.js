const express = require('express');
const router = express.Router();
const ai = require('../services/ai');

// Generate cover image prompts based on article
router.post('/cover/prompts', async (req, res) => {
  try {
    const { article, apiUrl, apiKey, modelName } = req.body;

    if (!article || !apiUrl || !apiKey || !modelName) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const systemPrompt = `你是一位视觉设计专家和 AI 绘图 Prompt 工程师。

请根据用户提供的文章内容完成以下任务：

1. 提炼 2-3 个关键内容点（简短概括，每个不超过15个字）
2. 生成 3 个不同风格的封面图文生图 Prompt

Prompt 要求：
- 统一宽高比 2.35:1（宽幅横图）
- 风格各不相同，例如：科技感/赛博朋克、极简主义/扁平化、抽象艺术/概念化
- 每个 Prompt 用英文撰写，包含详细的视觉描述、风格、色调、构图等
- Prompt 中明确标注 aspect ratio 2.35:1

请严格按以下 JSON 格式返回，不要返回任何其他内容：
{
  "keyPoints": ["关键点1", "关键点2", "关键点3"],
  "prompts": [
    "Prompt 1 in English...",
    "Prompt 2 in English...",
    "Prompt 3 in English..."
  ]
}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: article },
    ];

    const raw = await ai.createChatCompletionJSON({ apiUrl, apiKey, modelName, messages });

    const result = ai.parseJSON(raw);
    if (!result.keyPoints || !result.prompts) {
      return res.status(500).json({ error: 'AI 返回格式异常，缺少 keyPoints 或 prompts', raw: raw.substring(0, 200) });
    }

    res.json(result);
  } catch (err) {
    console.error('Cover prompts error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Generate cover image from selected prompt
router.post('/cover/generate', async (req, res) => {
  try {
    const { prompt, apiUrl, apiKey, modelName } = req.body;

    if (!prompt || !apiUrl || !apiKey || !modelName) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // createImage already returns { url, b64_json, revised_prompt }
    // and uses default size 3008x1280 (meets Volcengine 3.69M pixel minimum)
    const result = await ai.createImage({ apiUrl, apiKey, modelName, prompt });

    if (!result.url && !result.b64_json) {
      if (result.async) {
        return res.status(202).json({ error: '该接口为异步模式，暂不支持，请更换同步图片生成接口' });
      }
      return res.status(500).json({ error: '图片生成失败：未返回图片数据' });
    }

    res.json(result);
  } catch (err) {
    console.error('Cover generate error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Proxy image display (GET, for <img src> to avoid CORS)
router.get('/cover/proxy', async (req, res) => {
  try {
    const imageUrl = req.query.url;
    if (!imageUrl) {
      return res.status(400).send('Missing url parameter');
    }

    const response = await fetch(imageUrl);
    if (!response.ok) {
      return res.status(502).send('Failed to fetch image');
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(buffer);
  } catch (err) {
    console.error('Image proxy error:', err);
    res.status(500).send('Proxy error');
  }
});

// Proxy image download (POST, for JS-initiated download)
router.post('/cover/proxy', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ error: '缺少图片 URL' });
    }

    const response = await fetch(imageUrl);
    if (!response.ok) {
      return res.status(502).json({ error: '下载图片失败' });
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    console.error('Image proxy error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
