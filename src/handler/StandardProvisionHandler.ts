import TanLock from "../model/TanLock";
import StandardApiHelper from "./StandardApiHelper";
import LockStore from "../data/DataStores/LockStore";
import {AxiosError} from "axios";

export default class StandardProvisionHandler {
    private static instance: StandardProvisionHandler;

    public static getInstance(): StandardProvisionHandler {
        if (StandardProvisionHandler.instance == null) {
            StandardProvisionHandler.instance = new StandardProvisionHandler();
        }
        return StandardProvisionHandler.instance;
    }

    public async provisionLock(lock: TanLock): Promise<void> {
        console.log("Provision Lock", lock);
        if (lock.software === "standard_0.0.1" && !lock.provisioned) {
            LockStore.getInstance()
                .patchLock(lock.id, {provisioned: true});
            console.log("Really Provisioning");
            const apiHelper = StandardApiHelper.getInstance();
            try {
                await apiHelper.cleanMediums(lock);
                await apiHelper.cleanUsers(lock);
                await apiHelper.createUser(lock, "manager");
                await apiHelper.createUser(lock, "service");
            }catch (e){
                let axError = e as AxiosError
                console.error("Provision Error", axError.config.url, axError.code);

                LockStore.getInstance()
                    .patchLock(lock.id, {provisioned: false});
            }
        }
    }
}
