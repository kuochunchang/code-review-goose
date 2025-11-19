function log(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: any[]) {
        console.log(`Calling ${propertyKey} with`, args);
        const result = originalMethod.apply(this, args);
        console.log(`Result: ${result}`);
        return result;
    };
    return descriptor;
}

export class Service {
    @log
    process(data: string): string {
        return data.toUpperCase();
    }
}
