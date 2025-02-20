import { DataConnect, QueryRef, queryRef } from '../../src/api';
describe('Typings', () => {
    it('should properly infer the type', () => {
        interface MyData {
            extraField: boolean;
        }
        const extendedType = Object.assign(queryRef<MyData, undefined>({} as DataConnect, '', undefined), {
            __abc: true
        });
        function myFn<Data, Variables>(queryRef: QueryRef<Data, Variables>) {
            const data = {} as Data;
            return {data};
        }
        myFn(extendedType).data.extraField;
    });
});