import {getLogger, levels, Logger} from "log4js";

export default function (category?: string): Logger {
    const logger = getLogger(category);

    if (process.env.VERBOSE === "true") {
        logger.level = levels.DEBUG;
    } else {
        logger.level = levels.INFO;
    }
    return logger;
}
