# Fastify Demo 导图

这份文档只做一件事：告诉你这套代码应该怎么读。

如果你只想先抓主链路，按下面顺序看：

1. `server.ts`
2. `app.ts`
3. `plugins/core/request-context.ts`
4. `plugins/core/platform.ts`
5. `plugins/core/observability.ts`
6. `plugins/routes/live.ts`
7. `modules/live/live.routes.ts`
8. `modules/live/live.schema.ts`
9. `modules/live/live.controller.ts`
10. `modules/live/live.service.ts`

## 1. 整体结构

```text
fastify-demo
├─ server.ts                // 程序入口
├─ app.ts                   // 应用装配中心
├─ config/index.ts          // 环境变量读取、校验、整理
├─ plugins/core/*           // 平台能力插件
├─ plugins/routes/*         // 平台路由和业务模块入口
├─ modules/live/*           // 唯一保留的业务演示模块
├─ lib/*                    // 缓存、HTTP client、metrics 等基础库
├─ errors/*                 // 统一错误类和错误码
├─ types/*                  // Fastify 类型扩展
└─ test/app.test.ts         // 基础测试
```

先记住一句话：

`server` 负责启动，`app` 负责组装，`plugins` 负责注册平台能力和模块入口，`modules/live` 负责演示一次完整请求流转。

## 2. 启动流程

执行：

```bash
pnpm dev
```

实际链路：

```text
server.ts
  -> config/index.ts
  -> app.ts
     -> register plugins/core/*
     -> autoload plugins/routes/*
```

可以这样理解：

1. `server.ts` 读取配置并调用 `buildApp()`
2. `app.ts` 创建 Fastify 实例
3. `app.ts` 显式注册 core plugins
4. `app.ts` 自动加载 routes plugins
5. 最后 `server.ts` 调用 `app.listen()` 启动服务

## 3. 请求流转

最值得看的接口：

```text
GET /api/live/rooms/:roomId/aggregate
```

完整链路：

```text
plugins/routes/live.ts
  -> modules/live/live.routes.ts
     -> modules/live/live.schema.ts
     -> modules/live/live.controller.ts
        -> modules/live/live.service.ts
```

各层职责：

- `plugins/routes/live.ts`：给模块挂统一前缀 `/api/live`
- `live.routes.ts`：定义 URL，绑定 schema 和 handler
- `live.schema.ts`：校验参数，定义响应结构
- `live.controller.ts`：从请求中取参数并转交 service
- `live.service.ts`：放聚合和降级逻辑

## 4. 最需要理解的几个概念

- `plugin`：给应用注册平台能力或路由
- `hook`：在请求生命周期的某个阶段统一插入逻辑
- `schema`：先校验请求，再顺带生成接口文档
- `decorate`：把缓存、metrics、下游客户端等能力挂到 Fastify 实例上

## 5. 建议阅读目标

读完这套代码，至少要看懂下面几件事：

- Fastify 应用怎么启动和组装
- core plugins 为什么要显式注册
- 一个接口怎么走 `schema -> controller -> service`
- 聚合接口怎么表达降级和 `PARTIAL_SUCCESS`

## 6. 一句话总结

```text
配置先收口，平台能力先注册，业务模块再挂载，请求先校验，再走 route -> controller -> service。
```
