import IBasePlugin from "./IBasePlugin";
import TanLock from "../../model/TanLock";
import SensorEntry from "../../model/SensorEntry";

export default interface ISensorPlugin extends IBasePlugin {
    availSensors(): (SensorEntry | SensorEntry[])[];

    getSensors(lock: TanLock): Promise<(SensorEntry | SensorEntry[])[]>
}
