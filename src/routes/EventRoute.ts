import RestServer from "../server/RestServer";
import TanLock from "../model/TanLock";
import Cabinet from "../model/Cabinet";
import EventHandlerOptions from "../model/EventHandlerOptions";
import TanLockEvent from "../model/TanLockEvent";
import ExtendedLogger from "../data/ExtendedLogger";
import CabinetLogEntry from "../model/CabinetLogEntry";
import IRoute from "./IRoute";
import LockStore from "../data/DataStores/LockStore";
import CabinetStore from "../data/DataStores/CabinetStore";
import LogStore from "../data/DataStores/LogStore";
import ExtendedLoggerType from "../model/ExtendedLoggerType";
import Row from "../model/Row";
import RowStore from "../data/DataStores/RowStore";
import CageStore from "../data/DataStores/CageStore";
import Cage from "../model/Cage";
import LockEventHandler from "../handler/LockEventHandler";

const lockstore: LockStore = LockStore.getInstance();
const rowstore: RowStore = RowStore.getInstance();
const cagestore: CageStore = CageStore.getInstance();
const cabinetstore: CabinetStore = CabinetStore.getInstance();

export default class EventRoute implements IRoute {
    public publicURLs(): string[] {
        return ["/event/?.*"];
    }

    public init(server: RestServer): void {
        server.app
            .all('/event', (req, res) => {
                this.handleEvent(req);
                res.status(200).end();
            })
            .all('/event/:eventId', (req, res) => {
                this.handleEvent(req);
                res.status(200).end();
            });
    }

    private static getRemoteIp(req): string {
        if (req.headers['x-forwarded-for'] != undefined) {
            return req.headers['x-forwarded-for'][0];
        } else {
            return req.connection.remoteAddress;
        }
    }

    private handleEvent(req){

        let remoteAddress = EventRoute.getRemoteIp(req);
        let tanlock = lockstore.findLockByIp(remoteAddress);

            const event = EventHandlerOptions.generate(tanlock, remoteAddress);

            if (req.params.eventId == undefined) {
                event.eventId = TanLockEvent.GENERIC;
                event.event = TanLockEvent.GENERIC;
            } else {
                event.eventId = Number.parseInt(req.params.eventId);
                if (Number.isNaN(event.eventId)) {
                    event.eventId = req.params.eventId;
                }
            }

            if (process.env.VERBOSE == "true")
                console.log(new Date().toLocaleTimeString() + " " + req.method + "  " + req.url + "  " + JSON.stringify(req.query));

            LockEventHandler.getInstance().handle(event, req.body, req);
    }
};
