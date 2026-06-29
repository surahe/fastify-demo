# fastify-demo AGENTS

## 项目定位

这个仓库是一个用于学习 `Fastify + TypeScript` 的最小 BFF 模板。

它不是为了堆很多演示接口，而是为了把后续直播 H5 BFF 最核心的工程主链路先跑通、看懂、沉淀下来。

当前最重要的目标有 4 个：

- 看懂 Fastify 应用如何启动和组装
- 看懂 BFF 如何做参数校验、错误收口和统一响应
- 看懂聚合接口如何在部分下游失败时做降级
- 看懂日志、限流、缓存、监控这些平台能力如何接入

一句话理解：

`这是一个面向直播 H5 BFF 的学习型工程骨架，不是可直接上线的完整业务项目。`

## 你在这个仓库里应该优先理解什么

如果你是人或 AI，需要先抓住这个项目真正的学习重点，而不是被文件数量带偏。

核心只有一条链路：

`server -> app -> core plugins -> route plugin -> live module -> schema -> controller -> service`

其中：

- `server.ts` 负责启动服务
- `app.ts` 负责创建 Fastify 实例、注册插件、收口错误
- `plugins/core/` 负责平台能力注册
- `plugins/routes/` 负责挂业务模块或平台路由
- `modules/live/` 负责演示一个完整的 BFF 聚合接口

## 当前仓库最值得看的接口

平台接口：

- `GET /health`
- `GET /readiness`
- `GET /metrics`
- `GET /docs`

唯一业务演示接口：

- `GET /api/live/rooms/:roomId/aggregate`

这个聚合接口是当前仓库的学习中心。

它演示了：

- 路由前缀如何挂载
- schema 如何校验参数
- controller 如何只做请求转发
- service 如何承担聚合与降级逻辑
- 返回结构如何表达 `OK` 与 `PARTIAL_SUCCESS`

可以通过下面这个 query 模拟片段失败：

```text
/api/live/rooms/room-1/aggregate?failSegments=coupon,recommendation
```

当前支持的聚合片段有：

- `room`
- `productList`
- `coupon`
- `recommendation`

## 目录职责

### 启动与组装

- `server.ts`：程序入口，读取配置并启动监听
- `app.ts`：创建 Fastify 实例，显式注册 core plugins，autoload route plugins，统一错误处理和 404

### 配置

- `config/index.ts`：统一读取 `.env`，用 `zod` 校验环境变量，再输出整理后的 `appConfig`

注意：

- 业务代码不应该直接到处读 `process.env`
- 优先通过 `appConfig` 获取配置

### 平台能力

- `plugins/core/request-context.ts`：注入 request context，收口 `requestId`、method、url、host、origin
- `plugins/core/security.ts`：安全响应头
- `plugins/core/cors.ts`：跨域
- `plugins/core/platform.ts`：挂载缓存、metrics、upstream registry
- `plugins/core/observability.ts`：请求日志和指标采集
- `plugins/core/rate-limit.ts`：全局限流
- `plugins/core/docs.ts`：Swagger / OpenAPI
- `plugins/core/under-pressure.ts`：过载保护

### 路由层

- `plugins/routes/health.ts`：健康检查与 readiness
- `plugins/routes/metrics.ts`：指标快照
- `plugins/routes/live.ts`：把直播模块挂到 `/api/live`

### 业务模块层

当前只保留一个模块：

- `modules/live/live.routes.ts`
- `modules/live/live.schema.ts`
- `modules/live/live.controller.ts`
- `modules/live/live.service.ts`
- `modules/live/live.types.ts`

这个模块是演示层，不是最终业务设计。

### 通用基础库

- `lib/http/http-client.ts`：带超时、重试、熔断、fallback 的 HTTP client 骨架
- `lib/http/upstream-registry.ts`：统一注册和管理下游服务 client
- `lib/observability/metrics-store.ts`：内存版 metrics 聚合

### 错误与类型

- `errors/app-error.ts`：统一错误类
- `errors/error-codes.ts`：统一错误码
- `types/fastify.d.ts`：Fastify 实例装饰扩展
- `types/request-context.d.ts`：request context 类型补充

## 关键设计约定

### 1. core plugin 顺序由 `app.ts` 显式控制

不要再用文件名前缀控制注册顺序。

当前顺序是：

1. `request-context`
2. `security`
3. `cors`
4. `platform`
5. `observability`
6. `rate-limit`
7. `docs`
8. `under-pressure`

如果后续新增 core plugin，优先修改 `app.ts`，而不是依赖文件名技巧。

### 2. 业务模块按固定分层拆分

推荐保持：

`routes -> schema -> controller -> service -> types`

各层职责：

- `routes`：声明 URL，绑定 schema 和 handler
- `schema`：参数校验和响应 schema
- `controller`：只做请求参数转交，不堆业务
- `service`：放聚合、降级、编排逻辑
- `types`：收口模块内部类型

