# 📝 日报月报助手

> 基于 **EdgeOne Pages + AI** 的个人工作日报润色与月报自动生成工具

[![EdgeOne Pages](https://img.shields.io/badge/EdgeOne-Pages-blue)](https://edgeone.ai)
[![Vue 3](https://img.shields.io/badge/Vue-3.x-42b883)](https://vuejs.org)
[![Vite](https://img.shields.io/badge/Vite-5.x-646cff)](https://vitejs.dev)
[![OpenAI](https://img.shields.io/badge/OpenAI-gpt--4o-412991)](https://openai.com)

---

## 目录

- [功能介绍](#功能介绍)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [本地开发](#本地开发)
- [部署到 EdgeOne Pages](#部署到-edgone-pages)
  - [1. 创建 EdgeOne Pages 项目](#1-创建-edgeone-pages-项目)
  - [2. 创建并绑定 KV 存储](#2-创建并绑定-kv-存储)
  - [3. 配置环境变量](#3-配置环境变量)
  - [4. 构建与部署](#4-构建与部署)
- [数据结构说明](#数据结构说明)
- [API 接口说明](#api-接口说明)
- [常见问题](#常见问题)

---

## 功能介绍

### ✍️ 日报润色

每天工作结束后，用口语化的方式记录当天工作内容，点击「AI 润色」即可：

- 自动生成正式、书面化的日报文案
- 自动生成概括当天工作的标题
- 润色结果完全可编辑，不满意可以手动调整
- 保存时**同时保留原文和润色文案**，随时可回溯
- 支持按日期查看、修改、删除历史日报

### 📊 月报生成

月末一键生成月度工作计划与考核表所需内容：

- 自动读取当月所有日报（润色文案）
- AI 按工作类型归纳为多行，每行包含：
  - 计划工作内容/指标
  - 目标结果/指标描述
  - 权重（%）
  - 考核评分标准
  - 完成情况评价
  - 自我得分
- 生成结果完全可编辑，支持增删行
- **权重实时校验**：合计不等于 100% 时高亮提示
- 支持保存草稿，下次打开自动恢复

---

## 技术栈

| 层次 | 技术方案 | 说明 |
|------|----------|------|
| 前端框架 | [Vue 3](https://vuejs.org) + [Vite 5](https://vitejs.dev) | 组件化开发，热更新 |
| 状态管理 | [Pinia](https://pinia.vuejs.org) | Vue 官方推荐状态库 |
| 前端路由 | [Vue Router 4](https://router.vuejs.org) | SPA 路由 |
| 后端逻辑 | [EdgeOne Pages Functions](https://cloud.tencent.com/document/product/1552) | 边缘函数，处理 KV 读写和 AI 代理 |
| 数据存储 | [EdgeOne KV](https://cloud.tencent.com/document/product/1552) | 键值存储，无需数据库 |
| AI 模型 | [OpenAI GPT-4o](https://openai.com) | 日报润色 & 月报生成，Streaming 流式输出 |
| 部署平台 | [EdgeOne Pages](https://edgeone.ai) | 全球边缘节点托管 |

---

## 项目结构

```
edgeone-daily/
├── functions/                        # EdgeOne Pages Functions（后端接口）
│   ├── _middleware.js                # 全局中间件（CORS、错误处理）
│   └── api/
│       ├── ai/
│       │   └── polish.js             # POST /api/ai/polish（AI 日报润色，SSE Streaming）
│       ├── daily/
│       │   ├── [date].js             # GET/PUT/DELETE /api/daily/:date（单条日报 CRUD）
│       │   └── list.js               # GET /api/daily/list?month=YYYY-MM（按月列表）
│       └── monthly/
│           ├── [month].js            # GET/PUT /api/monthly/:month（月报草稿读写）
│           └── generate.js           # POST /api/monthly/generate（AI 月报生成，SSE Streaming）
│
├── src/                              # 前端源码（Vite + Vue3）
│   ├── api/
│   │   └── index.js                  # 前端 API 封装（含 SSE Streaming 处理）
│   ├── components/
│   │   ├── DailyEditor.vue           # 日报编辑器（原文输入 + AI 润色结果）
│   │   ├── MonthlyTable.vue          # 月报可编辑表格
│   │   └── WeightAlert.vue           # 权重校验提示组件
│   ├── router/
│   │   └── index.js                  # 路由配置
│   ├── stores/
│   │   ├── daily.js                  # 日报 Pinia Store
│   │   └── monthly.js                # 月报 Pinia Store
│   ├── styles/
│   │   └── index.css                 # 全局 CSS 设计系统（深色主题）
│   ├── views/
│   │   ├── DailyView.vue             # 日报编辑页
│   │   ├── DailyListView.vue         # 日报列表页
│   │   └── MonthlyView.vue           # 月报生成页
│   ├── App.vue                       # 根组件（侧边栏导航 + 全局 Toast）
│   └── main.js                       # 入口文件
│
├── public/
│   └── favicon.svg
├── .dev.vars.example                 # 本地开发环境变量模板
├── .gitignore
├── index.html
├── package.json
└── vite.config.js
```

---

## 本地开发

### 前置要求

- [Node.js](https://nodejs.org) >= 18
- [EdgeOne CLI](https://cloud.tencent.com/document/product/1552)（用于本地运行 Functions + KV）
- OpenAI API Key

### 1. 克隆并安装依赖

```bash
# 进入项目目录
cd edgeone-daily

# 安装依赖（国内推荐使用淘宝镜像）
npm install --registry https://registry.npmmirror.com
```

### 2. 安装 EdgeOne CLI

```bash
npm install -g edgeone
```

登录腾讯云账号并关联项目：

```bash
edgeone login
edgeone pages link
```

> 💡 **环境变量说明**：后端 Functions 代码（如 AI 润色、月报生成）均通过 `context.env.OPENAI_API_KEY` 读取 EdgeOne Pages 项目中配置的环境变量。本地使用 `edgeone pages dev` 开发时，EdgeOne CLI 会自动拉取关联项目的线上环境变量。

### 3. 本地启动（两种方式）

**方式一：仅开发前端 UI（不启动 Functions）**

适合纯界面开发，API 请求会失败但不影响组件渲染调试：

```bash
npm run dev
# 访问 http://localhost:5173
```

**方式二：完整本地开发（推荐）**

同时启动 Vite 开发服务器 和 EdgeOne Pages 本地模拟环境：

```bash
# 终端 1：启动 EdgeOne Pages 本地服务（自动同步 EdgeOne 环境变量与 KV 绑定）
edgeone pages dev --port 8788

# 终端 2：启动 Vite 前端开发服务器（代理到 8788）
npm run dev
# 访问 http://localhost:5173
```

> `vite.config.js` 已配置 `/api` 路径代理到 `localhost:8788`，两个服务同时运行即可完整调试所有功能。

---

## 部署到 EdgeOne Pages

### 1. 创建 EdgeOne Pages 项目

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com)
2. 进入 **边缘安全加速平台 EO** → **Pages**
3. 点击「创建项目」，选择「直接上传」或关联 Git 仓库

   **推荐：关联 Git 仓库（自动 CI/CD）**
   - 将本项目推送到 GitHub / GitLab / Gitee
   - 在 EdgeOne Pages 控制台选择「连接 Git」，授权并选择仓库
   - 构建配置：
     - **构建命令**：`npm install --registry https://registry.npmmirror.com && npm run build`
     - **输出目录**：`dist`
     - **根目录**：`/`（默认）

### 2. 创建并绑定 KV 存储

> KV 存储用于存放所有日报和月报草稿数据，是本项目唯一的持久化存储。

#### 2.1 创建 KV 命名空间

1. 在 EdgeOne 控制台，进入 **Pages 项目** → **KV 存储**
2. 点击「创建命名空间」
3. 名称填写：`daily-kv`（或任意名称，后续绑定时对应即可）

#### 2.2 绑定到 Pages 项目

1. 进入 **Pages 项目** → **设置** → **扩展服务** → **KV 存储绑定**
2. 点击「添加绑定」：
   - **变量名**：`DAILY_KV`（必须与代码中一致，不可更改）
   - **命名空间**：选择刚才创建的 `daily-kv`
3. 点击「保存」

> 代码中通过 `context.env.DAILY_KV` 访问 KV 存储，变量名必须为 `DAILY_KV`。

### 3. 配置环境变量

1. 进入 **Pages 项目** → **设置** → **环境变量**
2. 点击「添加变量」配置 EdgeOne AI Gateway 或兼容 OpenAI 规范的大模型接口参数（**默认适配 EdgeOne AI Gateway**）：

   | 变量名 | 必填 | 默认值 | 说明 |
   |--------|------|--------|------|
   | `MAKERS_MODELS_KEY` / `OPENAI_API_KEY` | **是** | - | EdgeOne AI Gateway API Key 或 OpenAI API Key |
   | `OPENAI_BASE_URL` | 否 | `https://ai-gateway.edgeone.link/v1` | 大模型 API 服务地址（默认适配 EdgeOne AI Gateway） |
   | `OPENAI_MODEL` | 否 | `@makers/deepseek-v4-flash` | 所调用的模型名称（默认使用 EdgeOne Agents 推荐模型） |

3. 点击「保存」，**需要重新部署**才能生效

> ✅ 安全说明：API Key 与接口配置只存储在 EdgeOne 环境变量中，由边缘函数在服务端发起请求，前端代码无法访问，确保安全。

### 4. 构建与部署

#### 方式一：Git 自动部署（推荐）

关联 Git 仓库后，每次 `git push` 到主分支会自动触发构建和部署，无需手动操作。

```bash
git add .
git commit -m "feat: 初始化项目"
git push origin main
```

#### 方式二：手动上传

```bash
# 本地构建
npm run build

# 将 dist/ 目录的内容上传到 EdgeOne Pages
# 可在控制台「部署」页面手动上传 dist.zip
```

#### 方式三：EdgeOne CLI 部署

```bash
# 登录
edgeone login

# 关联项目（首次使用）
edgeone pages link

# 部署
edgeone pages deploy
```

### 5. 验证部署

部署完成后，访问 EdgeOne 分配的域名（格式类似 `https://xxxx.edgeone.app`），检查：

- [ ] 侧边栏导航正常显示
- [ ] 「写日报」页面可以输入文本
- [ ] 点击「AI 润色」能正常调用 AI（需要 API Key 正确配置）
- [ ] 日报保存后在「日报列表」中可见
- [ ] 「月报生成」页面能正常读取日报数量并生成月报

---

## 数据结构说明

所有数据存储在 EdgeOne KV 中，按以下 key 前缀区分：

### 日报记录

**Key 格式**：`daily:YYYY-MM-DD`（例：`daily:2026-07-31`）

```json
{
  "date": "2026-07-31",
  "raw": "今天上午修了登录的 bug，下午开了需求会，晚上写了接口文档",
  "title": "修复登录缺陷并推进新功能需求评审",
  "polished": "今日完成登录模块缺陷修复工作，深入排查并解决了影响用户登录的核心问题...",
  "updatedAt": "2026-07-31T18:30:00.000Z"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `date` | string | 日期，`YYYY-MM-DD` 格式 |
| `raw` | string | 原始口语化记录 |
| `title` | string | AI 生成的标题（可编辑） |
| `polished` | string | AI 润色后的正式文案（可编辑） |
| `updatedAt` | string | 最后更新时间（ISO 8601） |

### 月报草稿

**Key 格式**：`monthly:YYYY-MM`（例：`monthly:2026-07`）

```json
{
  "month": "2026-07",
  "rows": [
    {
      "plan": "需求分析与评审",
      "target": "完成月度核心需求的评审与确认，输出需求文档",
      "weight": 30,
      "standard": "需求文档完整、评审通过率≥90%",
      "completion": "完成3次需求评审会，输出需求文档2份，评审通过率100%",
      "score": 95
    }
  ],
  "updatedAt": "2026-07-31T20:00:00.000Z"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `month` | string | 年月，`YYYY-MM` 格式 |
| `rows` | array | 月报行数据数组 |
| `rows[].plan` | string | 计划工作内容/指标 |
| `rows[].target` | string | 目标结果/指标描述 |
| `rows[].weight` | number | 权重（整数，所有行合计=100） |
| `rows[].standard` | string | 考核评分标准 |
| `rows[].completion` | string | 完成情况评价 |
| `rows[].score` | number | 自我得分（0-100） |
| `updatedAt` | string | 最后更新时间 |

---

## API 接口说明

所有接口由 EdgeOne Pages Functions 实现，前缀为 `/api`。

### 日报接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/daily/:date` | 读取单条日报，`:date` 格式为 `YYYY-MM-DD` |
| `PUT` | `/api/daily/:date` | 保存/更新日报 |
| `DELETE` | `/api/daily/:date` | 删除日报 |
| `GET` | `/api/daily/list?month=YYYY-MM` | 获取指定月份日报列表（摘要） |

### 月报接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/monthly/:month` | 读取月报草稿，`:month` 格式为 `YYYY-MM` |
| `PUT` | `/api/monthly/:month` | 保存月报草稿 |
| `POST` | `/api/monthly/generate` | 触发 AI 月报生成（SSE Streaming） |

### AI 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/ai/polish` | 日报 AI 润色（SSE Streaming） |

#### Streaming 响应格式

AI 接口使用 Server-Sent Events（SSE）流式返回，格式如下：

```
data: {"type":"chunk","text":"..."}    ← 实时输出的文本片段
data: {"type":"done","result":{...}}   ← 完整的最终结果（JSON）
data: {"type":"error","message":"..."}  ← 发生错误时
```

---

## 常见问题

### Q: AI 润色点击无响应或报错？

**A:** 请检查：
1. `OPENAI_API_KEY` 是否已在 EdgeOne 环境变量中正确配置
2. API Key 是否有余额，可在 [OpenAI 控制台](https://platform.openai.com/usage) 查看
3. 网络是否可以访问 `api.openai.com`（如需要，可考虑配置代理或使用国内中转 API）

### Q: 本地开发时 API 请求报 ECONNREFUSED？

**A:** 这是因为 EdgeOne Pages 本地服务（端口 8788）未启动。需要同时运行：
```bash
edgeone pages dev --port 8788   # 终端 1
npm run dev                      # 终端 2
```

### Q: 月报生成等待很久没有结果？

**A:** 月报生成需要将当月所有日报拼接后发给 AI，token 量较大，正常需要 **10~30 秒**。页面会实时显示 AI 的流式输出，等待即可。如果超过 60 秒无响应，可能是网络超时，刷新后重试。

### Q: KV 数据更新后在其他地方看不到？

**A:** EdgeOne KV 采用最终一致性模型，默认缓存 TTL 为 60 秒。在部分边缘节点上，写入后最多需要 60 秒才能同步。个人使用场景下，同一地区访问通常几乎无延迟。

### Q: 如何备份数据？

**A:** 目前无内置备份功能。可以在 EdgeOne 控制台的「KV 存储」页面手动导出数据，或通过 EdgeOne API 批量读取后保存为本地文件。

### Q: 可以自定义大模型或接口地址吗（如 DeepSeek、通义千问、Moonshot 等）？

**A:** **可以，完全无需修改源码！** 系统接口完全兼容 OpenAI 规范。只需在 EdgeOne 控制台的「设置」→「环境变量」中添加以下变量即可：

- `OPENAI_BASE_URL`: 填入大模型服务商提供的 OpenAI 兼容接口地址（例：`https://api.deepseek.com/v1` 或 `https://dashscope.aliyuncs.com/compatible-mode/v1`）
- `OPENAI_MODEL`: 填入对应模型名称（例：`deepseek-chat`、`qwen-max` 等）

---

## 许可证

MIT License

---

> 🚀 **Powered by [EdgeOne Pages](https://edgeone.ai)** — 腾讯云边缘安全加速平台
