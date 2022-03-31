import IRoute from "./IRoute";
import RestServer from "../server/RestServer";
import pkgInfo from "pkginfo";

export default class StatusRoute implements IRoute {
    init(server: RestServer): void {
        pkgInfo(module, 'version');
        server.app
            .get("/api/version", (req, res) => {
                res.send({
                    version: module.exports.version
                });
            });
    }

    publicURLs(): string[] {
        return ["/api/version"];
    }
}
