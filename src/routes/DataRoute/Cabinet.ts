import IRoute from "../IRoute";
import RestServer from "../../server/Restserver";
import Cabinet from "../../model/Cabinet";
import AuthUser from "../../model/AuthUser";
import Permission from "../../model/Permission";
import CabinetStore from "../../data/DataStores/CabinetStore";
import CameraHandler from "../../handler/CameraHandler";
import LockStore from "../../data/DataStores/LockStore";

const cabinetstore: CabinetStore = CabinetStore.getInstance();
const lockstore: LockStore = LockStore.getInstance();
export default class CabinetDataRoute implements IRoute {
    public publicURLs(): string[] {
        return [];
    }

    public init(server: RestServer): void {
        server.app
            .get("/data/cage/:id/cabinet", (req, res) => {
                const id = Number.parseInt(req.params.id);
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                const cabinets = cabinetstore.getCabinetsOfCage(id);
                res.send(cabinets.filter(c => user.hasPermission(`cabinet_${c.id}#${Permission.READ_CABINET}`)));
            })
            .get("/data/cage/:id/cabinet/:cid", (req, res) => {
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                const cabinet = cabinetstore.findCabinetById(Number.parseInt(req.params.cid));
                if (cabinet != null) {
                    if (user.hasPermission(`cabinet_${cabinet.id}#${Permission.READ_CABINET}`)) {
                        res.send(cabinet);
                    } else {
                        res.status(403).end();
                    }
                } else {
                    res.status(404).end();
                }
            })
            .get("/data/cabinet/:cid/log", (req, res) => {
                const cid = Number.parseInt(req.params.cid);
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                if (!user.hasPermission(`cabinet_${cid}#${Permission.READ_CABINET}`)) {
                    res.status(403).end();
                    return;
                }
                const cabinet = cabinetstore.findCabinetById(cid);
                if (cabinet == null) {
                    console.log("Cabinet not FOUND...");
                    res.status(404).end();
                    return;
                }
                const frontLock = lockstore.findLockById(cabinet.frontLock);
                const backLock = lockstore.findLockById(cabinet.backLock);
                // FETCH LOGS
                const permFront: boolean = frontLock != null && user.hasPermission(`lock_${frontLock.id}#${Permission.READ_LOG}`);
                const permBack: boolean = backLock != null && user.hasPermission(`lock_${backLock.id}#${Permission.READ_LOG}`);
                const logs: any[] = [];
                if (permFront && frontLock) {
                    logs.push(...CameraHandler.getInstance().getLogWithPhotos(frontLock));
                }
                if (permBack && backLock) {
                    logs.push(...CameraHandler.getInstance().getLogWithPhotos(backLock));
                }
                return res.send(logs);
            })
            .post("/data/cage/:id/cabinet", (req, res) => {
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                if (!user.hasPermission(Permission.WRITE_CABINET)) {
                    res.status(403).end();
                    return;
                }
                const cabinet = new Cabinet(req.body);
                cabinet.cage = Number.parseInt(req.params.id);
                const result = cabinetstore.addCabinet(cabinet)
                if (result === true) {
                    res.send(cabinet);
                } else {
                    res.status(409).json(result);
                }
            })
            .put("/data/cage/:id/cabinet/:cid", (req, res) => {
                const cid = Number.parseInt(req.params.cid);
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                if (!user.hasPermission(`cabinet_${cid}#${Permission.WRITE_CABINET}`)) {
                    res.status(403).end();
                    return;
                }
                const cabinet = cabinetstore.patchCabinet(cid, req.body);
                if (cabinet === false) {
                    res.status(409).send(cabinetstore.findCabinetById(Number.parseInt(req.body.id)));
                } else if (cabinet !== null) {
                    res.send(cabinet);
                    return;
                }
                res.status(404).end();
            })
            .delete("/data/cage/:id/cabinet/:cid", (req, res) => {
                const cid = Number.parseInt(req.params.cid);
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                if (!user.hasPermission(`cabinet_${cid}#${Permission.WRITE_CABINET}`)) {
                    res.status(403).end();
                    return;
                }
                res.send(cabinetstore.deleteCabinet(cid));
            });
    }
}
