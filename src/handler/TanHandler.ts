import RestServer from "../server/Restserver";
import TanStore from "../data/DataStores/TanStore";
import Tan from "../model/Tan";
import { AxiosStatic } from "axios";

const CHECK_TIME = 10_000;

export default class TanHandler {
    private static instance: TanHandler;
    private server: RestServer;
    private axios: AxiosStatic;

    private timeout: any;
    private tanStore: TanStore;

    constructor() {
        this.tanStore = TanStore.getInstance();
    }

    public static getInstance(): TanHandler {
        if (TanHandler.instance == null) {
            TanHandler.instance = new TanHandler();
        }
        return TanHandler.instance;
    }

    public createTan(tan: Tan, pin: string) {
        return new Promise((resolve, reject) => {
            this.axios.get(tan.lock.getBaseUrl() + `/user/create/${tan.user}/${pin}`)
                .then(res => {
                    this.tanStore.createTan(tan);
                    resolve(tan);
                })
                .catch(err => {
                    console.error("Create ERR",err);
                    reject(err);
                });
        });
    }

    public removeTan(tan: Tan) {
        return new Promise((resolve, reject) => {
            this.axios.get(tan.lock.getBaseUrl() + `/user/delete/${tan.user}`)
                .then(res => {
                    this.tanStore.deleteTan(tan);
                    resolve();
                })
                .catch(err => {
                    console.error("unable to delete tan from lock", tan);
                    reject();
                });
        });
    }

    private cleanupTans() {
        this.tanStore.getTans().forEach((tan: Tan) => {
            if (tan.ttl <= new Date().getTime()) {
                this.axios.get(tan.lock.getBaseUrl() + `/user/delete/${tan.user}`)
                    .then(res => {
                        this.tanStore.deleteTan(tan);
                    })
                    .catch(err => {
                        console.error("unable to delete tan from lock", tan);
                    });
            }
        });

        if (this.timeout != undefined) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }

        this.timeout = setTimeout(()=>{this.cleanupTans();}, CHECK_TIME);
    }

    public init(pluginConfig: any) {
        this.server = pluginConfig.server;
        this.axios = pluginConfig.axios;

        this.cleanupTans();
    }
}