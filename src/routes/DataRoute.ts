import RestServer from "../server/RestServer";
import IRoute from "./IRoute";
import LogEvent from "../model/LogEvent";
import LockDataRoute from "./DataRoute/LockDataRoute";
import CageDataRoute from "./DataRoute/CageDataRoute";
import CabinetDataRoute from "./DataRoute/CabinetDataRoute";
import LogStore from "../data/DataStores/LogStore";
import PermissionDataRoute from "./DataRoute/PermissionDataRoute";
import RowDataRoute from "./DataRoute/RowDataRoute";
import Permission from "../model/Permission";

const logstore: LogStore = LogStore.getInstance();

export default class DataRoute implements IRoute {
    private static SUB_ROUTES = [new LockDataRoute, new CageDataRoute, new CabinetDataRoute, new PermissionDataRoute, new RowDataRoute];

    public publicURLs(): string[] {
        const publics: string[] = [];
        DataRoute.SUB_ROUTES.forEach(sub => sub.publicURLs().forEach(u => publics.push(u)));
        return publics;
    }

    public init(server: RestServer): void {
        DataRoute.SUB_ROUTES.forEach(sub => sub.init(server));
        server.app
            .get("/data/log", (req, res) => {
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                const logs: LogEvent[] = logstore.getLogs();
                // todo
                res.send(logs.filter(l => l.lock_id != null && user.hasPermission(`lock_${l.lock_id}#${Permission.READ_LOG}`)));
            })
        /*
        .get("/data/cage/:id/cabinet/:cid/log", (req, res) => {
            let user: AuthUser = req['user'];
            let cabinet: Cabinet = cabinetstore.findCabinetById(Number.parseInt(req.params.cid));
            if (cabinet != null) {
                if (cabinet.permission.canRead(user)) {
                    res.send(server.cameraHandler.getLogWithPhotos(cabinet));
                } else {
                    res.status(403).end();
                }
            } else {
                res.status(404).end();
            }
        })*/
        /*.get("/data/summary", (req, res) => {
            //TODO #10
            res.send(datastore.getSummary());
        })*/
        ;
    }
};
