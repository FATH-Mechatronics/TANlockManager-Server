import TanLock from "../../model/TanLock";
import IBasePlugin from "./IBasePlugin";

export default interface ICameraPlugin extends IBasePlugin {
    getImage(lock: TanLock): Promise<any>;

    getLiveCamUrl(lock: TanLock): Promise<string>;

    getImageInterval(lock: TanLock): Promise<number>;
}
