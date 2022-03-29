import IRoute from "../IRoute";
import RestServer from "../../server/RestServer";
import Permission from "../../model/Permission";
import RowStore from "../../data/DataStores/RowStore";
import CabinetStore from "../../data/DataStores/CabinetStore";
import Row from "../../model/Row";

const cabinetstore: CabinetStore = CabinetStore.getInstance();
const rowstore: RowStore = RowStore.getInstance();
export default class RowDataRoute implements IRoute {
    public publicURLs(): string[] {
        return [];
    }

    public init(server: RestServer): void {
        server.app
            .get("/data/row", (req, res) => {
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                let list;
                if (req.query.cage !== undefined) {
                    const cid = Number.parseInt(req.query.cage as string);
                    list = rowstore.getRowsOfCage(cid);
                } else {
                    list = rowstore.getRows();
                }
                res.send(list.filter(r => user.hasPermission(`row_${r.id}#${Permission.READ_ROW}`)));
            })
            .get("/data/row/:rid", (req, res) => {
                const rid = Number.parseInt(req.params.rid);
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                if (!user.hasPermission(`row_${rid}#${Permission.WRITE_ROW}`)) {
                    res.status(403).end();
                    return;
                }
                const row = rowstore.findRowById(rid);
                if (row != null) {
                    res.send(row);
                } else {
                    res.status(404).end();
                }
            })
            .post("/data/row", (req, res) => {
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                if (!user.hasPermission(Permission.WRITE_ROW)) {
                    res.status(403).end();
                    return;
                }
                const row = new Row(req.body);
                const result = rowstore.addRow(row);
                if (result === true) {
                    res.send(row);
                } else {
                    res.status(409).json(result);
                }
            })
            .put("/data/row/:rid", (req, res) => {
                const rid = Number.parseInt(req.params.rid);
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                if (!user.hasPermission(`row_${rid}#${Permission.WRITE_ROW}`)) {
                    res.status(403).end();
                    return;
                }
                const row = rowstore.patchRow(rid, req.body);
                if (row === false) {
                    res.status(409).send(rowstore.findRowById(req.body.id));
                } else if (row !== null) {
                    res.send(row);
                }
                res.status(404).end();
            })
            .delete("/data/row/:rid", (req, res) => {
                const rid = Number.parseInt(req.params.rid);
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                if (!user.hasPermission(`row_${rid}#${Permission.WRITE_ROW}`)) {
                    res.status(403).end();
                    return;
                }
                const cabinets = cabinetstore.getCabinetsOfRow(rid);
                if (cabinets.length > 0) {
                    res.status(406).end();
                } else {
                    res.send(rowstore.deleteRow(rid)).end();
                }
            });
    }
}
