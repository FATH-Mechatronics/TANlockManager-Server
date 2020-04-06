import RestServer from "../server/Restserver";
import DataStore from "../data/Datastore";
import IRoute from "./IRoute";
import User from "../model/User";
import AuthUser from "../model/AuthUser";
import Permission from "../model/Permission";

const datastore: DataStore = DataStore.getInstance();

export default class ConfigRoute implements IRoute {

    public publicURLs(): string[] {
        return [];
    }

    public init(server: RestServer) {
        server.app
            .put('/config', (req, res) => {
                const user = req.user;
                if(!user){
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
                if(!user){
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
                if(!user){
                    res.sendStatus(401);
                    return;
                }
                if (user.hasPermission(Permission.READ_SYSTEM_CONFIG)) {
                    let plugins: string[] = [];
                    if (server.pluginHandler)
                        plugins = server.pluginHandler.getPlugins().map(p => p.name());
                    res.send(plugins).end;
                } else {
                    res.status(403).end();
                }
            })
            .get('/config/plugin/:plugin', (req, res) => {
                const user = req.user;
                if(!user){
                    res.sendStatus(401);
                    return;
                }
                if (user.hasPermission(Permission.READ_SYSTEM_CONFIG)) {
                    const pluginName: string = req.params.plugin;
                    let plugin: any[] = [];
                    if (server.pluginHandler)
                        plugin = server.pluginHandler.getPlugins().filter(p => p.name() === pluginName);
                    if (plugin.length == 1) {
                        plugin[0].getConfig().then(conf => {
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
                if(!user){
                    res.sendStatus(401);
                    return;
                }
                if (user.hasPermission(Permission.READ_SYSTEM_CONFIG)) {
                    const pluginName: string = req.params.plugin;
                    let plugin: any[] = [];
                    if (server.pluginHandler)
                        plugin = server.pluginHandler.getPlugins().filter(p => p.name() === pluginName);
                    if (plugin.length == 1) {
                        const help = plugin[0].getHelp();
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
                if(!user){
                    res.sendStatus(401);
                    return;
                }
                if (user.hasPermission(Permission.WRITE_SYSTEM_CONFIG)) {
                    const pluginName: string = req.params.plugin;
                    let plugin: any[] = [];
                    if (server.pluginHandler)
                        plugin = server.pluginHandler.getPlugins().filter(p => p.name() === pluginName);
                    if (plugin.length == 1) {
                        console.log("NEW CONF: ", req.body);
                        plugin[0].writeConfig(req.body);
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
