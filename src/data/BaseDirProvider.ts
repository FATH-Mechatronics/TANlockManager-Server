import path from "path";
import fs from "fs";
import {execSync} from "child_process";
import process from "process";

export default class BaseDirProvider {
    public static basePath: string | null = null;
    public static appPath: string;

    private static _initedDir = false;

    public static mkdirRecursive(path) {
        switch (process.platform) {
            case "win32":
                try {
                    execSync(`mkdir "${path}"`);
                } catch (e) {
                    //ignore
                }
                break;
            case "linux":
                try {
                    execSync(`mkdir -p "${path}"`);
                } catch (e) {
                    //ignore
                }
                break;
        }
    }

    public static getBasePath(): string {
        if (BaseDirProvider.basePath == null) {
            const confPath = path.join(process.cwd(), "config.json");
            console.log("CONFIG PATH: " + confPath);
            try {
                let conf:any = fs.readFileSync(confPath).toString("utf-8");
                conf = JSON.parse(conf);
                BaseDirProvider.basePath = conf.basePath;
                if (BaseDirProvider.basePath == undefined) {
                    this.basePath = "";
                }
            } catch (e) {
                //console.error("CONFERR", e);
                this.basePath = "";
            }
        }
        if (BaseDirProvider.basePath === "") {
            switch (process.platform) {
                case "win32":
                    BaseDirProvider.basePath = path.join(process.env.AppData!, "tanlockmanager");
                    break;
                case "linux":
                    BaseDirProvider.basePath = path.join(process.env.HOME!, ".config", "tanlockmanager");
                    break;
            }
        }

        if (!BaseDirProvider._initedDir) {
            this.mkdirRecursive(BaseDirProvider.basePath);
            BaseDirProvider._initedDir = true;
        }
        if (BaseDirProvider.basePath == null) {
            BaseDirProvider.basePath = ".config";
        }
        return BaseDirProvider.basePath;
    }

}
