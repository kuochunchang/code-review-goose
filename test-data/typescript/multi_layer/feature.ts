import { Helper } from './helper';

export class Feature {
    run() {
        const result = Helper.process({ id: 123, name: "Test" });
        console.log(result);
    }
}
