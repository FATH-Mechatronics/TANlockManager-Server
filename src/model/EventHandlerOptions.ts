import TanLock from "./TanLock";
import Cabinet from "./Cabinet";
import Cage from "./Cage";
import Row from "./Row";

export default class EventHandlerOptions {
    eventId: number | string;
    event: string;
    remoteAddress: string;
    tanlock: TanLock | null;
    cabinet: Cabinet | null;
    row: Row | null;
    cage: Cage | null;
    timestamp: number;

    constructor() {
        this.event = "generic";
        this.eventId = "generic";
        this.timestamp = new Date().getTime();
    }
}
