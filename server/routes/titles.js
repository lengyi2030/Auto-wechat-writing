const express = require('express');
const router = express.Router();
const ai = require('../services/ai');

router.post('/titles', async (req, res) => {
  try {
    const { article, apiUrl, apiKey, modelName } = req.body;

    if (!article || !apiUrl || !apiKey || !modelName) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const systemPrompt = `你是一位资深的新媒体编辑，擅长写出吸引眼球的标题和精炼的摘要。

请根据用户提供的文章内容，生成 5 组标题和摘要。

要求：
1. 标题要有吸引力，适合公众号、头条等新媒体平台发布，风格多样（可包含疑问句、数字型、反差型等）
2. 摘要要在1-2句话内概括文章核心观点，语言精炼有力
3. 标题和摘要必须严格对应

请严格按以下 JSON 格式返回，不要返回任何其他内容：
[
  {"title": "标题1", "summary": "摘要1"},
  {"title": "标题2", "summary": "摘要2"},
  {"title": "标题3", "summary": "摘要3"},
  {"title": "标题4", "summary": "摘要4"},
  {"title": "标题5", "summary": "摘要5"}
]`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: article },
    ];

    const raw = await ai.createChatCompletionJSON({ apiUrl, apiKey, modelName, messages });

    const titles = ai.parseJSON(raw);
    if (!Array.isArray(titles)) {
      return res.status(500).json({ error: 'AI 返回格式异常，期望数组', raw: raw.substring(0, 200) });
    }

    res.json({ titles });
  } catch (err) {
    console.error('Titles generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
