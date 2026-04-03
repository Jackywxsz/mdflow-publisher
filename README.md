# MDFlow Publisher

在 Obsidian 里完成「Markdown 写作 -> 平台预览 -> 一键复制 / 导出」的内容分发插件。当前支持微信公众号、X Articles、小红书。

## 当前能力

### 微信公众号

- Markdown 转公众号可粘贴 HTML
- 6 种排版主题
- 图片自动转 Base64，复制后可直接粘贴到公众号编辑器
- 兼容 Obsidian 原生渲染链路，支持内部图片、任务列表、嵌入等常见写法

### X Articles

- 生成适合直接粘贴的长文 HTML
- 保留更清晰的段落、标题、列表结构

### 小红书

- 3:4 图文卡片预览与导出
- 仅 `Jacky 模板` 带封面页
- 其他主题均为无封面的极简版式，只在文字色和背景色上区分
- 支持模板、字体、字号、头像等设置
- 支持下载当前页、批量导出全部页 ZIP

## 安装

### 手动安装

1. 前往 [Releases](https://github.com/Jackywxsz/mdflow-publisher/releases) 页面下载最新发布包
2. 安装时只需要 `main.js`、`styles.css`、`manifest.json` 这 3 个文件
3. 如果你下载的是压缩包，解压后把这 3 个文件放到你的 Vault 目录：

```text
.obsidian/plugins/mdflow-publisher/
```

4. 重启 Obsidian
5. 在 `设置 -> 第三方插件` 中启用 `MDFlow Publisher`

### 开发模式

```bash
git clone https://github.com/Jackywxsz/mdflow-publisher.git
cd mdflow-publisher
npm install
npm run dev
```

## 使用方式

1. 打开一个 Markdown 文件
2. 点击左侧边栏图标，打开右侧 `MDFlow Publisher` 面板
3. 选择目标平台
4. 根据平台导出：

- 微信公众号：复制到剪贴板后，直接粘贴到公众号编辑器
- X Articles：复制后直接粘贴
- 小红书：下载当前页或导出全部页 ZIP

## 小红书规则

这是当前版本最重要的使用规则。

- `##` 二级标题：作为一个分节的标题，也会显示在图片上方
- `---` 分页符：在同一个二级标题下强制换页
- `###` 三级标题：只作为正文里的小标题，不负责分节
- 如果没有写 `---`，插件会根据内容长度、图片、代码块、列表等做自动分页

### 推荐写法

如果你要稳定控制分页，建议按下面的方式写。

```md
## 这是这一组卡片的标题

开头说明文字。

---

![图片](your-image.png)

这一页继续讲图片对应的内容。

### 这是正文子标题

补充说明。
```

### 推荐排版习惯

- 你希望显示在卡片上方的标题，直接写成 `##`
- 图片较高、代码块较长、列表较多时，优先手动加 `---`
- 一页里不要塞太多长段落，必要时主动拆成两页
- 想做封面时，使用 `Jacky 模板`
- 想快速出图时，优先使用其他无封面极简模板

## 已知限制

- 当前仅支持桌面端 Obsidian，`manifest.json` 中为 `isDesktopOnly: true`
- 小红书自动分页仍然是启发式规则，不是像素级排版引擎
- 长图、超长代码块、超长表格仍可能需要手动插入 `---` 微调
- 极少数外链图片图床可能不稳定，建议优先使用 Obsidian 本地图片或稳定 CDN
- 小红书目前更适合图文卡片导出，不是所见即所得设计器

## 开发

```bash
npm install
npm run dev
npm run build
```

如果你想直接部署到本地 Vault：

```bash
export OBSIDIAN_VAULT_PATH="/path/to/your/vault"
npm run deploy
```

## 技术栈

- TypeScript
- Obsidian API
- Obsidian `MarkdownRenderer`
- `html-to-image`
- `jszip`

## License

[MIT](LICENSE)
