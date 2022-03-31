import TanLock from "../model/TanLock";
import StandardApiHelper from "./StandardApiHelper";
import LockStore from "../data/DataStores/LockStore";
import {AxiosError} from "axios";
import LogProvider from "../logging/LogProvider";
import {Logger} from "log4js";

const logger: Logger = LogProvider("StandardProvisionHandler");

export default class StandardProvisionHandler {
    private static instance: StandardProvisionHandler;

    public static getInstance(): StandardProvisionHandler {
        if (StandardProvisionHandler.instance == null) {
            StandardProvisionHandler.instance = new StandardProvisionHandler();
        }
        return StandardProvisionHandler.instance;
    }

    public async provisionLock(lock: TanLock): Promise<void> {
        logger.debug("Provision Lock", lock);
        if (lock.software.startsWith("standard_") && !lock.provisioned) {
            LockStore.getInstance()
                .patchLock(lock.id, {provisioned: true});
            logger.debug("Really Provisioning");
            const apiHelper = StandardApiHelper.getInstance();
            try {
                await apiHelper.cleanMediums(lock);
                await apiHelper.cleanUsers(lock);
                await apiHelper.createUser(lock, "manager");
                await apiHelper.createUser(lock, "service");
            }catch (e){
                const axError = e as AxiosError
                logger.error("Provision Error", axError);

                LockStore.getInstance()
                    .patchLock(lock.id, {provisioned: false});
            }
        }
    }
}
