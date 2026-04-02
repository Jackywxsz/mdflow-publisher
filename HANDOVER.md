# MDFlow Publisher 交接文档

更新时间：2026-04-01 20:24（Asia/Shanghai）

## 1. 项目目标

这是一个 Obsidian 插件，目标是在 Obsidian 内完成一套内容分发闭环：

- 微信公众号：Markdown -> 公众号可直接粘贴的 HTML
- X Articles：Markdown -> 长文可直接复制的语义化 HTML
- 小红书：Markdown -> 多页图文卡片 -> PNG / ZIP 导出

当前重点开发对象是小红书链路。

## 2. 当前状态

当前版本已经完成：

- 使用 Obsidian 原生 `MarkdownRenderer` 渲染 Markdown
- 微信公众号导出重构完成
- X Articles 导出重构完成
- 小红书预览/导出从“拼字符串样式卡片”切到“Banpie 风格单卡预览 + DOM 截图导出”
- 小红书设置体系已经接入插件持久化
- 小红书模板体系已经接入
- 小红书作者介绍弹窗已经支持上传导流素材
- 构建与部署脚本已打通

已部署到实际 Obsidian 插件目录：

- `<YOUR_VAULT>/.obsidian/plugins/mdflow-publisher`

当前部署产物时间：

- `main.js` 2026-04-01 20:24
- `styles.css` 2026-04-01 20:24
- `manifest.json` 2026-04-01 20:24

## 3. 当前项目结构

核心目录：

- `src/main.ts`
- `src/view.ts`
- `src/converter.ts`
- `src/exporters/`
- `src/rednote/`
- `src/themes/`
- `src/styles.css`

关键模块说明：

### `src/main.ts`

- 插件入口
- 注册右侧侧边栏视图 `MDFlowView`
- 加载 `RedNoteSettingsManager`
- 注册插件设置页 `MDFlowSettingTab`

### `src/view.ts`

- 右侧主面板 UI
- 平台切换：微信 / X / 小红书
- 小红书顶部工具栏：
  - 模板
  - 字体
  - 字号
  - 分页标题级别
  - 上传头像
  - 上传封面
  - 作者介绍
  - 更多设置

### `src/converter.ts`

- 已改为 Obsidian 原生 Markdown 渲染
- 解决 `![[image]]`、任务列表、内部链接等兼容性问题

### `src/exporters/wechat-exporter.ts`

- 微信公众号 HTML 导出
- 已重写

### `src/exporters/x-exporter.ts`

- X Articles 语义 HTML 导出
- 已重写

### `src/exporters/rednote-exporter.ts`

- 小红书主逻辑核心文件
- 当前负责：
  - 从渲染后的 HTML 提取章节
  - 按标题级别拆分大章节
  - 按内容权重自动分页
  - 生成封面页 / 内容页
  - 渲染 Banpie 风格卡片结构
  - 导出 PNG / ZIP

### `src/rednote/types.ts`

- 小红书设置类型定义
- 默认用户信息、导流信息、图片素材字段都在这里

### `src/rednote/template-presets.ts`

- 小红书模板预设
- 当前已接入：
  - `banpie-cover`
  - `default`
  - `minimal`
  - `elegant`
  - `cyber`
  - `warm`
  - `forest`
  - `ocean`
  - `sakura`
  - `starry`
  - `metal`
  - `yueling`

### `src/rednote/settings-manager.ts`

- 小红书设置持久化
- 调用 Obsidian `loadData()/saveData()`
- 当前保存结构为：

```ts
{
  rednote: {
    templateId,
    fontFamily,
    fontSize,
    headingLevel,
    userAvatar,
    userName,
    userId,
    showTime,
    timeFormat,
    notesTitle,
    brandTagline,
    footerLeftText,
    footerRightText,
    coverImage,
    aboutTitle,
    aboutBio,
    aboutCallout,
    supportTitle,
    supportText,
    supportQrImage,
    supportBannerImage,
    officialTitle,
    officialText,
    officialQrImage,
    officialBannerImage
  }
}
```

### `src/rednote/about-modal.ts`

