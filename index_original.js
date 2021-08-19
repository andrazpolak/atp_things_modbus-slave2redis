'use strict'
// imports
const express = require('express');
const bodyParser = require('body-parser');
let mustacheExpress = require('mustache-express');

const DeviceModbus = require('./src/modbus_master.js');

const config = require('config');// define process.env.NODE_CONFIG_DIR
const module_cfg = JSON.parse(JSON.stringify(config.get("module")));
const devices_cfg = JSON.parse(JSON.stringify(config.get("devices")));

console.log("module_cfg:", module_cfg);

const things = require('./lib/things_atp/');

const cors = require('cors');
const appInfo = require('./package.json');

console.log(appInfo.name + ":", "Started. Env:", process.env.NODE_ENV);

const app = express();
app.use(bodyParser.json());
app.use(cors());

//mustage render
app.set('views', `${__dirname}/views`);
app.set('view engine', 'mustache');
app.engine('mustache', mustacheExpress());
app.use(bodyParser.urlencoded({ extended: true }));
let appRenderData = {
    pageTitle: appInfo.name,
}

// when module is connected to redis, send config files of all devices and subscribe to write write channel
things.client.on('connect', async () => {
    // register module
    try {
        await things.module.setIdentity(module_cfg.identity);
        await things.setCfg(module_cfg.identity.uuid, module_cfg);
        await Promise.all(devices_cfg.map(async (device) => {
            try {
                await things.setCfg(device.identity.uuid, device);
                await things.device.setIdentity(device.identity);

            } catch (err) {
                console.log("Register thing_atp_device error:", err);
            }
        }));
    } catch (err) {
        console.log("Register thing_atp error:", err);
    }
    setInterval(reportModuleStatus, module_cfg.communication.interval_ms, module_cfg.identity.uuid);
});

// modbus tcp devices
let devices = devices_cfg.map(async (device) => {

    let newDevice = new DeviceModbus(device);

    // report the status of device connected disconnected
    await things.set(newDevice._identity.uuid, "identity", newDevice._identity);
    setInterval(reportDeviceStatus, module_cfg.communication.interval_ms, newDevice._identity.uuid, newDevice.status.bind(newDevice));

    newDevice.on("inputs", async function (data) {
        try {
            await things.set(this._identity.uuid, "inputs", data);
            await things.publishInputs(this._identity.uuid, data);
        } catch (err) {
            console.log("Redis send data", err);
        }
    })

    // newDevice.on("connected", async function () {
    //     try {
    //        // await things.set(this._identity.uuid, "identity", this._identity);
    //        // await things.setStatus(this._identity.uuid, this.status());


    //     } catch (err) {
    //         console.log("Redis connected error", err);
    //     }
    //     console.log("Modbus device connected:", this._identity);
    // })
    // newDevice.on("disconnected", async function () {
    //     try {
    //         await things.setStatus(this._identity.uuid, this.status());

    //     } catch (err) {
    //         console.log("Redis disconnected error", err);
    //     }
    //     console.log("Modbus device disconnected:", this._identity);
    // })

    return newDevice;
});

app.get('/', (req, res) => {
    appRenderData.devices = devices.map(device => {
        return {
            identity: device._identity,
            communication: device._communication,
            data: {
                inputs: device.inputs(),
                outputs: device.outputs(),
                status: device.status(),
            }
        };
    });
    res.render('enterName', appRenderData);
});

// REST api
app.get('/version', (req, res) => {
    const response = {};
    response.data = {
        name: appInfo.name,
        versions: appInfo.version
    };
    res.json(response)
})

app.get('/devices_cfg', (req, res) => {
    if (devices_cfg)//TODO:
        res.json({ data: devices_cfg });
    else
        res.json({ error: "No config file." });
})

app.get('/data/inputs', (req, res) => {

    let response = devices.map(device => {
        return {
            identity: device._identity,
            data: { inputs: device.inputs() }
        };
    })
    res.json(response)
})

app.get('/data/outputs', (req, res) => {
    let response = devices.map(device => {
        return {
            identity: device._identity,
            data: { outputs: device.outputs() }
        };
    })
    res.json(response)
})

app.post('/data/output/:uuid', async (req, res) => {
    if (!req.params.uuid) {
        res.json({ error: "No UUID." })
        return;
    }

    //TODO: await fo comformation
    devices.some(device => {
        if (device._identity.uuid === req.params.uuid) {
            device.write(req.body);
            return true;
        }
        else
            return false;
    })

    res.json(req.body)
})

// report that module is connected
async function reportModuleStatus(uuid) {
    try {
        await things.setStatusConnected(uuid);
    } catch (err) {
        console.log("Periodically send data to db error:", err)
    }
}

async function reportDeviceStatus(uuid, status) {
    try {
        console.log("Device status [",uuid,"]:", status())
        await things.setStatus(uuid, status());
    } catch (err) {
        console.log("Report status:", err)
    }
}


const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(appInfo.name + ":", 'Listening on port ', PORT))
console.log(appInfo.name + ":", "End");