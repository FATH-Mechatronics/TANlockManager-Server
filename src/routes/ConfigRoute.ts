import RestServer from "../server/RestServer";
import DataStore from "../data/Datastore";
import IRoute from "./IRoute";
import Permission from "../model/Permission";
import IBasePlugin from "../handler/pluginInterfaces/IBasePlugin";

const datastore: DataStore = DataStore.getInstance();

export default class ConfigRoute implements IRoute {

    public publicURLs(): string[] {
        return [];
    }

    public init(server: RestServer) {
        server.app
            .put('/config', (req, res) => {
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                if (user.hasPermission(Permission.WRITE_SYSTEM_CONFIG))
                    res.send(datastore.setConfig(req.body.name, req.body.value));
                else
                    res.status(403).end();
            })
            .get('/config', (req, res) => {

                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                if (user.hasPermission(Permission.READ_SYSTEM_CONFIG))
                    res.send(datastore.getConfigs());
                else
                    res.status(403).end();
            })
            .get('/config/plugin', (req, res) => {
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                if (user.hasPermission(Permission.READ_SYSTEM_CONFIG)) {
                    let plugins: string[] = [];
                    if (server.pluginHandler) {
                        let pluginHolder = server.pluginHandler.getPluginHolder();
                        pluginHolder.authPlugins.forEach(authPlugin => {
                            plugins.push(`authPlugin_${authPlugin.name()}`)
                        });
                        pluginHolder.cameraPlugins.forEach(cameraPlugin => {
                            plugins.push(`cameraPlugin_${cameraPlugin.name()}`)
                        });
                        pluginHolder.eventPlugins.forEach(eventPlugin => {
                            plugins.push(`eventPlugin_${eventPlugin.name()}`)
                        });
                        pluginHolder.sensorPlugins.forEach(sensorPlugin => {
                            plugins.push(`sensorPlugin_${sensorPlugin.name()}`)
                        });
                    }
                    res.send(plugins).end;
                } else {
                    res.status(403).end();
                }
            })
            .get('/config/plugin/:plugin', (req, res) => {
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                if (user.hasPermission(Permission.READ_SYSTEM_CONFIG)) {
                    const pluginName: string = req.params.plugin;
                    let plugin: undefined | IBasePlugin = undefined;
                    if (server.pluginHandler) {
                        plugin = server.pluginHandler.getPluginHolder().getPluginByName(pluginName);
                    }
                    if (plugin != undefined) {
                        plugin.getConfig().then(conf => {
                            res.send(conf).end();
                        });
                    } else {
                        res.status(404).end();
                    }
                } else {
                    res.status(403).end();
                }
            })
            .get('/config/plugin/:plugin/help', (req, res) => {
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                if (user.hasPermission(Permission.READ_SYSTEM_CONFIG)) {
                    const pluginName: string = req.params.plugin;
                    let plugin: undefined | IBasePlugin = undefined;
                    if (server.pluginHandler) {
                        plugin = server.pluginHandler.getPluginHolder().getPluginByName(pluginName);
                    }
                    if (plugin != undefined) {
                        const help = plugin.getHelp();
                        res.send(help).end();
                    } else {
                        res.status(404).end();
                    }
                } else {
                    res.status(403).end();
                }
            })
            .post('/config/plugin/:plugin', (req, res) => {
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                if (user.hasPermission(Permission.WRITE_SYSTEM_CONFIG)) {
                    const pluginName: string = req.params.plugin;
                    let plugin: undefined | IBasePlugin = undefined;
                    if (server.pluginHandler) {
                        plugin = server.pluginHandler.getPluginHolder().getPluginByName(pluginName);
                    }
                    if (plugin !== undefined) {
                        console.log("NEW CONF: ", req.body);
                        plugin.writeConfig(req.body);
                        res.send("ok").end();
                    } else {
                        res.status(404).end();
                    }
                } else {
                    res.status(403).end();
                }
            });
    }
};