- 作者介绍弹窗
- 当前已支持：
  - 作者头像
  - 作者介绍正文
  - 赞赏区
  - 公众号导流区
  - 二维码 / 海报图占位

### `src/setting-tab.ts`

- 插件设置页
- 当前已支持：
  - 模板
  - 字体
  - 字号
  - 标题级别
  - 用户名 / ID
  - 时间展示
  - 头像 / 封面上传
  - 作者介绍文案
  - 赞赏区素材
  - 公众号导流素材

## 4. 小红书当前实现逻辑

### 4.1 分页逻辑

当前逻辑不是“固定按二级标题”。

现在是两层：

1. 按用户选择的标题级别做“大章节拆分”
   - `h1` -> `#`
   - `h2` -> `##`
   - `h3` -> `###`

2. 每个大章节内部再按内容权重自动分页
   - 段落、列表、图片、代码块、blockquote、table 有不同权重
   - 长段落会提高权重
   - 字号越大，每页允许的内容越少

当前相关代码入口：

- `extractSections()`
- `paginateSection()`
- `paginateGroup()`
- `getNodeWeight()`

文件：

- `src/exporters/rednote-exporter.ts`

### 4.2 预览结构

当前预览结构：

- 头部：头像 + 用户名 + 蓝 V + ID + 右侧标签/日期
- 正文：单页显示
- 底部：页脚双文案
- 下方：分页按钮

封面模板会隐藏头尾，只保留封面视觉。

### 4.3 导出方式

- 基于 `.red-image-preview` 实际 DOM
- 使用 `html-to-image` 截图
- 多页用 `jszip` 打包

## 5. 参考来源

微信公众号参考仓库：

- https://github.com/Jackywxsz/MD_flow

Banpie 参考插件本地路径：

- Banpie 插件（本地参考）

之前小红书相关实现，很多结构是参考 Banpie 的：

- 单卡预览
- 左右翻页
- 封面页样式
- 模板化视觉变量
- 作者介绍 / 导流思路

但当前项目并不是 1:1 复制 Banpie，而是做了“适配当前 MDFlow 架构”的融合版本。

## 6. 已完成的关键改动

### 通用层

- `converter.ts` 改为 Obsidian 原生渲染
- `exporters/types.ts` 增加平台统一 prepare/export 流程
- `view.ts` 改成按平台 prepare preview/export

### 微信 / X

- 微信导出逻辑重写
- X 导出逻辑重写

### 小红书

- 旧版 gallery 卡片已废弃
- 改为 Banpie 风格单页预览
- 新增模板预设
- 新增小红书设置持久化
- 新增小红书设置页
- 新增上传头像、封面
- 新增作者介绍弹窗
- 新增赞赏 / 公众号素材配置字段
- 头像改为圆形
- 名字后面改为蓝 V 图标
- 去掉正文顶部重复标签

### 工程化

- `esbuild.config.mjs` 已处理样式/manifest 同步
- `package.json` 的 `deploy` 已可直接部署到 Obsidian 插件目录

## 7. 当前已知问题

### P1. 小红书分页仍需继续打磨

虽然已经改成“按选中标题级别拆分 + 自动分页”，但实际文章中仍然可能出现：

- 单页内容偏多
- 某些长段落视觉上还是过满
- 不同模板下分页节奏不一致

建议继续优化方向：

- 降低 `paginateGroup()` 的页容量
- 对不同模板定义不同 `maxWeight`
- 依据实际 `scrollHeight` 动态分页，而不是只看内容权重

### P1. 作者介绍还只是“可配置面板”，未完全做成最终成品

目前作者介绍弹窗已经支持：

- 文案
- 二维码
- 海报图

但还没有完全做成用户截图中的最终导流视觉稿。

下一步应做：

- 更接近截图 4 的版面
- 支持多个模块显隐
- 支持自定义标题颜色 / 卡片背景 / 模块排序

### P1. 小红书预览顶部工具栏还不够接近 Banpie 原版

当前是 Obsidian 原生 `select/input/button`，功能够用，但视觉还不够像 Banpie。

