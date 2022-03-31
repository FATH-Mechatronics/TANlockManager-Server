import TanLock from "../model/TanLock";
import {AxiosStatic} from "axios";
import SensorEntry from "../model/SensorEntry";
import LogProvider from "../logging/LogProvider";
import {Logger} from "log4js";

const logger: Logger = LogProvider("StandardApiHelper")

export default class StandardApiHelper {
    private static instance: StandardApiHelper;
    private axios: AxiosStatic;

    public static getInstance(): StandardApiHelper {
        if (StandardApiHelper.instance == null) {
            StandardApiHelper.instance = new StandardApiHelper();
        }
        return StandardApiHelper.instance;
    }

    public cleanMediums(lock: TanLock) {
        return this.axios.get(`${lock.getLockUrl()}/web/v1/mediums/clear`, {
            auth: StandardApiHelper.getAuth(lock)
        });
    }

    public cleanUsers(lock: TanLock) {
        return this.axios.get(`${lock.getLockUrl()}/web/v1/users/clear`, {
            auth: StandardApiHelper.getAuth(lock)
        });
    }

    public createUser(lock: TanLock, login: string) {
        return this.axios.get(`${lock.getLockUrl()}/web/v1/users/create?login=${login}`, {
            auth: StandardApiHelper.getAuth(lock)
        });
    }

    public createPinInput(lock: TanLock, pin: string, uid: number) {
        return this.axios.get(`${lock.getLockUrl()}/web/v1/mediums/create?type=2&identifier=${pin}&uid=${uid}&start=true&next=0`, {
            auth: StandardApiHelper.getAuth(lock)
        });
    }

    public removePinInput(lock: TanLock, pin: string, uid: number) {
        return this.axios.get(`${lock.getLockUrl()}/web/v1/mediums/delete?type=2&identifier=${pin}&uid=${uid}`, {
            auth: StandardApiHelper.getAuth(lock)
        });
    }

    public async getSensors(lock: TanLock): Promise<SensorEntry[]> {
        try {
            const sensorResponse = await this.axios.get(`${lock.getLockUrl()}/web/v1/sensors`, {
                auth: StandardApiHelper.getAuth(lock)
            });
            const respJson = sensorResponse.data as Array<any>;
            logger.debug("Sensor Response: ", respJson);
            if (Array.isArray(respJson)) {
                return respJson.map(tl => {
                    const sens: SensorEntry = {
                        label: tl.desc, scale: tl.unit, sensor: tl.name, value: tl.val
                    }
                    return sens;
                });
            }
        }catch (err){
            // ignore
        }
        return [];
    }

    public init(pluginConfig: any) {
        this.axios = pluginConfig.axios;
    }

    private static getAuth(lock: TanLock) {
        const apiKeySegments = lock.apiKey.split("/");
        return {
            username: apiKeySegments[0],
            password: apiKeySegments[1]
        };
    }
}
