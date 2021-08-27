import RestServer from "../server/RestServer";
import TanStore from "../data/DataStores/TanStore";
import Tan from "../model/Tan";
import {AxiosResponse, AxiosStatic} from "axios";
import TanLock from "../model/TanLock";
import CabinetLogEntry from "../model/CabinetLogEntry";
import ExtendedLoggerType from "../model/ExtendedLoggerType";
import ExtendedLogger from "../data/ExtendedLogger";
import LogStore from "../data/DataStores/LogStore";
import StandardApiHelper from "./StandardApiHelper";

const CHECK_TIME = 10_000;

export default class TanHandler {
    private static instance: TanHandler;
    private server: RestServer;
    private axios: AxiosStatic;

    private timeout: any;
    private tanStore: TanStore;
    private logStore: LogStore;

    constructor() {
        this.tanStore = TanStore.getInstance();
        this.logStore = LogStore.getInstance();
    }

    public static getInstance(): TanHandler {
        if (TanHandler.instance == null) {
            TanHandler.instance = new TanHandler();
        }
        return TanHandler.instance;
    }

    public createTan(tan: Tan, pin: string) {
        return new Promise((resolve, reject) => {
            let promise: Promise<any>;

            if (tan.lock.software === "7x2") {
                promise = this.axios.get(tan.lock.getBaseUrl() + `/user/create/${tan.user}/${pin}`)

            } else {
                promise = StandardApiHelper.getInstance().createPinInput(tan.lock, `${tan.user}${pin}`, 1)

            }
            promise.then(res => {
                this.tanStore.createTan(tan);
                resolve(tan);
            })
                .catch(err => {
                    console.error("Create ERR", err);
                    reject(err);
                });

        });
    }

    public removeTan(tan: Tan) {
        return new Promise((resolve, reject) => {
            let promise: Promise<any>;
            if (tan.lock.software === "7x2") {
                promise = this.axios.get(tan.lock.getBaseUrl() + `/user/delete/${tan.user}`)
            } else {
                promise = StandardApiHelper.getInstance().removePinInput(tan.lock, `${tan.user}${tan.pin}`, 1)
            }
            promise.then(res => {
                this.tanStore.deleteTan(tan);
                resolve();
            }).catch(err => {
                console.error("unable to delete tan from lock", tan);
                reject();
            });
        });
    }

    private cleanupTans() {
        this.tanStore.getTans().forEach((tan: Tan) => {
            if (tan.ttl <= new Date().getTime()) {
                this.removeTan(tan)
                    .then(() => {
                        this.server.emitWS("logEvent", this.logStore.addLog(tan.lock, `🔢 TAN Reached EOL and was Deleted! Identifyer: ${tan.user} Note: ${tan.note}`));
                        //CABINET LOGGING
                        const cabinetLog: CabinetLogEntry = new CabinetLogEntry({
                            lock_id: tan.lock.id,
                            lock_name: tan.lock.name,
                            time: new Date().getTime(),
                            type: ExtendedLoggerType.TYPESYSTEM,
                            event: 'TAN',
                            value: `🔢🔢 TAN Reached EOL and was Deleted! Identifyer: ${tan.user} Note: ${tan.note} TTL: ${tan.ttl}`
                        });

                        ExtendedLogger.appendLog(tan.lock, cabinetLog);
                        this.server.emitWS("cabinetLog", cabinetLog);
                    })
            }
        });

        if (this.timeout != undefined) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }

        this.timeout = setTimeout(() => {
            this.cleanupTans();
        }, CHECK_TIME);
    }

    public init(pluginConfig: any) {
        this.server = pluginConfig.server;
        this.axios = pluginConfig.axios;

        this.cleanupTans();
    }
}
