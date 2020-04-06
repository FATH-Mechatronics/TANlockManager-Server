import axios from 'axios';

axios.defaults.timeout = 30_000;

const expressListener = null;
let restServer: any = null;

function stopRestServer() {
    return new Promise((resolve, reject) => {
        if (restServer !== null) {
            console.log("Stopping Rest");
            restServer.stop().then((v) => {
                console.log(v);
                console.log("RestCallback ");
                resolve();
            }).catch((e) => {
                console.log(e);
                console.log("RestErrCallback ");
                resolve();
            });
            console.log("RestStop Send");
        } else {
            console.log("No Rest");
            resolve();
        }
    });
}

function stopExpressServer() {
    return new Promise((resolve, reject) => {
        if (expressListener != null) {
            console.log("Stopping Express");
            // @ts-ignore
            expressListener.close((v) => {
                console.log(v);
                console.log("ExpressCallback Done");
                resolve();
            });
        } else {
            console.log("No Express");
            resolve();
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
        const RestServer = (await import('./server/Restserver')).default;
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
                    console.log("Switch To Client Mode");
                    // launchUI();
                }
                console.error(err);
            });
    }
}

start();
