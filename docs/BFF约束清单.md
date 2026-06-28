# 纯 BFF TODO

## 最关键 10 条

- [x] 定位定死：这是纯 `BFF`，不接数据库、不接 Redis、不做鉴权判定
- [x] 鉴权边界定死：BFF 只从 header 读取 `Authorization`，原样透传给后端
- [x] 框架主骨架已完成：启动、配置、core plugins、routes、错误收口、404 已具备
- [x] 平台基础已完成：`health`、`readiness`、`metrics`、`docs` 已具备
- [x] 下游调用骨架已完成：`HttpClient`、`UpstreamRegistry`、超时、重试、熔断、fallback 已具备
- [ ] 定 header 白名单：至少明确 `Authorization`、`x-request-id`，以及哪些 header 禁止透传
- [ ] 定无 token 处理：明确匿名接口是否允许不传 token，以及缺失 token 时 BFF 的处理方式
- [ ] 定下游调用规则：统一 timeout、retries、fallback 边界和错误映射规则
- [ ] 定日志与错误规范：统一请求日志字段、下游调用日志字段、错误透传和包装边界
- [ ] 定模块模板：固定新增模块目录结构，等需求出来后按模板接真实业务

## 等需求出来再补

- [ ] 真实业务模块名称和边界
- [ ] 真实接口 URL、参数、响应字段
- [ ] 真实下游服务清单
- [ ] 哪些字段允许降级、哪些字段必须失败
- [ ] 前后端错误展示策略
