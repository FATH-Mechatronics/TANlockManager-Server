import IRoute from "../IRoute";
import RestServer from "../../server/Restserver";
import Cage from "../../model/Cage";
import Permission from "../../model/Permission";
import CageStore from "../../data/DataStores/CageStore";
import RowStore from "../../data/DataStores/RowStore";

const rowstore: RowStore = RowStore.getInstance();
const cagestore: CageStore = CageStore.getInstance();
export default class CageDataRoute implements IRoute {
    public publicURLs(): string[] {
        return [];
    }

    public init(server: RestServer): void {
        server.app
            .get("/data/cage", (req, res) => {
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                const list = cagestore.getCages();
                res.send(list.filter(c => user.hasPermission(`cage_${c.id}#${Permission.READ_CAGE}`)));
            })
            .get("/data/cage/:id", (req, res) => {
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                const id = Number.parseInt(req.params.id);
                const cage = cagestore.findCageById(id);
                if (cage != null) {

                    if (user.hasPermission(`cage_${cage.id}#${Permission.READ_CAGE}`)) {
                        res.send(cage);
                    } else {
                        res.sendStatus(403).end();
                    }
                } else {
                    res.sendStatus(404).end();
                }
            })
            .post("/data/cage", (req, res) => {
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                if (!user.hasPermission(Permission.WRITE_CAGE)) {
                    res.status(403).end();
                    return;
                }
                const cage = new Cage(req.body);
                const result = cagestore.addCage(cage);
                if (result === true) {
                    res.send(cage);
                } else {
                    res.status(409).json(result);
                }
            })
            .put("/data/cage/:id", (req, res) => {
                const id = Number.parseInt(req.params.id);
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                if (!user.hasPermission(`cage_${id}#${Permission.WRITE_CAGE}`)) {
                    res.status(403).end();
                    return;
                }
                const cage = cagestore.patchCage(id, req.body);
                if (cage === false) {
                    res.status(409).send(cagestore.findCageById(req.body.id));
                } else if (cage !== null) {
                    res.send(cage);
                }
                res.status(404).end();
            })
            .delete("/data/cage/:id", (req, res) => {
                const id = Number.parseInt(req.params.id);
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                if (!user.hasPermission(`cage_${id}#${Permission.WRITE_CAGE}`)) {
                    res.status(403).end();
                    return;
                }
                const rows = rowstore.getRowsOfCage(id);
                if (rows.length > 0) {
                    res.status(406).end();
                } else {
                    res.send(cagestore.deleteCage(id)).end();
                }
            });
    }
}
