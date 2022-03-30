export default class TanlockUserAgentHelper {
    /*eslint-disable */
    private static regex005 = /TANlock3 [^_]+_([\d\.]+)(-nightly)?/;
    private static regex006 = /TANlock3\/([\d\.]+)(-nightly)? \((\w+); Build:(\d+)\)/;
    /*eslint-enable */

    public static parse(ua: string): TanlockUserAgent|undefined {
        if (ua.startsWith("TANlock3")) {
            return TanlockUserAgentHelper.parseTanlockUa(ua);
        }
        return undefined;
    }

    private static parseTanlockUa(ua: string): TanlockUserAgent {
        const userAgent = new TanlockUserAgent();
        if (ua.includes("TANlock3/")) {
            // New User Agent String
            // TANlock3/0,0.6-nightly (Category; Build:123)
            const match = this.regex006.exec(ua);
            userAgent.version = match![1];
            userAgent.nightly = match![2] !== undefined;
            userAgent.category = match![3];
            userAgent.build = parseInt(match![4]);
        } else {
            // Old User Agent String
            // "TANlock3 08x03_0.0.5-nightly"
            const match = this.regex005.exec(ua);
            userAgent.version = match![1];
            userAgent.nightly = match![2] !== undefined;
        }
        return userAgent;
    }
}

export class TanlockUserAgent {
    public version: string = "";
    public nightly: boolean = false;

    public category: string = "unknown";
    public build: number = -1;
}
