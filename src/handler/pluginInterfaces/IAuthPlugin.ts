import IBasePlugin from "./IBasePlugin";

export default interface IAuthPlugin extends IBasePlugin {
    autoCreateUser(): boolean;
    defaultRoles(): number[];
    fallbackToLocal(): boolean;
    authenticate(user: string, pass: string): Promise<boolean>;
}
