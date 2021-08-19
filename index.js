'use strict'
// imports
const express = require('express');
// let mustacheExpress = require('mustache-express');

// const DeviceModbus = require('./src/modbus_master.js');

const config = require('config');// define process.env.NODE_CONFIG_DIR
const module_cfg = JSON.parse(JSON.stringify(config.get("module")));
const devices_cfg = JSON.parse(JSON.stringify(config.get("devices")));
console.log("Config [module]:", module_cfg);
console.log("Config [devices]:", devices_cfg);

// const things = require('./lib/things_atp/');

const cors = require('cors');
const appInfo = require('./package.json');

console.log(appInfo.name + ":", "Started. Env:", process.env.NODE_ENV);

const app = express();
app.use(express.json());
app.use(cors());

// REST api
app.get('/version', (req, res) => {
    const response = {};
    response.data = {
        name: appInfo.name,
        versions: appInfo.version
    };
    res.json(response)
})
app.get('/module', (req, res) => {
    const response = {};
    response.data = {
        module: module_cfg
    };
    res.json(response)
})
app.get('/devices', (req, res) => {
    const response = {};
    response.data = {
        devices: devices_cfg
    };
    res.json(response)
})

const PORT_HTTP = process.env.PORT_HTTP || 11053;
app.listen(PORT_HTTP, () => console.log(appInfo.name + ":", 'Listening on port ', PORT_HTTP))

console.log(appInfo.name + ":", "End");