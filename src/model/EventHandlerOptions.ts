import TanLock from "./TanLock";
import Cabinet from "./Cabinet";

export default class EventHandlerOptions {
    evetnId: number | null;
    event: string;
    remoteAddress: string;
    tanlock: TanLock | null;
    cabinet: Cabinet | null;
}