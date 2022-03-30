import axios from 'axios';
import RestServer from "./server/RestServer";

import {Logger} from "log4js";
import LogProvider from "./logging/LogProvider";
const logger:Logger = LogProvider("main")

axios.defaults.timeout = 30_000;

const expressListener:any = null;
let restServer: any = null;

function stopRestServer() {
    return new Promise((resolve, reject) => {
        if (restServer !== null) {
            logger.debug("Stopping Rest");
            restServer.stop().then((v) => {
                logger.debug("RestCallback", v);
                resolve(null);
            }).catch((e) => {
                logger.error("RestErrCallback ", e);
                resolve( null);
            });
            logger.debug("RestStop Send");
        } else {
            logger.debug("No Rest");
            resolve(null);
        }
    });
}

function stopExpressServer() {
    return new Promise((resolve, reject) => {
        if (expressListener != null) {
            logger.debug("Stopping Express");
            expressListener.close((v) => {
                logger.debug("ExpressCallback Done", v);
                resolve(null);
            });
        } else {
            logger.debug("No Express");
            resolve(null);
        }
    });
}

/*const forge = require('node-forge');
const crypto = require('crypto');
function fingerPrintCA() {
  return new Promise((accept, reject) => {
    CertHandling.getCert().then((certs: { ca: any, cert: any }) => {
      let caTXT = certs.ca.cert.split("\r\n");
      caTXT.shift();
      caTXT.pop();
      caTXT.pop();
      let caCombined = caTXT.join('');
      let fprint = crypto.createHash('sha256').update(Buffer.from(caCombined, "base64")).digest('base64');
      accept("sha256/" + fprint);
    }).catch(err => reject(err));
  });
}*/


async function start() {
    // if (datastore.getConfig("tANlockSelfSignedCert") === true) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    // }
    let noserver = false;
    process.argv.forEach((val, index, array) => {
        if (val === "--no-server") {
            noserver = true;
        }
    });
    if (noserver) {
        // launchUI();
    } else {
        restServer = new RestServer();
        restServer.start()
            .then(() => {
                let noui = false;
                process.argv.forEach((val, index, array) => {
                    if (val === "--no-ui") {
                        noui = true;
                    }
                })
                if (!noui) {
                    // launchUI();
                }
            })
            .catch(err => {
                if (err.code === 'EADDRINUSE') {
                    logger.warn("Switch To Client Mode");
                    // launchUI();
                }
                logger.error(err);
            });
    }
}

start().then(r => {
    logger.info("Server Up and Running");
});