### 3. 平台能力通过 Fastify decorate 注入

当前注入的实例能力：

- `fastify.metricsStore`
- `fastify.upstreamRegistry`

新增平台能力时，优先沿用这种方式，不要在业务里随意 new 单例。

### 4. 配置先收口，再使用

所有环境变量先在 `config/index.ts` 中：

- 定义 schema
- 解析默认值
- 类型化输出

不要在业务代码中直接散落读取环境变量。

### 5. 错误统一在 `app.ts` 收口

如果是可预期业务错误，优先使用 `AppError` 体系。

当前已包含：

- `ConflictError`
- `UpstreamTimeoutError`
- `UpstreamUnavailableError`
- `UpstreamBadResponseError`
- `TooManyRequestsError`

## 这个项目已经具备的工程能力

- TypeScript 类型化
- ESLint + Prettier
- `.editorconfig`
- 环境变量集中管理
- `zod` 配置校验
- 统一错误处理
- requestId 与结构化日志
- CORS
- Helmet 安全头
- 全局限流
- under-pressure 过载保护
- 健康检查与 readiness
- metrics 采集
- Swagger 文档
- 最小测试闭环
- 最小 GitHub Actions CI

## 当前实现的边界

这个项目现在更偏“学习骨架”，所以要明确下面这些边界：

- `modules/live/` 里的数据主要还是 demo/mock 数据
- `failSegments` 是为了演示降级，不是最终真实接口设计
- 当前没有接真实业务下游
- 当前没有接数据库
- 当前没有鉴权、灰度、压测、告警、回滚等完整生产方案

因此：

`可复用的是工程骨架和分层方式，不是 demo 业务内容本身。`

## 如果后续要迁移到公司的直播 H5 BFF

推荐迁移策略：

1. 复制当前工程骨架
2. 保留 `config`、`errors`、`lib`、`plugins/core`、`types`、测试脚本和 CI
3. 保留 `health`、`readiness`、`metrics`
4. 删除或重写 `modules/live` 的 demo 业务
5. 按真实业务重建模块
6. 先打通一条最核心链路，再继续扩展

建议优先建设的真实模块可以是：

- `live-room`
- `auth`
- `wechat`
- `danmaku`
- `feedback`

建议先做一条最关键主链路，例如：

```text
GET /api/live-room/init
```

## 哪些内容适合直接保留

- `app.ts`
- `server.ts`
- `config/index.ts` 的组织方式
- `errors/`
- `lib/`
- `types/`
- `plugins/core/`
- `plugins/routes/health.ts`
- `plugins/routes/metrics.ts`
- `test/`
- `.github/workflows/ci.yml`
- 大部分工程脚本和质量检查配置

## 哪些内容只适合保留思路

- `modules/live/*`
- `plugins/routes/live.ts`
- demo 返回字段
- demo 主播/商品/优惠券/推荐数据
- `failSegments` 这类纯演示参数
- 学习型说明文案

## 建议阅读顺序

1. `README.md`
2. `docs/LEARNING_MAP.md`
3. `docs/demo.md`
4. `docs/迁移说明.md`
5. `server.ts`
6. `app.ts`
7. `config/index.ts`
8. `plugins/core/request-context.ts`
9. `plugins/core/platform.ts`
10. `plugins/core/observability.ts`
11. `plugins/routes/live.ts`
12. `modules/live/live.routes.ts`
13. `modules/live/live.schema.ts`
14. `modules/live/live.controller.ts`
15. `modules/live/live.service.ts`
16. `test/app.test.ts`

## 常用命令

- `pnpm dev`：开发模式启动
- `pnpm build`：编译到 `dist`
- `pnpm start`：构建后启动
- `pnpm typecheck`：类型检查
- `pnpm lint`：ESLint
- `pnpm test`：运行测试
- `pnpm check`：顺序执行 `typecheck + lint + test`

## 对后续协作者或 AI 的建议

- 先理解这个仓库为什么被收缩成“单模块 + 单核心聚合链路”，再动手扩展
- 不要为了“看起来更像真实项目”而一次性塞很多演示路由
- 新增业务时，优先复制模块分层方式，不要破坏 `schema -> controller -> service` 的清晰边界
- 新增平台能力时，优先放到 `plugins/core/` 或 `lib/`
- 新增下游接入时，优先复用 `UpstreamRegistry` 和 `HttpClient` 骨架
- 如果目标是迁移到真实直播 H5 BFF，优先重写业务模块，保留工程骨架

## 一句话总结

这个仓库的真正价值是：

```text
用尽量小的 Fastify 工程骨架，把 BFF 的启动、装配、平台能力、聚合、降级、测试和迁移思路讲清楚，为后续公司的直播 H5 BFF 打基础。
```
