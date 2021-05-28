import PluginConfig from "../model/PluginConfig";
import TanLockEvent from "../model/TanLockEvent";
import TanLock from "../model/TanLock";
import EventHandlerOptions from "../model/EventHandlerOptions";
import CabinetLogEntry from "../model/CabinetLogEntry";
import ExtendedLoggerType from "../model/ExtendedLoggerType";
import ExtendedLogger from "../data/ExtendedLogger";
import LockStore from "../data/DataStores/LockStore";
import LogStore from "../data/DataStores/LogStore";

const lockstore: LockStore = LockStore.getInstance();
const logstore: LogStore = LogStore.getInstance();

export default class LockEventHandler {
    private static instance: LockEventHandler | null = null;
    private config: PluginConfig;

    private constructor() {
    }

    public static getInstance(): LockEventHandler {
        if (this.instance === null) {
            this.instance = new LockEventHandler();
        }
        return this.instance;
    }

    public init(config: PluginConfig) {
        this.config = config;
    }

    public handle(event: EventHandlerOptions, body: any, req, eventFilled: boolean = false) {
        return new Promise<EventHandlerOptions>((resolve, reject) => {
            let evalInfoPage = false;
            if (event.tanlock === null) {
                evalInfoPage = true;
                event.tanlock = lockstore.addUnknownLock(event.remoteAddress);
            }

            event.tanlock = lockstore.updateLockHeartBeat(event.remoteAddress);

            if (!eventFilled) {
                switch (event.eventId) {
                    case "generic":
                        resolve(event);
                        return;
                    case "heartbeat":
                        event.event = TanLockEvent.HEARTBEAT;
                        break;
                    case 2:
                        event.event = TanLockEvent.BOOT;
                        break;
                    case 3:
                        event.event = TanLockEvent.PINENTERING;
                        break;
                    case 4:
                        event.event = TanLockEvent.PINTIMEOUT;
                        break;
                    case 5:
                        event.event = TanLockEvent.PINERROR;
                        break;
                    case 6:
                        event.event = TanLockEvent.UNLOCKING;
                        break;
                    case 7:
                        event.event = TanLockEvent.LOCKING;
                        break;
                    case 8:
                        event.event = TanLockEvent.OPENING;
                        break;
                    case 9:
                        event.event = TanLockEvent.CLOSING;
                        break;
                    case 10:
                        event.event = TanLockEvent.S1_OPEN;
                        event.tanlock.door_1 = false;
                        event.tanlock.useDoor_1 = true;
                        break;
                    case 11:
                        event.event = TanLockEvent.S1_CLOSE;
                        event.tanlock.door_1 = true;
                        event.tanlock.useDoor_1 = true;
                        break;
                    case 12:
                        event.event = TanLockEvent.S2_OPEN;
                        event.tanlock.door_2 = false;
                        event.tanlock.useDoor_2 = true;
                        break;
                    case 13:
                        event.event = TanLockEvent.S2_CLOSE;
                        event.tanlock.door_2 = true;
                        event.tanlock.useDoor_2 = true;
                        break;
                    case 14:
                        event.event = TanLockEvent.SUCCESS_LDAP;
                        break;
                    case 15:
                        event.event = TanLockEvent.SUCCESS_LOCAL;
                        break;
                    case 16:
                        event.event = TanLockEvent.SUCCESS_MASTER;
                        break;
                    default:
                        event.event = `unknown_${event.eventId}`;
                        console.error(`Unnknown event ${event.eventId}`);
                        break;
                }
            }

            // Define when to load infoPage
            switch (event.event) {
                case TanLockEvent.SUCCESS_LOCAL:
                case TanLockEvent.SUCCESS_LDAP:
                case TanLockEvent.SUCCESS_MASTER:
                    evalInfoPage = true;
            }

            // DOOR EVENTS
            switch (event.event) {
                case TanLockEvent.HEARTBEAT:
                    break;
                case TanLockEvent.S1_CLOSE:
                case TanLockEvent.S1_OPEN:
                case TanLockEvent.S2_CLOSE:
                case TanLockEvent.S2_OPEN:
                    const updated = lockstore.patchLock(event.tanlock.id, event.tanlock);
                    if (updated != null && updated !== false) {
                        event.tanlock = (updated as TanLock);
                    }
                default:
                    event.tanlock = lockstore.updateLockState(event.tanlock, event.event, true);
                    break;
            }

            if (event.event !== TanLockEvent.HEARTBEAT) {
                this.config.server.emitWS("logEvent", logstore.addLog(event));
            }

            // UPDATE TANlock Object
            this.config.server.emitWS("tanlockEvent", event.tanlock);

            // PLUGIN HANDLING
            if (this.config.server.pluginHandler) {
                this.config.server.pluginHandler.onEvent("tanlockEvent", event);
            }

            //CABINET LOGGING
            if (event.event !== TanLockEvent.HEARTBEAT && event.cabinet != null) {

                const cabinetLog: CabinetLogEntry = new CabinetLogEntry({
                    lock_id: event.tanlock.id,
                    lock_name: event.tanlock.name,
                    time: new Date().getTime(),
                    type: ExtendedLoggerType.TYPETANLOCK,
                    event: event.event
                });

                ExtendedLogger.appendLog(event.tanlock, cabinetLog);
                this.config.server.emitWS("cabinetLog", cabinetLog);
                if (this.config.server.cameraHandler) {
                    this.config.server.cameraHandler.handleEvent(event);
                }
            }

            if (evalInfoPage) {
                // TODO POLL state on First Event
                // TODO Fetch LoggedIn User
                this.fetchLockInfo(event.tanlock)
                    .then((lock) => {
                        event.tanlock = lock;
                        resolve(event)
                    })
                    .catch(err => {
                        reject(err);
                    });
            } else {
                resolve(event);
            }
        });
    }

