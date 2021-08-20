'use strict'
// imports
const express = require('express');
let mustacheExpress = require('mustache-express');
let ModbusRTU = require("modbus-serial");
const DeviceModbus = require('./src/modbus_client');

const config = require('config');// define process.env.NODE_CONFIG_DIR
const module_cfg = JSON.parse(JSON.stringify(config.get("module")));
const devices_cfg = JSON.parse(JSON.stringify(config.get("devices")));
console.log("Config [module]:", module_cfg);
console.log("Config [devices]:", devices_cfg);


const cors = require('cors');
const appInfo = require('./package.json');

console.log(appInfo.name + ":", "Started. Env:", process.env.NODE_ENV);

const app = express();
app.use(express.json());
app.use(cors());
app.set('views', `${__dirname}/views`);
app.set('view engine', 'mustache');
app.engine('mustache', mustacheExpress());
let appRenderData = {
    pageTitle: appInfo.name,
    module: module_cfg
}

let devices = devices_cfg;
console.log("Devices:", devices_cfg);
let newDevice = new DeviceModbus(devices_cfg[0]);

var vector = {
    getInputRegister: async function (addr, unitID) {
        return await newDevice.modbusGetInputRegister(addr, unitID);
    },
    getHoldingRegister: async function (addr, unitID) {
        return await newDevice.modbusGetHoldingRegister(addr, unitID);
    },
    getCoil: async function (addr, unitID) {
        return await newDevice.modbusGetCoil(addr, unitID);
        // return true;

    },
    setRegister: async function (addr, value, unitID) {
        return await newDevice.modbusSetRegister(addr, value, unitID);
    },
    setCoil: async function (addr, value, unitID) {
        return await newDevice.modbusSetCoil(addr, value, unitID);
    }
};

// HTTP 
app.get('/', (req, res) => {
    appRenderData.devices = devices.map(device => {
        return {
            identity: device.identity,
            communication: device.communication,
            data: {
                inputs: newDevice.inputs(),
                coils: newDevice.getCoils(),
                registers: newDevice.getRegisters()
                //  outputs: device.outputs(),
                // status: device.status(),
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
app.get('/coils', (req, res) => {
    const response = {};
    response.data = {
        coils: newDevice.getCoils()
    };
    res.json(response)
})
app.get('/registers', (req, res) => {
    const response = {};
    response.data = {
        registers: newDevice.getRegisters()
    };
    res.json(response)
})


// Set Modbus TCP server
const PORT_TCPIP = process.env.PORT_TCPIP || 502;
console.log('ModbusTCP listening on modbus://0.0.0.0:' + PORT_TCPIP);
var serverTCP = new ModbusRTU.ServerTCP(vector, { host: '0.0.0.0', port: PORT_TCPIP });
// Set HTTP server
const PORT_HTTP = process.env.PORT_HTTP || 11053;
app.listen(PORT_HTTP, () => console.log(appInfo.name + ":", 'Listening on port ', PORT_HTTP))

console.log(appInfo.name + ":", "End");