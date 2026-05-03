# AI Content Radar（MVP v1）

第一版实现：
- 每天抓取 Hacker News Top 10
- 使用 Workers AI 生成中文标题与摘要
- 写入 Cloudflare D1
- 使用 Pages Function 提供 `/api/articles`
- 使用 `public/index.html` 展示后台列表

## 1) 安装依赖

```bash
npm install
```

## 2) 登录 Cloudflare

```bash
npx wrangler login
```

## 3) 创建 D1 数据库

```bash
npx wrangler d1 create content-db
```

创建后会返回 `database_id`，把它填入 `wrangler.toml` 的 `[[d1_databases]]` 配置中：

```toml
[[d1_databases]]
binding = "DB"
database_name = "content-db"
database_id = "你的真实 database_id"
```

## 4) 初始化数据库表结构

本地初始化：

```bash
npx wrangler d1 execute content-db --local --file=schema.sql
```

远程初始化：

```bash
npx wrangler d1 execute content-db --remote --file=schema.sql
```

## 5) 本地开发

```bash
npm run dev
```

## 6) 部署 Worker

```bash
npx wrangler deploy
```

## 7) Cloudflare Pages 部署说明（public + functions）

1. 在 Cloudflare Pages 创建项目并连接仓库。
2. 构建设置：
   - Build command: 可留空（纯静态 + Functions）
   - Build output directory: `public`
3. Pages 会自动识别 `functions/` 目录并部署 API（例如 `/api/articles`）。
4. 在 Pages 项目设置中绑定 D1：
   - Binding 名称填 `DB`
   - 绑定到 `content-db`
5. 重新部署后，访问站点首页即可查看列表页。

## 定时任务

`wrangler.toml` 中已配置 Cron：
- `0 0 * * *`（每天 UTC 00:00 执行）

## 脚本

- `npm run dev`：本地启动 Wrangler
- `npm run deploy`：部署 Worker
- `npm run d1:local`：本地执行 `schema.sql`
- `npm run d1:remote`：远程执行 `schema.sql`
