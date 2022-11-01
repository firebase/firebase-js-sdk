import { expect } from "chai";
import { missingPolyFill } from "../../src/implementation/error";
import { dataFromString, StringFormat } from "../../src/implementation/string";
import { assertThrows } from "../unit/testshared";

describe.only('String browser tests', () => {
    it('should reject if atob is undefined', () => {
        const originalAToB = global.atob;
        // @ts-ignore
        global.atob = undefined;
        const str = 'CpYlM1-XsGxTd1n6izHMU_yY3Bw=';

        const error = assertThrows(() => {
          dataFromString(StringFormat.BASE64URL, str);
        }, 'storage/unsupported-environment');
        expect(error.message).to.equal(missingPolyFill('base-64').message);
        global.atob = originalAToB;
    });
});