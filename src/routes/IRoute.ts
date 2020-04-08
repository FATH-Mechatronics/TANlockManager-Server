import RestServer from "../server/RestServer";

export default interface IRoute{
    publicURLs(): string[];
    init(server: RestServer): void;
}
