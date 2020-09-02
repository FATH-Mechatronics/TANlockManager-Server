import TanLock from "./TanLock";
import Cabinet from "./Cabinet";
import Cage from "./Cage";
import Row from "./Row";
import CabinetStore from "../data/DataStores/CabinetStore";
import RowStore from "../data/DataStores/RowStore";
import CageStore from "../data/DataStores/CageStore";

const cabinetstore = CabinetStore.getInstance();
const rowstore = RowStore.getInstance();
const cagestore = CageStore.getInstance();

export default class EventHandlerOptions {
    eventId: number | string;
    eventMessage: null | string;
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
        this.eventMessage = null;
        this.timestamp = new Date().getTime();
    }

    public static generate(tanlock: TanLock|null, remoteAddress: string){
        const event = new EventHandlerOptions();

        event.remoteAddress = remoteAddress
        //FETCH LOCK TreeHirarchie
        event.tanlock = tanlock
        if (event.tanlock != null) {
            event.cabinet = cabinetstore.findCabinetByLock(event.tanlock);
        }
        if (event.cabinet != null) {
            event.row = rowstore.findRowById(event.cabinet.row_id);
        }
        if (event.row != null) {
            event.cage = cagestore.findCageById(event.row.cage_id);
        }

        return event;
    }
}