    fetchLockInfo(lock: TanLock) {
        return new Promise<TanLock>((resolve, reject) => {
            this.config.axios.get(lock.getBaseUrl() + "/info")
                .then((response) => {
                    //MAP SENSORS TO STATE
                    let state = "unknown";
                    if (response.data.sensor.handle === false) {
                        //CLOSED
                        if (response.data.sensor.lock === false) {
                            //UNLOCKED
                            state = "unlocked";
                        } else {
                            //Locked
                            state = "locked";
                        }
                    } else {
                        //OPEN
                        state = "open";
                    }

                    lock.state = state;
                    lock.door_1 = response.data.external.ext_11;
                    lock.door_2 = response.data.external.ext_12;

                    // PATCH LOCK
                    let newLock = lockstore.patchLock(lock.id, lock);
                    if (newLock == null || newLock === false) {
                        resolve(lock);
                        return;
                    } else {
                        lock = newLock as TanLock;
                    }

                    this.config.server.emitWS("tanlockEvent", lock);

                    /**
                     * TODO: Read correct user or extract it directly from the Event ;D
                     */
                    //HAS AUTHED USER
                    if (response.data.user !== "") {
                        let logPayload = `👮 AuthedUser: ${response.data.user}`;
                        this.config.server.emitWS("logEvent", logstore.addLog(lock, logPayload));

                        //CABINET LOGGING
                        const cabinetLog: CabinetLogEntry = new CabinetLogEntry({
                            lock_id: lock.id,
                            lock_name: lock.name,
                            time: new Date().getTime(),
                            type: ExtendedLoggerType.TYPESYSTEM,
                            event: "info",
                            value: logPayload
                        });

                        // PLUGIN HANDLING
                        if (this.config.server.pluginHandler) {
                            const extdEvent = EventHandlerOptions.generate(lock, lock.ip);
                            extdEvent.eventId = cabinetLog.event;
                            extdEvent.event = cabinetLog.event;
                            extdEvent.eventMessage = cabinetLog.value;
                            this.config.server.pluginHandler.onEvent("cabinetLog", extdEvent);
                        }

                        ExtendedLogger.appendLog(lock, cabinetLog);
                        this.config.server.emitWS("cabinetLog", cabinetLog);
                    }
                    resolve(lock);
                })
                .catch((reason) => {
                    lock = lockstore.updateLockState(lock, "error");
                    this.config.server.emitWS("tanlockEvent", lock);
                    this.config.server.emitWS("logEvent", logstore.addLog(lock, `❌ fetching data: ${reason.message}`));
                    reject(reason);
                });
        });
    }
}
