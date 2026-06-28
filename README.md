# fastify-demo

一个聚焦学习的 `Fastify + TypeScript` 最小 BFF 模板。

## 项目定位

这个项目不是为了堆很多演示接口，而是为了先搭一套最小可用的 BFF 工程骨架。

当前重点是看懂：

- Fastify 应用怎么启动和组装
- core plugins 怎么注册平台能力
- 一个模块怎么走 `schema -> controller -> service`
- 聚合接口怎么做部分失败降级

## 快速开始

1. 复制环境变量模板：

```powershell
Copy-Item .env.example .env
```

2. 安装依赖：

```bash
pnpm install
```

3. 启动开发服务：

```bash
pnpm dev
```

## 常用脚本

- `pnpm dev`：开发模式启动服务
- `pnpm build`：编译 TypeScript 到 `dist`
- `pnpm start`：先构建再启动
- `pnpm check`：顺序执行 `typecheck`、`lint`、`test`
- `pnpm format`：按当前 Prettier 规则格式化仓库
- `pnpm format:check`：检查格式是否符合 Prettier

## 当前接口

- `GET /health`
- `GET /readiness`
- `GET /metrics`
- `GET /api/live/rooms/:roomId/aggregate`
- `GET /docs`

## 目录摘要

- `config/`：环境变量读取、校验和配置整理
- `errors/`：统一错误类和错误码
- `lib/`：缓存、HTTP client、metrics 等基础能力
- `plugins/core/`：平台能力插件
- `plugins/routes/`：平台路由和业务模块入口
- `modules/live/`：唯一保留的业务演示模块
- `types/`：Fastify 类型扩展

## 文档入口

- [LEARNING_MAP.md](docs/LEARNING_MAP.md)：怎么读这套代码
- [demo.md](docs/demo.md)：项目定位和演示价值
- [迁移说明.md](docs/%E8%BF%81%E7%A7%BB%E8%AF%B4%E6%98%8E.md)：哪些内容适合迁移到真实项目
- [BFF约束清单.md](docs/BFF%E7%BA%A6%E6%9D%9F%E6%B8%85%E5%8D%95.md)：当前状态和 TODO

## 环境变量

常见项：

- `NODE_ENV`
- `HOST`
- `PORT`
- `LOG_LEVEL`
- `REQUEST_ID_HEADER`
- `CORS_ALLOWED_ORIGINS`
- `SWAGGER_ENABLED`
- `SWAGGER_ROUTE_PREFIX`
- `UPSTREAM_TIMEOUT_MS`

完整说明请看：

- [.env.example](.env.example)
- [index.ts](config/index.ts)

## 一句话总结

```text
这是一个用于学习和沉淀 BFF 工程骨架的最小 Fastify 模板。
```
