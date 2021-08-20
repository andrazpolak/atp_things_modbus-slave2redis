"use strict";
let ModbusRTU = require("modbus-serial");
const { EventEmitter } = require('events');
const atp_util = require('atp_util');


function uniqueElementsOfArray(value, index, self) {
    return self.indexOf(value) === index;
}

class DeviceModbus extends EventEmitter {
    constructor(deviceModel) {
        super();
        this._connected = false;
        this._error = false;
        this._deviceModel = deviceModel;
        this._modbus_client = new ModbusRTU();

        this._identity = {
            uuid: this._deviceModel.identity.uuid,
            vendor: this._deviceModel.identity.vendor,
            model: this._deviceModel.identity.model,
            serial: this._deviceModel.identity.serial,
            id_local: this._deviceModel.identity.id_local,
            name: this._deviceModel.identity.name || "Name not defined"
        }

        this._communication = {
            hostname: this._deviceModel.communication.hostname || "test",
            type: this._deviceModel.communication.type || "modbusTCP",
            port: this._deviceModel.communication.port || 502,
            id: this._deviceModel.communication.id || 0,
            read_interval_ms: this._deviceModel.communication.read_interval_ms || 200
        }
        this._localCoils = {};
        this._localRegisters = {};
        this._inputs = this.init_inputs(this._deviceModel.inputs);
        // this._outputs = this.init_Outputs(this._deviceModel.outputs);

        // //Get input registers
        // this._inputs_registers = this.getInputRegisters(this._inputs);
        // this._inputs_registers = this._inputs_registers.filter(uniqueElementsOfArray).sort(function (a, b) { return a - b });
        // console.log("Input registers:", this._inputs_registers);
        // this._inputs_registers_grouped_V2 = this.registersIntervals(this._inputs_registers);


        // // Get input coils
        // this._inputs_coils = this.getInputCoils(this._inputs);
        // this._inputs_coils = this._inputs_coils.filter(uniqueElementsOfArray).sort(function (a, b) { return a - b });
        // this._inputs_coils_grouped = this.registersIntervals(this._inputs_coils);

    }

    init_inputs(data) {
        const inputs = data.map((input) => {
            let measuringPoint = {
                name: input.name,
                register: input.register,
                bit_offset: 0,
                bit_length: 16,
                ts: 0,
                value: 0
            };

            if ('communication_type' in input)
                measuringPoint.communication_type = input.communication_type;
            if ('label' in input)
                measuringPoint.label = input.label;
            if ('bit_offset' in input)
                measuringPoint.bit_offset = input.bit_offset;
            if ('bit_length' in input)
                measuringPoint.bit_length = input.bit_length;
            if ('unit' in input)
                measuringPoint.unit = input.unit;
            if ('type' in input)
                measuringPoint.type = input.type;
            if ('value_type' in input)
                measuringPoint.value_type = input.value_type;
            if ('uuid' in input)
                measuringPoint.uuid = input.uuid;
            if ('convert_function' in input)
                measuringPoint.convert_function = eval(input.convert_function);

            if ('convert_keyvalue' in input && typeof input.convert_keyvalue === 'object')
                measuringPoint.convert_keyvalue = input.convert_keyvalue;

            // TODO: check if function is valid

            return measuringPoint;
        });

        return inputs;
    }
    inputs() {
        if (!atp_util.isArrayNotEmpty(this._inputs))
            return [];

        return this._inputs.map(el => {
            let ret =
            {
                name: el.name,
                ts: el.ts,
                value: el.value
            };

            if ('label' in el)
                ret.label = el.label;
            if ('uuid' in el)
                ret.uuid = el.uuid;
            if ('unit' in el)
                ret.unit = el.unit;
            if ('type' in el)
                ret.type = el.type;
            // if ('value_type' in el)
            //     ret.value_type = el.value_type;

            return ret;
        });
    }
    async modbusSetRegister(addr, value, unitID) {
        // console.log('set register', addr, value, unitID);
        this._localRegisters[addr] = {
            ts: Date.now(),
            value: value
        }
    }

    async modbusSetCoil(addr, value, unitID) {
        // console.log('set coil', addr, value, unitID);
        this._localCoils[addr] = {
            ts: Date.now(),
            value: value
        }
    }

    async modbusGetInputRegister(addr, unitID) {
        if (this._localRegisters[addr] === undefined)
            return 0;
        // console.log('getRegisters1', addr, this._localRegisters[addr].value);
        return this._localRegisters[addr].value;
    };
    async modbusGetHoldingRegister(addr, unitID) {
        if (this._localRegisters[addr] === undefined)
            return 0;
        // console.log('getRegisters2', addr, this._localRegisters[addr].value);
        return this._localRegisters[addr].value;
    };
    async modbusGetCoil(addr, unitID) {

        if (this._localCoils[addr] === undefined)
            return false;

        // console.log('getCoil', addr, this._localCoils[addr].value);
        return this._localCoils[addr].value;
    };

    getCoils() {
        return this._localCoils;
    };
    getRegisters() {
        return this._localRegisters;
    };

    info() {
        console.log("Device info:");
        console.log("Identity:", this._identity);
        console.log("Communication:", this._communication);
        console.log("Inputs:", this._inputs);
        console.log("Outputs:", this._outputs);
    }
};

module.exports = DeviceModbus;