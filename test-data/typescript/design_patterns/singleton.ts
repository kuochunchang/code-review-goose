export class Singleton {
    private static instance: Singleton;
    public value: string;

    private constructor() {
        this.value = "I am the only one";
    }

    public static getInstance(): Singleton {
        if (!Singleton.instance) {
            Singleton.instance = new Singleton();
        }
        return Singleton.instance;
    }
}
