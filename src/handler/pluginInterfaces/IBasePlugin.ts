import PluginConfig from "../../model/PluginConfig";

export default interface IBasePlugin {
    init(config: PluginConfig): void;

    name(): string;

    getConfig(): Promise<object>;

    writeConfig(data): void;

    getHelp(): string;
}
