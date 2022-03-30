import DataStore from "../data/Datastore";
import LockStore from "../data/DataStores/LockStore";
import TanLock from "../model/TanLock";
import RestServer from "../server/RestServer";
import SensorStore from "../data/DataStores/SensorStore";
import CabinetLogEntry from "../model/CabinetLogEntry";
import ExtendedLoggerType from "../model/ExtendedLoggerType";
import PluginConfig from "../model/PluginConfig";
import {Logger} from "log4js";
import LogProvider from "../logging/LogProvider";

const logger:Logger = LogProvider("SensorFetch")

const datastore = DataStore.getInstance();
const lockstore = LockStore.getInstance();
const sensorstore = SensorStore.getInstance();

export default class SensorFetchHandler {
    private static instance: SensorFetchHandler;

    public static getInstance(): SensorFetchHandler {
        if (SensorFetchHandler.instance == null) {
            SensorFetchHandler.instance = new SensorFetchHandler();
        }
        return SensorFetchHandler.instance;
    }

    private server: RestServer;
    private timeout: any;

    public init(config: PluginConfig) {
        this.server = config.server;
        this.timeout = setTimeout(SensorFetchHandler.getInstance().handle, 10_000);
    }

    public handle() {
        logger.debug("Handle Sensors");
        const locks: TanLock[] = lockstore.getLocks();
        SensorFetchHandler.instance.handleRecursive(locks);
    }

    public handleRecursive(locks: TanLock[]) {
        if (locks.length == 0) {
            let tout: number = datastore.getConfig("monitoringPollInterval");
            tout *= 1000;
            logger.debug("HandleSensors Poll Interval", tout);
            SensorFetchHandler.instance.timeout = setTimeout(SensorFetchHandler.getInstance().handle, tout);
        } else {
            const lock = locks.pop();
            if (this.server.pluginHandler && lock) {
                const lockI = lock; // Wrap against a TANLock Entity because of linting issues
                this.server.pluginHandler.getSensors(lockI).then((sensors: any[]) => {
                    sensorstore.setSensors(lockI, sensors);
                    const cabinetLog: CabinetLogEntry = new CabinetLogEntry(
                        {
                            lock_id: lockI.id,
                            time: (new Date()).getTime(),
                            type: ExtendedLoggerType.TYPESENSORUPDATE,
                            lock_name: lockI.name,
                            value: sensors
                        }
                    );
                    this.server.emitWS("sensorUpdate", cabinetLog);
                    SensorFetchHandler.instance.handleRecursive(locks);
                });
                return;
            } else {
                SensorFetchHandler.instance.handleRecursive(locks);
            }
        }
    }
}
