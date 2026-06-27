# Fastify Demo 导图

这份导图现在对应的是“最小 BFF 学习模板”。

建议阅读顺序：

1. 先看整体结构
2. 再看启动流程
3. 再看唯一的聚合接口怎么流转
4. 最后看每一层各自负责什么

## 1. 项目整体结构

```text
fastify-demo
├─ server.ts                       // 程序入口
├─ app.ts                          // 创建 Fastify 实例
├─ config/
│  └─ index.ts                     // 按配置域拆分 schema，再统一读取和校验环境变量
├─ plugins/
│  ├─ core/
│  │  ├─ request-context.ts        // 注入 requestId 和请求上下文
│  │  ├─ security.ts               // 安全响应头
│  │  ├─ cors.ts                   // 跨域配置
│  │  ├─ platform.ts               // 注册缓存、metrics、下游能力
│  │  ├─ observability.ts          // 请求日志和 metrics 采集
│  │  ├─ rate-limit.ts             // 全局限流
│  │  ├─ docs.ts                   // Swagger 文档
│  │  └─ under-pressure.ts         // 过载保护
│  └─ routes/
│     ├─ health.ts                 // 健康检查和 readiness
│     ├─ metrics.ts                // 指标接口
│     └─ live.ts                   // 唯一保留的业务模块入口
├─ modules/
│  └─ live/
│     ├─ live.routes.ts
│     ├─ live.schema.ts
│     ├─ live.controller.ts
│     ├─ live.types.ts
│     └─ live.service.ts
├─ lib/
│  ├─ cache/
│  │  └─ ttl-cache.ts
│  ├─ http/
│  │  ├─ http-client.ts
│  │  └─ upstream-registry.ts
│  └─ observability/
│     └─ metrics-store.ts
├─ errors/
│  ├─ error-codes.ts
│  └─ app-error.ts
├─ .github/
│  └─ workflows/
│     └─ ci.yml
└─ test/
   └─ app.test.ts
```

你可以先记住一句话：

`server` 负责启动，`app` 负责组装，`plugin` 负责注册，`live module` 负责演示一个完整的聚合接口。

## 2. 启动流程

当你执行：

```bash
pnpm dev
```

实际会发生下面这条链路：

```text
server.ts
  -> config/index.ts
  -> app.ts
     -> 显式注册 plugins/core/*
     -> autoload plugins/routes/*
```

更具体一点：

1. `server.ts` 是程序入口
2. 它会导入 `app.ts`，调用 `buildApp()`
3. `app.ts` 创建 Fastify 实例
4. `app.ts` 读取 `config/index.ts` 的配置
   `config/index.ts` 内部会先按 `server / fastify / cors / docs / upstream` 等配置域拆成多个小 schema，再合并成统一 `envSchema`
5. `app.ts` 按顺序显式注册 `plugins/core/`，不再依赖文件名前缀
6. `app.ts` 自动加载 `plugins/routes/`，注册健康检查、指标接口和 `live` 模块
7. 最后 `server.ts` 调用 `app.listen()` 启动服务

## 3. 路由是怎么注册的

核心文件：

- `app.ts`
- `plugins/core/*.ts`
- `plugins/routes/*.ts`

逻辑是：

```text
app.ts
  -> register request-context / security / cors / platform / observability / rate-limit / docs / under-pressure
  -> autoload 扫描 plugins/routes/
     -> health.ts
     -> metrics.ts
     -> live.ts
```

这样做的好处：

- 主入口不会因为业务接口变多而越来越乱
- 你只需要看一个模块，就能理解整套接入方式
- 后续新增业务时，直接按同样模式复制一份模块骨架即可

## 4. 一次聚合请求是怎么流转的

这个模板最值得学习的接口是：

```text
GET /api/live/rooms/:roomId/aggregate
```

完整链路是：

```text
plugins/routes/live.ts
  -> modules/live/live.routes.ts
     -> modules/live/live.schema.ts
     -> modules/live/live.controller.ts
        -> modules/live/live.service.ts
```

你可以这样理解每一步：

1. `plugins/routes/live.ts`
   把直播模块挂到 `/api/live`

2. `modules/live/live.routes.ts`
   负责声明 URL、schema 和 controller 的绑定关系

3. `modules/live/live.schema.ts`
   负责校验 `roomId` 和 `failSegments`

4. `modules/live/live.controller.ts`
   负责从 `request` 里取参数并调用 service

5. `modules/live/live.types.ts`
   负责收口这个模块内部复用的类型定义

6. `modules/live/live.service.ts`
   负责组织直播间、商品列表、优惠券、推荐位这些聚合片段，并在需要时做 fallback 降级

## 5. 每一层到底解决什么问题

### server

- 文件：`server.ts`
- 职责：启动应用、调用 `listen`、打印启动日志

### app

- 文件：`app.ts`
- 职责：创建 Fastify 实例、注册插件、设置全局错误和 404

### core plugin

- 文件：`plugins/core/request-context.ts`、`plugins/core/security.ts`、`plugins/core/cors.ts`、`plugins/core/platform.ts`、`plugins/core/observability.ts`、`plugins/core/rate-limit.ts`、`plugins/core/docs.ts`、`plugins/core/under-pressure.ts`
- 职责：注册请求上下文、安全、跨域、缓存、metrics、日志、限流、文档和过载保护

### route plugin

- 文件：`plugins/routes/live.ts`
- 职责：给业务模块挂统一前缀并注册模块路由

### module route

- 文件：`modules/live/live.routes.ts`
- 职责：定义 URL，绑定 schema 和 controller

### schema

- 文件：`modules/live/live.schema.ts`
- 职责：先拦住非法请求，再进入业务代码

### controller

- 文件：`modules/live/live.controller.ts`
- 职责：接收请求、调 service、返回响应

### service

- 文件：`modules/live/live.service.ts`
- 职责：放聚合逻辑、降级策略和返回结构

## 6. 这个最小模板保留了哪些真实项目思路

- TypeScript 类型化
- ESLint + Prettier
- 环境变量集中配置
- `zod` 配置校验
- 插件化注册
- schema 请求校验
- 统一错误码
- 限流
- health / readiness
- metrics 指标采集
- 聚合接口部分失败可降级
- 自动化测试

## 7. 你接下来最适合继续学什么

推荐顺序：

1. 先吃透这套请求流转
2. 看懂 `PARTIAL_SUCCESS` 和 `degradation` 返回结构
3. 看懂 `metrics` 是怎么采集出来的
4. 学 Fastify 的 decorator、plugin、hook
5. 再学缓存、鉴权、数据库连接这些工程能力
6. 看懂 `pnpm check` 和最小 CI 是怎么保证模板稳定的
7. 最后再接真实下游

## 8. 你可以怎么读这份代码

推荐阅读顺序：

1. `README.md`
2. `docs/LEARNING_MAP.md`
3. `server.ts`
4. `app.ts`
5. `plugins/core/request-context.ts`
6. `plugins/core/platform.ts`
7. `plugins/core/observability.ts`
8. `plugins/routes/live.ts`
9. `modules/live/live.routes.ts`
10. `modules/live/live.schema.ts`
11. `modules/live/live.controller.ts`
12. `modules/live/live.types.ts`
13. `modules/live/live.service.ts`
14. `plugins/routes/metrics.ts`

## 9. 一句话总结

```text
配置先收口，core plugins 显式注册，业务 routes 自动加载，请求先校验，再走 route -> controller -> service，并在 service 里处理聚合和降级。
```
