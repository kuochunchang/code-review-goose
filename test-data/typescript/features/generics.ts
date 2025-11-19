export interface Container<T> {
    value: T;
    getValue(): T;
}

export class Box<T> implements Container<T> {
    constructor(public value: T) { }

    getValue(): T {
        return this.value;
    }
}

export function identity<T>(arg: T): T {
    return arg;
}
