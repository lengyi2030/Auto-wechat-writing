/**
 * 沃垠内容写作神器 - Frontend Application
 */
const App = {
  // State
  currentArticle: '',
  titles: [],
  coverPrompts: [],
  coverImageData: null,
  isGenerating: false,

  // ---- Init ----
  init() {
    this.loadStyles();
    this.loadSettings();
    this.bindEvents();

    // Show settings if text model not configured
    if (!this.getSettings().apiUrl) {
      setTimeout(() => this.openSettings(), 500);
    }
  },

  bindEvents() {
    const topicInput = document.getElementById('topic-input');
    const btnGenerate = document.getElementById('btn-generate');

    topicInput.addEventListener('input', () => {
      btnGenerate.disabled = !topicInput.value.trim() || this.isGenerating;
    });
  },

  // ---- Settings ----
  getSettings() {
    try {
      return JSON.parse(localStorage.getItem('wt_settings') || '{}');
    } catch { return {}; }
  },

  loadSettings() {
    const s = this.getSettings();
    document.getElementById('settings-api-url').value = s.apiUrl || '';
    document.getElementById('settings-api-key').value = s.apiKey || '';
    document.getElementById('settings-model-name').value = s.modelName || '';
    document.getElementById('settings-image-api-url').value = s.imageUrl || '';
    document.getElementById('settings-image-api-key').value = s.imageApiKey || '';
    document.getElementById('settings-image-model').value = s.imageModel || '';
  },

  saveSettings() {
    const settings = {
      apiUrl: document.getElementById('settings-api-url').value.trim(),
      apiKey: document.getElementById('settings-api-key').value.trim(),
      modelName: document.getElementById('settings-model-name').value.trim(),
      imageUrl: document.getElementById('settings-image-api-url').value.trim(),
      imageApiKey: document.getElementById('settings-image-api-key').value.trim(),
      imageModel: document.getElementById('settings-image-model').value.trim(),
    };

    if (!settings.apiUrl || !settings.apiKey || !settings.modelName) {
      this.showToast('请填写文本模型的 API URL、API Key 和模型名称', 'error');
      return;
    }
    if (!settings.imageUrl || !settings.imageApiKey || !settings.imageModel) {
      this.showToast('请填写图片模型的 API URL、API Key 和模型名称', 'error');
      return;
    }

    localStorage.setItem('wt_settings', JSON.stringify(settings));
    this.closeSettings();
    this.showToast('设置已保存');
  },

  openSettings() {
    this.loadSettings();
    document.getElementById('settings-modal').classList.remove('hidden');
  },

  closeSettings() {
    document.getElementById('settings-modal').classList.add('hidden');
  },

  // ---- Styles ----
  async loadStyles() {
    try {
      const res = await fetch('/api/styles');
      const styles = await res.json();
      const select = document.getElementById('style-select');
      select.innerHTML = styles.map(s =>
        `<option value="${s.id}">${s.name}</option>`
      ).join('');
    } catch (err) {
      console.error('Load styles failed:', err);
    }
  },

  // ---- Article Generation (SSE) ----
  async generateArticle() {
    const topic = document.getElementById('topic-input').value.trim();
    const styleId = document.getElementById('style-select').value;
    const settings = this.getSettings();

    if (!topic) return;
    if (!settings.apiUrl || !settings.apiKey || !settings.modelName) {
      this.openSettings();
      this.showToast('请先配置 API 设置', 'error');
      return;
    }

    // Reset state
    this.currentArticle = '';
    this.titles = [];
    this.coverPrompts = [];
    this.coverImageData = null;

    // Show article section
    const articleSection = document.getElementById('article-section');
    articleSection.classList.remove('hidden');
    articleSection.classList.add('animate-slide-up');

    // Hide downstream sections
    document.getElementById('titles-section').classList.add('hidden');
    document.getElementById('cover-section').classList.add('hidden');

    // Update UI
    const contentEl = document.getElementById('article-content');
    contentEl.innerHTML = '<div class="animate-pulse-custom text-slate-400 text-sm">正在生成文章...</div>';

    const styleName = document.getElementById('style-select').selectedOptions[0]?.text || '';
    document.getElementById('article-style-tag').textContent = styleName;

    this.setLoading('btn-generate', true, '开始写作');

    try {
      const response = await fetch('/api/article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          styleId,
          apiUrl: settings.apiUrl,
          apiKey: settings.apiKey,
          modelName: settings.modelName,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || '生成失败');
      }

      // Read SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

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
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.content) {
                this.currentArticle += parsed.content;
                this.renderArticle();
              }
            } catch (e) {
              if (e.message && !e.message.includes('JSON')) {
                throw e;
              }
            }
          }
        }
      }

      // Final render with full markdown
      this.renderArticle(true);

      // Enable next step
      document.getElementById('btn-titles').disabled = false;
      this.showToast('文章生成完成');

    } catch (err) {
      console.error('Article generation error:', err);
      contentEl.innerHTML = `<div class="text-red-500 text-sm"><i class="fas fa-exclamation-circle mr-1"></i>${err.message}</div>`;
      this.showToast(err.message, 'error');
    } finally {
      this.setLoading('btn-generate', false, '开始写作');
    }
  },

  renderArticle(final = false) {
    const contentEl = document.getElementById('article-content');
    if (final) {
      contentEl.innerHTML = marked.parse(this.currentArticle);
    } else {
      // During streaming, render markdown incrementally
      contentEl.innerHTML = marked.parse(this.currentArticle);
    }
    // Auto scroll
    contentEl.scrollTop = contentEl.scrollHeight;
  },

  // ---- Titles & Summaries ----
  async generateTitles() {
    const settings = this.getSettings();
    if (!this.currentArticle) return;

    const titlesSection = document.getElementById('titles-section');
    titlesSection.classList.remove('hidden');
    titlesSection.classList.add('animate-slide-up');

    this.setLoading('btn-titles', true, '生成标题摘要');

    try {
      const res = await fetch('/api/titles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article: this.currentArticle,
          apiUrl: settings.apiUrl,
          apiKey: settings.apiKey,
          modelName: settings.modelName,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '生成失败');

      this.titles = data.titles;
      this.renderTitles();
      this.showToast('标题摘要生成完成');

    } catch (err) {
      console.error('Titles error:', err);
      document.getElementById('titles-list').innerHTML =
        `<div class="px-6 py-4 text-red-500 text-sm"><i class="fas fa-exclamation-circle mr-1"></i>${err.message}</div>`;
      this.showToast(err.message, 'error');
    } finally {
      this.setLoading('btn-titles', false, '生成标题摘要');
    }
  },

  renderTitles() {
    const container = document.getElementById('titles-list');
    container.innerHTML = this.titles.map((item, i) => `
      <div class="title-card px-6 py-4 animate-fade-in" style="animation-delay: ${i * 60}ms">
        <div class="flex items-start gap-3">
          <span class="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-slate-100 text-slate-500 text-xs font-medium rounded-full mt-0.5">${i + 1}</span>
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-3">
              <p class="text-slate-800 font-medium leading-relaxed">${this.escapeHtml(item.title)}</p>
              <button onclick="App.copyText('title-${i}')" class="flex-shrink-0 text-slate-400 hover:text-primary-600 transition-colors" title="复制标题">
                <i class="far fa-copy text-sm"></i>
              </button>
            </div>
            <div class="flex items-start justify-between gap-3 mt-1.5">
              <p class="text-slate-500 text-sm leading-relaxed">${this.escapeHtml(item.summary)}</p>
              <button onclick="App.copyText('summary-${i}')" class="flex-shrink-0 text-slate-400 hover:text-primary-600 transition-colors" title="复制摘要">
                <i class="far fa-copy text-sm"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  },

  // ---- Cover Prompts & Image ----
  async generateCoverPrompts() {
    const settings = this.getSettings();

    const coverSection = document.getElementById('cover-section');
    coverSection.classList.remove('hidden');
    coverSection.classList.add('animate-slide-up');

    this.setLoading('btn-cover', true, '生成封面');

    try {
      const res = await fetch('/api/cover/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article: this.currentArticle,
          apiUrl: settings.apiUrl,
          apiKey: settings.apiKey,
          modelName: settings.modelName,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '生成失败');

      this.coverPrompts = data.prompts || [];
      this.renderCoverPrompts(data.keyPoints || []);
      this.showToast('封面 Prompt 生成完成');

    } catch (err) {
      console.error('Cover prompts error:', err);
      document.getElementById('cover-prompts').innerHTML =
        `<div class="text-red-500 text-sm"><i class="fas fa-exclamation-circle mr-1"></i>${err.message}</div>`;
      this.showToast(err.message, 'error');
    } finally {
      this.setLoading('btn-cover', false, '生成封面');
    }
  },

  renderCoverPrompts(keyPoints) {
    // Key points
    document.getElementById('key-points').innerHTML = keyPoints.map(p =>
      `<span class="key-point-tag">${this.escapeHtml(p)}</span>`
    ).join('');

    // Prompt cards
    document.getElementById('cover-prompts').innerHTML = this.coverPrompts.map((prompt, i) => `
      <div class="prompt-card rounded-xl p-4 animate-fade-in" style="animation-delay: ${i * 80}ms">
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <div class="text-xs text-slate-400 mb-1">Prompt ${i + 1}</div>
            <p class="text-sm text-slate-700 leading-relaxed break-all">${this.escapeHtml(prompt)}</p>
          </div>
          <button onclick="App.copyText('prompt-${i}')" class="flex-shrink-0 text-slate-400 hover:text-primary-600 transition-colors mt-4" title="复制 Prompt">
            <i class="far fa-copy text-sm"></i>
          </button>
        </div>
        <div class="mt-3 flex justify-end">
          <button onclick="App.generateCoverImage(${i})" id="btn-cover-gen-${i}" class="px-4 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-all flex items-center gap-1.5">
            <i class="fas fa-wand-magic-sparkles text-xs"></i>
            <span>生成封面</span>
          </button>
        </div>
      </div>
    `).join('');

    // Reset image container
    document.getElementById('cover-image-container').classList.add('hidden');
  },

  async generateCoverImage(promptIndex) {
    const settings = this.getSettings();
    const prompt = this.coverPrompts[promptIndex];
    if (!prompt) return;

    if (!settings.imageUrl || !settings.imageApiKey || !settings.imageModel) {
      this.showToast('请先在设置中配置图片生成模型', 'error');
      this.openSettings();
      return;
    }

    const btnId = `btn-cover-gen-${promptIndex}`;

    this.setLoading(btnId, true, '生成封面');

    // Show container
    const imgContainer = document.getElementById('cover-image-container');
    imgContainer.classList.remove('hidden');
    document.getElementById('cover-image').src = '';
    document.getElementById('cover-image').alt = '图片生成中...';

    try {
      const res = await fetch('/api/cover/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          apiUrl: settings.imageUrl,
          apiKey: settings.imageApiKey,
          modelName: settings.imageModel,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '生成失败');

      this.coverImageData = data;

      if (data.url) {
        // Use GET proxy to avoid CORS issues with external image URLs
        document.getElementById('cover-image').src = '/api/cover/proxy?url=' + encodeURIComponent(data.url);
      } else if (data.b64_json) {
        document.getElementById('cover-image').src = `data:image/png;base64,${data.b64_json}`;
      }

      document.getElementById('cover-image').alt = '封面图';
      this.showToast('封面图生成完成');

    } catch (err) {
      console.error('Cover image error:', err);
      this.showToast(err.message, 'error');
      imgContainer.classList.add('hidden');
    } finally {
      this.setLoading(btnId, false, '生成封面');
    }
  },

  async downloadCoverImage() {
    if (!this.coverImageData) return;

    try {
      let blob;
      const imgEl = document.getElementById('cover-image');

      if (this.coverImageData.url) {
        // Proxy through backend
        const res = await fetch('/api/cover/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: this.coverImageData.url }),
        });
        blob = await res.blob();
      } else if (this.coverImageData.b64_json) {
        const byteChars = atob(this.coverImageData.b64_json);
        const byteNums = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteNums[i] = byteChars.charCodeAt(i);
        }
        blob = new Blob([new Uint8Array(byteNums)], { type: 'image/png' });
      }

      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const topic = document.getElementById('topic-input').value.trim().slice(0, 20) || 'cover';
        a.href = url;
        a.download = `cover_${topic}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showToast('图片下载中...');
      }
    } catch (err) {
      console.error('Download error:', err);
      this.showToast('下载失败: ' + err.message, 'error');
    }
  },

  // ---- Copy & Toast ----
  copyText(type) {
    let text = '';
    if (type === 'article') {
      text = this.currentArticle;
    } else if (type.startsWith('title-')) {
      const idx = parseInt(type.split('-')[1]);
      text = this.titles[idx]?.title || '';
    } else if (type.startsWith('summary-')) {
      const idx = parseInt(type.split('-')[1]);
      text = this.titles[idx]?.summary || '';
    } else if (type.startsWith('prompt-')) {
      const idx = parseInt(type.split('-')[1]);
      text = this.coverPrompts[idx] || '';
    }

    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
      this.showToast('已复制到剪贴板');
    }).catch(() => {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.showToast('已复制到剪贴板');
    });
  },

  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');

    const bgColor = type === 'error' ? 'bg-red-600' : 'bg-slate-800';
    const icon = type === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-check-circle';

    toast.className = `toast-item ${bgColor} text-white px-4 py-2.5 rounded-lg shadow-lg text-sm flex items-center gap-2`;
    toast.innerHTML = `<i class="${icon}"></i><span>${this.escapeHtml(message)}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 250);
    }, 2000);
  },

  // ---- UI Helpers ----
  setLoading(btnId, loading, originalText) {
    const btn = document.getElementById(btnId);
    if (!btn) return;

    if (loading) {
      btn.disabled = true;
      btn.dataset.originalHtml = btn.innerHTML;
      btn.innerHTML = `<span class="spinner"></span><span>生成中...</span>`;
    } else {
      btn.innerHTML = btn.dataset.originalHtml || `<span>${originalText}</span>`;
      // Re-enable unless it's the generate button (depends on input)
      if (btnId !== 'btn-generate') {
        btn.disabled = false;
      } else {
        const topic = document.getElementById('topic-input').value.trim();
        btn.disabled = !topic;
      }
    }
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
