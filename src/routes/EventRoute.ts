import RestServer from "../server/Restserver";
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

const lockstore: LockStore = LockStore.getInstance();
const rowstore: RowStore = RowStore.getInstance();
const cagestore: CageStore = CageStore.getInstance();
const cabinetstore: CabinetStore = CabinetStore.getInstance();
const logstore: LogStore = LogStore.getInstance();

export default class EventRoute implements IRoute {
    public publicURLs(): string[] {
        return ["/event/?.*"];
    }

    public init(server: RestServer): void {
        server.app
            .all('/event', (req, res) => {
                const remoteAddress = EventRoute.getRemoteIp(req);
                if (process.env.VERBOSE == "true")
                    console.log(new Date().toLocaleTimeString() + " " + req.method + "  " + req.url + "  " + JSON.stringify(req.query));
                res.status(200).end();
                const tanlock = lockstore.findLockByIp(remoteAddress);

                //FETCH LOCK TreeHirarchie
                let cabinet: Cabinet | null = null;
                if (tanlock != null) {
                    cabinet = cabinetstore.findCabinetByLock(tanlock);
                }
                let row: Row | null = null;
                if (cabinet != null) {
                    row = rowstore.findRowById(cabinet.row_id);
                }
                let cage: Cage | null = null;
                if (row != null){
                    cage = cagestore.findCageById(row.cage_id);
                }

                if (!server.pluginHandler) {
                    return;
                }

                server.pluginHandler.onEvent("tanlockEvent", {
                    eventId: null,
                    event: "generic",
                    remoteAddress,
                    tanlock,
                    cabinet,
                    row,
                    cage
                });
            })
            .all('/event/:eventId', (req, res) => {
                let unknown = false;
                const remoteAddress = EventRoute.getRemoteIp(req);
                let tanlock = lockstore.findLockByIp(remoteAddress);
                // console.log("TANlock: ");
                if (tanlock == null) {
                    tanlock = lockstore.addUnknownLock(remoteAddress);
                    unknown = true;
                    console.log("UNKNOWN TANLOCK");
                }

                if (process.env.VERBOSE == "true")
                    console.log(new Date().toLocaleTimeString() + " " + req.method + "  " + req.url + "  " + JSON.stringify(req.query));
                tanlock = lockstore.updateLockHeartBeat(remoteAddress);
                if (req.params.eventId === "heartbeat") {
                    res.status(200).end();
                    server.emitWS("tanlockEvent", tanlock);
                    return;
                }

                // TODO POLL state on First Event
                let event: string;
                const eventId = parseInt(req.params.eventId);
                switch (eventId) {
                    case 2:
                        event = TanLockEvent.BOOT;
                        break;
                    case 3:
                        event = TanLockEvent.PINENTERING;
                        break;
                    case 4:
                        event = TanLockEvent.PINTIMEOUT;
                        break;
                    case 5:
                        event = TanLockEvent.PINERROR;
                        break;
                    case 6:
                        event = TanLockEvent.UNLOCKING;
                        break;
                    case 7:
                        event = TanLockEvent.LOCKING;
                        break;
                    case 8:
                        event = TanLockEvent.OPENING;
                        break;
                    case 9:
                        event = TanLockEvent.CLOSING;
                        break;
                    case 10:
                        event = TanLockEvent.S1_OPEN;
                        tanlock.door_1 = false;
                        tanlock.useDoor_1 = true;
                        break;
                    case 11:
                        event = TanLockEvent.S1_CLOSE;
                        tanlock.door_1 = true;
                        tanlock.useDoor_1 = true;
                        break;
                    case 12:
                        event = TanLockEvent.S2_OPEN;
                        tanlock.door_2 = false;
                        tanlock.useDoor_2 = true;
                        break;
                    case 13:
                        event = TanLockEvent.S2_CLOSE;
                        tanlock.door_2 = true;
                        tanlock.useDoor_2 = true;
                        break;
                    case 14:
                        event = TanLockEvent.SUCCESS_LDAP;
                        break;
                    case 15:
                        event = TanLockEvent.SUCCESS_LOCAL;
                        break;
                    case 16:
                        event = TanLockEvent.SUCCESS_MASTER;
                        break;
                    default:
                        event = `unknown_${eventId}`;
                        console.error(`Unnknown event ${eventId}`);
                        break;
                }
                // DOORE EVENTS
                if (eventId >= 10) {
                    const updated = lockstore.patchLock(tanlock.id, tanlock);
                    if (updated != null && updated !== false) {
                        tanlock = (updated as TanLock);
                    }
                } else {
                    tanlock = lockstore.updateLockState(tanlock, event, true);
                }
                server.emitWS("tanlockEvent", tanlock);
                server.emitWS("logEvent", logstore.addLog(tanlock, event));
                // server.emitWS("heartBeat", datastore.getSummary());
                res.status(200).end();
                if (unknown) {
                    return;
                }
                //FETCH LOCK TreeHirarchie
                let cabinet: Cabinet | null = null;
                if (tanlock != null) {
                    cabinet = cabinetstore.findCabinetByLock(tanlock);
                }
                let row: Row | null = null;
                if (cabinet != null) {
                    row = rowstore.findRowById(cabinet.row_id);
                }
                let cage: Cage | null = null;
                if (row != null){
                    cage = cagestore.findCageById(row.cage_id);
                }

                const eventOptions: EventHandlerOptions = {
                    eventId: eventId,
                    event,
                    remoteAddress,
                    tanlock,
                    cabinet,
                    row,
                    cage
                };
                if (server.pluginHandler) {
                    server.pluginHandler.onEvent("tanlockEvent", eventOptions);
                }
                if (cabinet != null) {

                    const cabinetLog: CabinetLogEntry = new CabinetLogEntry({
                        lock_id: tanlock.id,
                        lock_name: tanlock.name,
                        time: new Date().getTime(),
                        type: ExtendedLoggerType.TYPETANLOCK,
                        event
                    });

                    ExtendedLogger.appendLog(tanlock, cabinetLog);
                    server.emitWS("cabinetLog", cabinetLog);
                    if (server.cameraHandler) {
                        server.cameraHandler.handleEvent(eventOptions);
                    }
                }
            })
    }

    private static getRemoteIp(req): string {
        if (req.headers['x-forwarded-for'] != undefined) {
            return req.headers['x-forwarded-for'][0];
        } else {
            return req.connection.remoteAddress;
        }
    }
};
