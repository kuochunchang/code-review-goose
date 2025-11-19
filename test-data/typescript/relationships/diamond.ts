class Disposable {
    isDisposed: boolean = false;
    dispose() {
        this.isDisposed = true;
    }
}

class Activatable {
    isActive: boolean = false;
    activate() {
        this.isActive = true;
    }
    deactivate() {
        this.isActive = false;
    }
}

class SmartObject implements Disposable, Activatable {
    // Disposable
    isDisposed: boolean = false;
    dispose: () => void;

    // Activatable
    isActive: boolean = false;
    activate: () => void;
    deactivate: () => void;

    constructor() {
        // Mixin implementation would happen here or via helper
    }
}

function applyMixins(derivedCtor: any, baseCtors: any[]) {
    baseCtors.forEach(baseCtor => {
        Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
            Object.defineProperty(derivedCtor.prototype, name, Object.getOwnPropertyDescriptor(baseCtor.prototype, name)!);
        });
    });
}

applyMixins(SmartObject, [Disposable, Activatable]);
