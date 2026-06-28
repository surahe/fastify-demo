# fastify-demo

一个聚焦学习的 `Fastify + TypeScript` 最小 BFF 模板。

- 新手阅读导图：`docs/LEARNING_MAP.md`
- BFF 方案说明：`docs/demo.md`
- 结构迁移说明：`docs/迁移说明.md`
- 纯 BFF TODO：`docs/BFF约束清单.md`

## 项目目标

这个项目不再追求“路由越多越像真实业务”，而是只保留最值得学习的骨架：

- `config/`：集中读取和校验环境变量
- `errors/`：统一错误类和错误码
- `lib/`：缓存、HTTP client、metrics 等基础能力
- `modules/live/`：唯一保留的业务模块，用来演示聚合接口
- `plugins/core/`：日志、限流、平台能力注册
- `plugins/routes/`：通过 `@fastify/autoload` 自动注册路由插件
- `types/`：Fastify 实例扩展类型

## 可用脚本

- `pnpm dev`：开发模式启动服务
- `pnpm build`：编译 TypeScript 到 `dist`
- `pnpm start`：先构建再启动
- `pnpm check`：顺序执行 `typecheck`、`lint`、`test`
- `pnpm typecheck`：执行 TypeScript 类型检查
- `pnpm lint`：执行 ESLint 检查
- `pnpm format`：使用 Prettier 自动格式化
- `pnpm format:check`：检查格式是否符合 Prettier
- `pnpm test`：运行基础测试

## 环境变量

- `NODE_ENV`：运行环境，支持 `development`、`test`、`production`
- `HOST`：服务监听地址，默认 `0.0.0.0`
- `PORT`：服务端口，默认 `3000`
- `LOG_LEVEL`：日志级别，默认 `info`
- `REQUEST_ID_HEADER`：请求 ID 头，默认 `x-request-id`
- `TRUST_PROXY`：是否信任反向代理透传头，默认 `true`
- `CORS_ALLOWED_ORIGINS`：允许跨域的来源列表，使用逗号分隔
- `RATE_LIMIT_MAX`：全局限流阈值
- `RATE_LIMIT_WINDOW`：限流时间窗口
- `SWAGGER_ENABLED`：是否启用 Swagger 文档，生产环境默认关闭
- `SWAGGER_ROUTE_PREFIX`：Swagger UI 路径，默认 `/docs`
- `UNDER_PRESSURE_RETRY_AFTER`：过载保护返回的建议重试秒数
- `UNDER_PRESSURE_MAX_EVENT_LOOP_DELAY`：事件循环延迟阈值
- `CACHE_TTL_MS`：基础缓存 TTL
- `UPSTREAM_TIMEOUT_MS`：下游调用超时时间
- 项目通过 `dotenv` 自动读取 `.env`
- 项目通过 `zod` 校验环境变量格式
- `config/index.ts` 内部已按 `app / server / fastify / cors / rateLimit / docs / underPressure / cache / upstream` 拆分小 schema，再合并成统一 `envSchema`
- 可以参考项目中的 `.env.example` 自行创建本地环境变量

## 为什么现在更小

这版模板只保留一个核心业务接口，因为你当前最需要看懂的是：

- Fastify 应用如何启动和组装
- plugin 如何注册平台能力
- 一个模块如何走 `schema -> controller -> service`
- 聚合接口如何做降级和统一返回

把这些学透，比同时看很多演示路由更有价值。

## 目录约定

- 模块内类型统一放在 `xxx.types.ts`，例如 `modules/live/live.types.ts`
- 模块内 schema 统一放在 `xxx.schema.ts`，例如 `modules/live/live.schema.ts`
- `plugins/core/` 的文件名只保留职责名称，不再用数字前缀控制顺序
- `plugins/core/` 的真正注册顺序统一写在 `app.ts`，这样更适合学习和后续调整

## 请求流转

- 启动时先执行 `server.ts`，读取 `config/index.ts` 中整理好的环境变量配置
- `server.ts` 调用 `buildApp()` 创建 Fastify 实例
- `app.ts` 先显式注册 `plugins/core/`，顺序由代码控制
- `plugins/routes/` 继续通过 `@fastify/autoload` 自动加载
- `plugins/core/` 先注册请求上下文、安全、跨域、平台能力、日志、限流、文档和过载保护
- `plugins/routes/` 只继续注册 `health`、`metrics` 和 `live`
- 请求进入后，Fastify 会先按模块 schema 做参数校验
- 校验通过后，controller 调用 service，service 负责聚合、降级和返回结构

## 执行链路示意

```text
server.ts
  -> config/index.ts
  -> app.ts
     -> plugins/core/request-context.ts
     -> plugins/core/security.ts
     -> plugins/core/cors.ts
     -> plugins/core/platform.ts
     -> plugins/core/observability.ts
     -> plugins/core/rate-limit.ts
     -> plugins/core/docs.ts
     -> plugins/core/under-pressure.ts
     -> plugins/routes/health.ts
     -> plugins/routes/metrics.ts
     -> plugins/routes/live.ts
        -> modules/live/live.routes.ts
           -> modules/live/live.schema.ts
           -> modules/live/live.controller.ts
           -> modules/live/live.types.ts
              -> modules/live/live.service.ts
```

## 已有接口

- `GET /health`：健康检查
- `GET /readiness`：服务就绪检查
- `GET /metrics`：基础监控指标快照
- `GET /api/live/rooms/:roomId/aggregate`：可降级聚合接口演示
- `GET /docs`：开发环境下的 Swagger UI

## 测试覆盖

- `GET /health` 成功返回
- `GET /readiness` 成功返回
- `GET /metrics` 返回基础指标
- `GET /api/live/rooms/:roomId/aggregate` 默认返回完整聚合数据
- `GET /api/live/rooms/:roomId/aggregate` 支持部分失败降级返回
- 未知路由返回 `404`

## 最小 CI

- 仓库已提供最小 GitHub Actions 工作流：`.github/workflows/ci.yml`
- 触发时机：`push` 到 `main/master`，以及 `pull_request`
- CI 只做两件事：
    - `pnpm install --frozen-lockfile`
    - `pnpm check`

这样可以保证这个模板在远端仓库里也能持续通过最基础的质量校验。
