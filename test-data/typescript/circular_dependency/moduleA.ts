import { ClassB } from './moduleB';

export class ClassA {
    private b: ClassB | undefined;

    constructor(public name: string) { }

    setB(b: ClassB) {
        this.b = b;
    }

    callB() {
        if (this.b) {
            return this.b.methodB();
        }
        return "No B set";
    }
}
