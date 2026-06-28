# 直播带货 H5 BFF 方案说明

## 1. 项目定位

这个项目是一个“最小 BFF 学习模板”。

它不追求模拟很多业务，而是先把下面几件事讲清楚：

- Fastify 应用怎么组装
- BFF 怎么做参数校验和错误收口
- 聚合接口怎么做部分失败降级
- 平台能力怎么统一注册

所以当前只保留：

- `GET /health`
- `GET /readiness`
- `GET /metrics`
- `GET /api/live/rooms/:roomId/aggregate`

## 2. 这个模板保留了什么

- TypeScript 类型化
- 环境变量集中管理
- schema 参数校验
- 统一错误处理
- requestId 和结构化日志
- 下游 HTTP client 骨架
- 超时、重试、熔断、降级思路
- health / readiness / metrics
- 最小测试和最小 CI

## 3. 核心演示接口

当前最值得看的接口：

```text
GET /api/live/rooms/:roomId/aggregate
```

它演示的是 BFF 最典型的场景：把多个片段聚合成一个前端更容易消费的响应。

当前片段包括：

- 直播间信息
- 商品列表
- 优惠券信息
- 推荐位

你可以通过下面这个 query 主动模拟部分失败：

```text
/api/live/rooms/room-1/aggregate?failSegments=coupon,recommendation
```

这个接口重点演示的是：

- 统一入参校验
- 统一返回结构
- 片段级降级
- `PARTIAL_SUCCESS`

## 4. 这份模板适合做什么

- 适合学习 Fastify 装配方式
- 适合学习 BFF 的主链路和模块分层
- 适合作为真实项目的工程骨架参考

## 5. 这份模板不适合做什么

- 不适合直接当上线业务代码
- 不适合把 demo 数据和 demo 字段照搬到真实项目
- 不适合作为真实接口设计的最终依据

如果你想看代码怎么读，优先看 `docs/LEARNING_MAP.md`。

如果你想看后续怎么迁移到真实项目，优先看 `docs/迁移说明.md`。

## 6. 一句话总结

```text
这个模板用尽量少的路由，集中演示 BFF 的装配、聚合、降级和平台能力接入。
```