下一步可以：

- 自定义 select 组件
- 加锁实时预览按钮
- 加帮助按钮
- 加下载当前页 / 导出全部页两个独立按钮

### P2. 当前“作者介绍”还是弹窗，不是导出页

现在“作者介绍”按钮打开的是弹窗，不参与 PNG 导出。

如果希望做成真正的小红书导流最后一页，需要：

- 把作者介绍做成可插入卡片页
- 允许在导出时包含“导流尾页”

### P2. 小红书设置页和顶部工具栏有字段重复

现在是：

- 顶部工具栏：高频操作
- 设置页：完整配置

这是故意的，但后续需要更清晰地分层。

建议：

- 顶部工具栏只保留：模板 / 字号 / 标题级别 / 上传头像 / 上传封面
- 其它所有内容放设置页

## 8. 用户最近一次明确反馈

用户指出的问题：

1. 内容显示不全
2. 选择不同标题级别时内容变化不明显
3. 头像不是圆形，周边有裁切问题
4. 名字后面缺少蓝 V
5. 作者介绍作用不明确，希望做成真正可导流的内容
6. “创作者AI课”标签重复，需要去掉一个

其中本轮已处理：

- 头像圆形
- 蓝 V
- 去重标签
- 扩展作者介绍配置
- 调整分页逻辑

但还需要用户复测确认。

## 9. 接手后建议优先级

### 第一优先级

- 用真实长文继续测小红书分页
- 检查不同模板下的卡片截断
- 如果还是截断，直接改成“根据渲染高度分页”

### 第二优先级

- 把“作者介绍”做成导出尾页，而不只是弹窗
- 支持导流页开关
- 支持二维码 / 海报布局切换

### 第三优先级

- 顶部控制栏做成更接近 Banpie 的 UI
- 做更强的模板编辑能力

## 10. 用户需要提供的素材

如果继续做作者介绍 / 导流成品化，需要用户提供：

- 最终用户名
- 最终账号 ID
- 头像图
- 赞赏二维码
- 赞赏海报
- 公众号二维码
- 公众号搜索页或宣传图
- 最终作者介绍文案
- 最终公众号导流文案

## 11. 开发命令

项目目录：

- 项目根目录

常用命令：

```bash
npm install
npm run build
npm run dev
npm run deploy
```

说明：

- `npm run build`：类型检查 + 生产构建
- `npm run dev`：监听构建
- `npm run deploy`：构建后复制到实际 Obsidian 插件目录

## 12. 测试入口

当前测试文档路径：

- Obsidian Vault 中的测试 Markdown 文件

建议测试方式：

1. 打开测试文档
2. 在 Obsidian 右侧打开 `MDFlow Publisher`
3. 切换到 `📕 小红书`
4. 改模板 / 改标题级别 / 改字号
5. 导出 ZIP 观察每页是否被截断

## 13. 关键文件清单

最值得继续改的文件：

- `src/exporters/rednote-exporter.ts`
- `src/view.ts`
- `src/styles.css`
- `src/rednote/about-modal.ts`
- `src/rednote/types.ts`
- `src/rednote/settings-manager.ts`
- `src/setting-tab.ts`

次要但相关：

- `src/converter.ts`
- `src/exporters/dom-utils.ts`
- `src/images/image-resolver.ts`

## 14. 接手建议

如果交给另一个工具继续开发，建议直接从下面两条线切入：

### 路线 A：先把小红书做稳

- 重点改 `src/exporters/rednote-exporter.ts`
- 目标：彻底解决分页和截断问题

### 路线 B：先把作者介绍做成成品

- 重点改 `src/rednote/about-modal.ts` + `src/styles.css` + `src/setting-tab.ts`
- 目标：让用户能直接上传导流素材，生成接近截图 4 的最终效果

---

如果继续开发时需要快速定位最新改动，先看这几个文件：

- `src/exporters/rednote-exporter.ts`
- `src/view.ts`
- `src/rednote/types.ts`
- `src/rednote/about-modal.ts`
- `src/setting-tab.ts`
