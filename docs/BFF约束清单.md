# 纯 BFF TODO

## 已确定

- [x] 这是纯 `BFF`，不接数据库、不接 Redis、不做鉴权判定
- [x] BFF 只从 header 读取 `Authorization`，原样透传给后端
- [x] 框架主骨架已完成：启动、配置、core plugins、routes、错误收口、404 已具备
- [x] 平台基础已完成：`health`、`readiness`、`metrics`、`docs` 已具备
- [x] 下游调用骨架已完成：`HttpClient`、`UpstreamRegistry`、超时、重试、熔断、fallback 已具备

## 现在要补

- [ ] 定 header 白名单
- [ ] 定无 token 处理
- [ ] 定下游调用规则
- [ ] 定日志与错误规范
- [ ] 定模块模板

## 等需求出来再补

- [ ] 真实业务模块和接口
- [ ] 真实下游服务清单
- [ ] 哪些字段允许降级、哪些字段必须失败
- [ ] 前后端错误展示策略
