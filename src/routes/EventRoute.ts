import RestServer from "../server/RestServer";
import EventHandlerOptions from "../model/EventHandlerOptions";
import TanLockEvent from "../model/TanLockEvent";
import IRoute from "./IRoute";
import LockStore from "../data/DataStores/LockStore";
import LockEventHandler from "../handler/LockEventHandler";
import TanLock from "../model/TanLock";
import StandardProvisionHandler from "../handler/StandardProvisionHandler";
import {Logger} from "log4js";
import LogProvider from "../logging/LogProvider";

const logger: Logger = LogProvider("EventRoute");

const lockstore: LockStore = LockStore.getInstance();

export default class EventRoute implements IRoute {
    public publicURLs(): string[] {
        return ["/event/?.*", "/standard-event/?"];
    }

    public init(server: RestServer): void {
        server.app
            .all('/event', (req, res) => {
                EventRoute.handleEvent(req);
                res.status(200).end();
            })
            .all('/event/:eventId', (req, res) => {
                EventRoute.handleEvent(req);
                res.status(200).end();
            })
            .all('/standard-event', (req, res) => {
                EventRoute.handleStandardEvent(req);
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

    private static handleEvent(req) {
        const remoteAddress = EventRoute.getRemoteIp(req);
        const tanlock = lockstore.findLockByIp(remoteAddress);
        /*if (tanlock) {
            let res = lockstore.patchLock(tanlock.id, {software: "7x2"})
            if (res instanceof TanLock) {
                tanlock = res;
            }
        }*/

        const event = EventHandlerOptions.generate(tanlock, remoteAddress);

        if (req.params.eventId == undefined) {
            event.eventId = TanLockEvent.GENERIC;
            event.event = TanLockEvent.GENERIC;
        } else {
            const eventIdNum = Number.parseInt(req.params.eventId);
            if (Number.isNaN(eventIdNum)) {
                event.eventId = req.params.eventId;
            } else {
                event.eventId = eventIdNum;
            }
        }

        logger.debug("New Set EventID is", event.eventId);
        logger.debug(new Date().toLocaleTimeString() + " " + req.method + "  " + req.url + "  " + JSON.stringify(req.query));

        LockEventHandler.getInstance().handle(event, req.body, req);
    }

    private static handleStandardEvent(req) {
        const userAgent = req.header("User-Agent");
        logger.debug(userAgent);
        const remoteAddress = EventRoute.getRemoteIp(req);
        let tanlock = lockstore.findLockByIp(remoteAddress);
        if (tanlock) {
            const res = lockstore.patchLock(tanlock.id, {software: "standard_0.0.1"})
            if (res instanceof TanLock) {
                tanlock = res;
            }
            StandardProvisionHandler.getInstance().provisionLock(tanlock);
        }


        const event = EventHandlerOptions.generate(tanlock, remoteAddress);

        const evntBody = req.body;
        const eventHandler = TanLockEvent.STD_EVENTS_ENUM[evntBody.event];
        if (eventHandler === undefined){
            logger.warn(`No EventHandler found for Event ${evntBody.event}`);
            return;
        }

        event.event = eventHandler(evntBody.data);


        logger.debug(new Date().toLocaleTimeString() + " [STANDARD] " + req.method + "  " + req.url + "  " + JSON.stringify(req.query));

        LockEventHandler.getInstance().handle(event, req.body, req, true);
    }
}
