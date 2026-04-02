# MDFlow Publisher

Obsidian 全平台内容分发插件 — 在 Obsidian 内完成「写作 → 选风格 → 一键复制/导出到目标平台」的完整闭环。

## 支持平台

### 微信公众号
- 19 种精选排版主题（经典公众号、技术风、晚点风、Claude 风、金融时报等）
- Markdown → 内联样式 HTML，一键复制到剪贴板
- 图片自动压缩并转 Base64，粘贴即用
- 兼容 Obsidian `![[image.png]]`、内部链接、任务列表等语法

### X Articles
- 语义化长文 HTML 结构
- 优化后可直接复制粘贴到 X Articles 编辑器

### 小红书
- 3:4 图文卡片，自动按内容权重分页
- 12 款预设模板（Jacky 模板、极简、赛博、星空、樱花等）
- 自定义字体、字号
- 支持封面页、作者介绍页、导流素材配置
- 批量导出 PNG / ZIP

## 安装

### 方法 1：手动安装

1. 前往 [Releases](https://github.com/Jackywxsz/mdflow-publisher/releases) 页面下载以下三个文件：
   - `main.js`
   - `styles.css`
   - `manifest.json`
2. 在你的 Obsidian Vault 目录下创建文件夹：`.obsidian/plugins/mdflow-publisher/`
3. 将下载的三个文件放入该文件夹
4. 重启 Obsidian，在 `设置 → 第三方插件` 中启用 **MDFlow Publisher**

### 方法 2：开发模式

```bash
cd /path/to/your/vault/.obsidian/plugins/
git clone https://github.com/Jackywxsz/mdflow-publisher.git
cd mdflow-publisher
npm install
npm run dev
```

重启 Obsidian 并启用插件。

## 使用流程

1. 打开一个 Markdown 文件
2. 点击左侧 Ribbon 图标 📤 或使用命令面板搜索 `MDFlow Publisher`
3. 在右侧面板选择目标平台（微信公众号 / X Articles / 小红书）
4. 根据平台调整设置：
   - **微信公众号**：选择排版主题 → 点击「复制到剪贴板」→ 粘贴到公众号编辑器
   - **X Articles**：点击「复制」→ 粘贴到 X Articles 编辑器
   - **小红书**：选择模板/字体/字号 → 预览翻页检查 → 点击「导出 ZIP」

## 开发

```bash
npm install          # 安装依赖
npm run dev          # 监听模式，自动重新构建
npm run build        # 生产构建（含类型检查）
npm run deploy       # 构建后部署到 Obsidian 插件目录（需设置 OBSIDIAN_VAULT_PATH 环境变量）
```

`deploy` 脚本需要先设置环境变量指向你的 Vault 路径：

```bash
export OBSIDIAN_VAULT_PATH="/path/to/your/vault"
npm run deploy
```

## 技术栈

- TypeScript + Obsidian API
- Obsidian `MarkdownRenderer` 原生渲染
- `html-to-image` + `jszip`（小红书图片导出）
- 纯前端，零后端依赖

## 致谢

- 微信公众号编辑器基于 [花生编辑器](https://github.com/alchaincyf/huasheng_editor) 开发

## License

[MIT](LICENSE)
