# 直播带货 H5 BFF 方案说明

## 1. 项目定位

这个项目现在收缩成了一个“最小 BFF 学习模板”。

它的目标不是模拟很多业务模块，而是用一条核心聚合链路把下面这些关键问题讲清楚：

- Fastify 应用怎么组装
- BFF 怎么做参数校验和错误收口
- 聚合接口怎么做部分失败降级
- 日志、限流、缓存、metrics 这些平台能力怎么接进去

所以当前项目只保留：

- `GET /health`
- `GET /readiness`
- `GET /metrics`
- `GET /api/live/rooms/:roomId/aggregate`

## 2. 为什么要缩成最小模板

对于学习阶段来说，路由太多通常会带来两个问题：

- 注意力被分散，很难看清真正的主链路
- 很多演示路由只是在重复结构，学习收益不高

而 BFF 真正最值得优先吃透的，其实只有这几件事：

- 一个聚合接口怎么拆成 `schema -> controller -> service`
- 一个请求从入口到返回是怎么流转的
- 下游失败时怎么降级，而不是把整个接口一起拖挂
- 平台能力怎么做到“统一注册、统一复用”

## 3. 这个最小模板保留的能力

### 3.1 基础能力

- TypeScript 全类型化
- 统一环境变量管理
- ESLint + Prettier
- `.editorconfig`
- 统一错误类和错误码
- requestId + 结构化日志
- 健康检查和 readiness 检查
- 自动化测试
- 最小 CI

### 3.2 稳定性能力

- schema 参数校验
- 下游 HTTP client 骨架
- 超时控制
- 有边界的重试
- 熔断 / 降级
- 限流
- 基础缓存
- metrics 指标采集

### 3.3 可维护性能力

- 分层设计
- core plugins 显式注册
- 配置集中管理
- 环境变量 schema 按配置域拆分后再统一合并
- 路由自动加载

## 4. 唯一业务接口在演示什么

当前核心接口：

```text
GET /api/live/rooms/:roomId/aggregate
```

它演示的是一个 BFF 最典型的场景：把多个数据片段聚合成一个前端更容易消费的响应。

当前聚合的片段包括：

- 直播间基础信息
- 商品列表
- 优惠券信息
- 推荐位

为了方便学习，这些片段目前还是 mock 数据，但接口结构已经体现了真实 BFF 的几个关键点：

- 统一入参校验
- 统一返回结构
- 片段级降级
- `PARTIAL_SUCCESS` 状态表达
- `degradation.items` 显式告诉前端哪些片段走了 fallback

你可以通过下面这个 query 主动模拟失败：

```text
/api/live/rooms/room-1/aggregate?failSegments=coupon,recommendation
```

返回重点不是字段本身，而是下面这套思想：

- 核心数据尽量返回
- 非核心失败不拖垮整个接口
- 前端可以根据降级信息决定是否展示兜底 UI

## 5. 当前最重要的学习路径

建议按下面顺序看代码：

1. `server.ts`
2. `app.ts`
3. `plugins/core/request-context.ts`
4. `plugins/core/platform.ts`
5. `plugins/core/observability.ts`
6. `plugins/routes/live.ts`
7. `modules/live/live.routes.ts`
8. `modules/live/live.schema.ts`
9. `modules/live/live.controller.ts`
10. `modules/live/live.types.ts`
11. `modules/live/live.service.ts`
12. `plugins/routes/metrics.ts`

这样看，你会先理解应用装配，再理解平台能力，最后理解一个完整聚合接口。

## 6. 推荐目录结构

```text
fastify-demo
├─ app.ts
├─ server.ts
├─ config/
│  └─ index.ts
├─ docs/
│  └─ demo.md
├─ errors/
│  ├─ app-error.ts
│  └─ error-codes.ts
├─ lib/
│  ├─ cache/
│  │  └─ ttl-cache.ts
│  ├─ http/
│  │  ├─ http-client.ts
│  │  └─ upstream-registry.ts
│  └─ observability/
│     └─ metrics-store.ts
├─ modules/
│  └─ live/
│     ├─ live.controller.ts
│     ├─ live.routes.ts
│     ├─ live.schema.ts
│     ├─ live.types.ts
│     └─ live.service.ts
├─ plugins/
│  ├─ core/
│  │  ├─ request-context.ts
│  │  ├─ security.ts
│  │  ├─ cors.ts
│  │  ├─ docs.ts
│  │  ├─ under-pressure.ts
│  │  ├─ observability.ts
│  │  ├─ platform.ts
│  │  └─ rate-limit.ts
│  └─ routes/
│     ├─ health.ts
│     ├─ live.ts
│     └─ metrics.ts
├─ .github/
│  └─ workflows/
│     └─ ci.yml
├─ test/
│  └─ app.test.ts
└─ types/
   ├─ fastify.d.ts
   └─ request-context.d.ts
```

## 7. 上线前仍然要补的东西

这个模板已经适合学习，但如果以后接真实业务，上线前至少还要继续补：

- 真实下游 client 和 SLA 约束
- 更明确的核心片段 / 非核心片段划分
- 更细的缓存策略
- 更细的监控指标和告警
- 鉴权、灰度、压测和回滚方案

## 8. 当前模板里已经有的工程约束

- `package.json` 中已经有 `engines` 约束
- 已提供 `pnpm check`
- 已提供最小 GitHub Actions CI：`.github/workflows/ci.yml`
- CI 当前只做：
    - `pnpm install --frozen-lockfile`
    - `pnpm check`

## 9. 一句话总结

```text
这个模板现在只保留一条最值得学习的主链路，用最少的路由把 BFF 的组装、聚合、降级、观测和基础工程约束讲清楚。
```
