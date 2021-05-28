import RestServer from "../server/RestServer";
import EventHandlerOptions from "../model/EventHandlerOptions";
import TanLockEvent from "../model/TanLockEvent";
import IRoute from "./IRoute";
import LockStore from "../data/DataStores/LockStore";
import LockEventHandler from "../handler/LockEventHandler";

const lockstore: LockStore = LockStore.getInstance();

export default class EventRoute implements IRoute {
    public publicURLs(): string[] {
        return ["/event/?.*", "/standard\-event/?"];
    }

    public init(server: RestServer): void {
        server.app
            .all('/event', (req, res) => {
                this.handleEvent(req);
                res.status(200).end();
            })
            .all('/event/:eventId', (req, res) => {
                this.handleEvent(req);
                res.status(200).end();
            })
            .all('/standard-event', (req, res) => {
                this.handleStandardEvent(req);
                res.status(200).end();
            });
    }

    private static getRemoteIp(req): string {
        if (req.headers['x-forwarded-for'] != undefined) {
            return req.headers['x-forwarded-for'][0];
        } else {
            return req.connection.remoteAddress;
        }
    }

    private handleEvent(req) {

        let remoteAddress = EventRoute.getRemoteIp(req);
        let tanlock = lockstore.findLockByIp(remoteAddress);

        const event = EventHandlerOptions.generate(tanlock, remoteAddress);

        if (req.params.eventId == undefined) {
            event.eventId = TanLockEvent.GENERIC;
            event.event = TanLockEvent.GENERIC;
        } else {
            if (Number.isNaN(event.eventId)) {
                event.eventId = req.params.eventId;
            } else {
                event.eventId = Number.parseInt(req.params.eventId);
            }
        }

        if (process.env.VERBOSE == "true")
            console.log(new Date().toLocaleTimeString() + " " + req.method + "  " + req.url + "  " + JSON.stringify(req.query));

        LockEventHandler.getInstance().handle(event, req.body, req);
    }

    private handleStandardEvent(req) {
        let remoteAddress = EventRoute.getRemoteIp(req);
        let tanlock = lockstore.findLockByIp(remoteAddress);

        const event = EventHandlerOptions.generate(tanlock, remoteAddress);

        const evntBody = req.body;
        const eventHandler = TanLockEvent.STD_EVENTS_ENUM[evntBody.event];

        event.event = eventHandler(evntBody.data);

        if (process.env.VERBOSE == "true")
            console.log(new Date().toLocaleTimeString() + " [STANDARD] " + req.method + "  " + req.url + "  " + JSON.stringify(req.query));

        LockEventHandler.getInstance().handle(event, req.body, req, true);
    }
};
