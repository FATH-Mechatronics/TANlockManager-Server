import IBasePlugin from "./IBasePlugin";
import EventHandlerOptions from "../../model/EventHandlerOptions";

export default interface IEventPlugin extends IBasePlugin {
    onEvent(eventType: string, eventBody: EventHandlerOptions)
}
