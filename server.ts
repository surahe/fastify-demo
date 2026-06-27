import buildApp from './app'
import appConfig from './config'

const start = async (): Promise<void> => {
    // 这里真正把配置和应用实例串起来，作为程序入口。
    const app = buildApp()
    const displayHost = appConfig.server.host === '0.0.0.0' ? 'localhost' : appConfig.server.host

    try {
        await app.listen({
            port: appConfig.server.port,
            host: appConfig.server.host
        })

        app.log.info(`Server running at http://${displayHost}:${appConfig.server.port}`)
        app.log.info(`Environment: ${appConfig.env}`)
    } catch (error) {
        app.log.error(error)
        process.exit(1)
    }
}

void start()
