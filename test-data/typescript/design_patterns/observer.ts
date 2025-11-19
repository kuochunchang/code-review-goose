interface Observer {
    update(message: string): void;
}

export class ConcreteObserver implements Observer {
    constructor(private name: string) { }

    update(message: string): void {
        console.log(`${this.name} received: ${message}`);
    }
}

export class Subject {
    private observers: Observer[] = [];

    attach(observer: Observer): void {
        this.observers.push(observer);
    }

    detach(observer: Observer): void {
        const index = this.observers.indexOf(observer);
        if (index > -1) {
            this.observers.splice(index, 1);
        }
    }

    notify(message: string): void {
        for (const observer of this.observers) {
            observer.update(message);
        }
    }
}
