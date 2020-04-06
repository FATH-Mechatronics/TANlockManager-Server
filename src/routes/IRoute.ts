import RestServer from "../server/Restserver";

export default interface IRoute{
    publicURLs(): string[];
    init(server: RestServer): void;
}