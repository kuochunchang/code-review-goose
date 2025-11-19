export interface Shape {
    area(): number;
    perimeter(): number;
}

export interface Drawable {
    draw(context: string): void;
}

export abstract class BaseShape implements Shape, Drawable {
    constructor(public color: string) { }

    abstract area(): number;
    abstract perimeter(): number;

    draw(context: string): void {
        console.log(`Drawing ${this.color} shape on ${context}`);
    }
}

export class Circle extends BaseShape {
    constructor(public radius: number, color: string = "red") {
        super(color);
    }

    area(): number {
        return Math.PI * this.radius ** 2;
    }

    perimeter(): number {
        return 2 * Math.PI * this.radius;
    }
}

export class Rectangle extends BaseShape {
    constructor(public width: number, public height: number, color: string = "blue") {
        super(color);
    }

    area(): number {
        return this.width * this.height;
    }

    perimeter(): number {
        return 2 * (this.width + this.height);
    }
}

export class Canvas<T extends Shape> {
    private shapes: T[] = [];

    addShape(shape: T): void {
        this.shapes.push(shape);
    }

    getTotalArea(): number {
        return this.shapes.reduce((sum, shape) => sum + shape.area(), 0);
    }
}

export function createCircle(radius: number): Circle {
    return new Circle(radius);
}
