# 内容写作神器 / AI Content Writing Tool

[中文](#中文文档) | [English](#english-documentation)

---

<a id="中文文档"></a>

## 中文文档

AI Agent 驱动的一站式内容创作工具。输入主题，直接生成：正文 → 标题摘要 → 封面图。

### 功能特性

- **风格化写作**：内置写作风格模板，AI 严格遵循风格约束，文章有辨识度
- **智能标题摘要**：基于正文一键批量生成 5 组标题+摘要，供挑选
- **AI 封面生成**：提炼关键内容点，生成 Prompt 并调用文生图模型出图
- **即拿即用**：所有文本一键复制，封面图直接下载
- **流式输出**：正文实时生成，打字机效果流畅
- **OpenAI 兼容**：支持所有 OpenAI 兼容 API（含 GPT、Qwen、GLM、DeepSeek、火山引擎等）
- **API Key 安全**：密钥仅在浏览器本地存储，不传给服务器
- **多写作风格**：在 `styles/` 目录添加 `.txt` 文件即可扩展，无需改代码
- **轻量架构**：无前端框架依赖，纯 HTML + Tailwind CSS

### 快速开始

**要求**：Node.js >= 18

```bash
# 1. 克隆项目
git clone https://github.com/xxx/writing-tool.git
cd writing-tool

# 2. 安装依赖
npm install

# 3. 启动服务
npm start
```

打开浏览器访问 http://localhost:3000

首次使用会自动弹出 API 设置弹窗，填入 API 配置即可。

开发模式（自动重启）：

```bash
npm run dev
```

### API 配置说明

| 配置项 | 文本模型 | 图片模型 |
|------|----------|----------|
| API URL | OpenAI 兼容 API 地址（如 `https://api.openai.com/v1/chat/completions`） | 文生图 API 地址（如 `https://ark.cn-beijing.volces.com/api/v3/images/generations`） |
| API Key | 你的 API Key | 你的 API Key |
| 模型名称 | 如 `gpt-4o`、`qwen-plus`、`deepseek-chat` | 如 `doubao-seedream`、`wanx-v2` |

文本和图片模型可分别配置不同厂商，互不影响。

> **安全**：设置保存在浏览器 localStorage 中，不会传给服务器。

### 使用流程

1. **设置 API**：首次访问弹出设置弹窗，填入 API 配置
2. **选择风格**：从下拉菜单选择写作风格
3. **输入主题**：输入你想写的主题或大纲
4. **生成正文**：点击生成，AI 按选定风格流式输出文章
5. **生成标题**：正文完成后一键生成 5 组标题+摘要
6. **生成封面**：AI 提炼关键点并生成封面图 Prompt，选择后生成图片

### 项目结构

```
writing-tool/
├── server/
│   ├── index.js               # Express 服务入口，端口 3000
│   ├── routes/
│   │   ├── article.js         # 正文 SSE 流式生成 (POST /api/article)
│   │   ├── titles.js          # 标题摘要生成 (POST /api/titles)
│   │   └── cover.js           # 封面 Prompt + 图片生成 + 代理
│   │                          #   POST /api/cover/prompts
│   │                          #   POST /api/cover/generate
│   │                          #   GET/POST /api/cover/proxy
│   └── services/
│       ├── ai.js              # AI API 封装（OpenAI/DashScope/火山引擎适配）
│       └── styleLoader.js     # 风格文件加载器（带缓存）
├── styles/                    # 写作风格 Prompt 模板
│   └── 科技媒体评论.txt
├── public/                    # 前端静态文件
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── .env.example               # 环境变量示例
├── package.json
└── README.md
```

### API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/styles` | 获取可用写作风格列表 |
| POST | `/api/article` | 流式生成正文（SSE） |
| POST | `/api/titles` | 生成 5 组标题+摘要 |
| POST | `/api/cover/prompts` | 根据正文生成封面图 Prompt |
| POST | `/api/cover/generate` | 根据 Prompt 生成封面图 |
| GET | `/api/cover/proxy?url=` | 代理图片显示（解决跨域） |
| POST | `/api/cover/proxy` | 代理图片下载 |

### 添加写作风格

在 `styles/` 目录下新建 `.txt` 文件即可。文件名即为风格名称。文件内容应包含结构化的 Prompt 指令（参考 `styles/科技媒体评论.txt`）。

无需改代码，重启服务即可生效。

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3000` | 服务监听端口 |

### 技术栈

- **后端**：Node.js + Express
- **前端**：原生 HTML + Tailwind CSS（无框架依赖）
- **AI 接口**：OpenAI 兼容协议（自动适配 DashScope、火山引擎等）
- **通信方式**：SSE（Server-Sent Events）流式输出

### 许可协议

MIT License

---

<a id="english-documentation"></a>

## English Documentation

An AI Agent-powered, all-in-one content creation tool. Enter a topic and generate: full article → titles & summaries → cover image.

### Features

- **Stylized Writing**: Built-in writing style templates. AI strictly follows style constraints for distinctive articles
- **Smart Titles & Summaries**: One-click batch generation of 5 title + summary pairs based on the article
- **AI Cover Generation**: Extracts key points, generates prompts, and calls image generation models
- **Ready to Use**: One-click copy for all text, direct download for cover images
- **Streaming Output**: Real-time article generation with smooth typewriter effect
- **OpenAI Compatible**: Supports all OpenAI-compatible APIs (GPT, Qwen, GLM, DeepSeek, Volcengine, etc.)
- **API Key Security**: Keys are stored locally in the browser, never sent to the server
- **Extensible Styles**: Add `.txt` files in the `styles/` directory to add new writing styles — no code changes needed
- **Lightweight Architecture**: No frontend framework dependencies — pure HTML + Tailwind CSS

### Quick Start

**Requirements**: Node.js >= 18

```bash
# 1. Clone the repository
git clone https://github.com/xxx/writing-tool.git
cd writing-tool

# 2. Install dependencies
npm install

# 3. Start the server
npm start
```

Open your browser and visit http://localhost:3000

On first use, an API settings dialog will appear automatically. Fill in your API configuration to get started.

Development mode (auto-restart on file changes):

```bash
npm run dev
```

### API Configuration

| Setting | Text Model | Image Model |
|---------|-----------|-------------|
| API URL | OpenAI-compatible API endpoint (e.g., `https://api.openai.com/v1/chat/completions`) | Image generation API endpoint (e.g., `https://ark.cn-beijing.volces.com/api/v3/images/generations`) |
| API Key | Your API key | Your API key |
| Model Name | e.g., `gpt-4o`, `qwen-plus`, `deepseek-chat` | e.g., `doubao-seedream`, `wanx-v2` |

Text and image models can be configured with different providers independently.

> **Security**: Settings are saved in the browser's localStorage and are never sent to the server.

### Usage Workflow

1. **Configure API**: On first visit, a settings dialog appears — enter your API configuration
2. **Select Style**: Choose a writing style from the dropdown menu
3. **Enter Topic**: Input the topic or outline you want to write about
4. **Generate Article**: Click generate — AI streams the article in the selected style
5. **Generate Titles**: After the article is complete, generate 5 title + summary pairs with one click
6. **Generate Cover**: AI extracts key points and generates cover image prompts, then generates the image

### Project Structure

```
writing-tool/
├── server/
│   ├── index.js               # Express server entry, port 3000
│   ├── routes/
│   │   ├── article.js         # Article SSE streaming generation (POST /api/article)
│   │   ├── titles.js          # Title & summary generation (POST /api/titles)
│   │   └── cover.js           # Cover prompt + image generation + proxy
│   │                          #   POST /api/cover/prompts
│   │                          #   POST /api/cover/generate
│   │                          #   GET/POST /api/cover/proxy
│   └── services/
│       ├── ai.js              # AI API wrapper (OpenAI/DashScope/Volcengine compatible)
│       └── styleLoader.js     # Style file loader with caching
├── styles/                    # Writing style prompt templates
│   └── 科技媒体评论.txt
├── public/                    # Frontend static files
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── .env.example               # Environment variable example
├── package.json
└── README.md
```

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/styles` | Get available writing styles |
| POST | `/api/article` | Stream article generation (SSE) |
| POST | `/api/titles` | Generate 5 title + summary pairs |
| POST | `/api/cover/prompts` | Generate cover image prompts from article |
| POST | `/api/cover/generate` | Generate cover image from prompt |
| GET | `/api/cover/proxy?url=` | Proxy image display (bypass CORS) |
| POST | `/api/cover/proxy` | Proxy image download |

### Adding Writing Styles

Create a new `.txt` file in the `styles/` directory. The filename becomes the style name. The file content should contain structured prompt instructions (see `styles/科技媒体评论.txt` for reference).

No code changes needed — restart the server to apply.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server listening port |

### Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: Vanilla HTML + Tailwind CSS (no framework dependencies)
- **AI Interface**: OpenAI-compatible protocol (auto-adapts to DashScope, Volcengine, etc.)
- **Communication**: SSE (Server-Sent Events) for streaming output

### License

MIT License
