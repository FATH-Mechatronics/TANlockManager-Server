import AuthUser from "../model/AuthUser";

export {}

declare global {
    namespace Express {
        interface Request {
            user?: AuthUser,
            jwt?: string
        }
    }
}