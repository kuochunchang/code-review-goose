interface Animal {
    speak(): string;
}

class Dog implements Animal {
    speak(): string {
        return "Woof";
    }
}

class Cat implements Animal {
    speak(): string {
        return "Meow";
    }
}

export class AnimalFactory {
    static createAnimal(type: string): Animal {
        if (type === "dog") {
            return new Dog();
        } else if (type === "cat") {
            return new Cat();
        }
        throw new Error("Unknown animal type");
    }
}
