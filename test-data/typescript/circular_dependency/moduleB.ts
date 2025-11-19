import { ClassA } from './moduleA';

export class ClassB {
    private a: ClassA | undefined;

    constructor(public value: number) { }

    setA(a: ClassA) {
        this.a = a;
    }

    methodB(): string {
        return `ClassB value: ${this.value}`;
    }

    callA() {
        if (this.a) {
            return `Calling A: ${this.a.name}`;
        }
        return "No A set";
    }
}
