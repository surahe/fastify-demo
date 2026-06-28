import buildApp from './app';
import appConfig from './config';

/*
 * server.ts 是程序入口，但它故意保持得很薄。
 *
 * 为什么要这么做：
 * 1. 入口文件只处理“启动服务”这件事，方便阅读。
 * 2. 真正的应用装配都在 app.ts，测试时就不需要从这里启动端口。
 * 3. 以后接 PM2、Docker、K8s 或其他部署方式时，入口职责仍然稳定。
 */

const start = async (): Promise<void> => {
    // 这里真正把配置和应用实例串起来，作为程序入口。
    const app = buildApp();

    // 0.0.0.0 代表“监听所有网卡”，适合容器和局域网场景；
    // 但给人看的启动日志里写 localhost 更容易理解，所以这里做一个展示层转换。
    const displayHost = appConfig.server.host === '0.0.0.0' ? 'localhost' : appConfig.server.host;

    try {
        // app.listen 才是真正把 HTTP 服务启动起来的动作。
        await app.listen({
            port: appConfig.server.port,
            host: appConfig.server.host,
        });

        // 启动成功后打印访问地址和环境，方便本地开发快速确认服务状态。
        app.log.info(`Server running at http://${displayHost}:${appConfig.server.port}`);
        app.log.info(`Environment: ${appConfig.env}`);
    } catch (error) {
        // 启动阶段如果失败，通常代表端口冲突、配置异常或插件初始化失败。
        // 这里直接退出进程，避免留下一个“看起来还活着、实际上不可用”的半残状态。
        app.log.error(error);
        process.exit(1);
    }
};

void start();
