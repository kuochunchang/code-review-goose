/* eslint-disable @typescript-eslint/no-namespace */
export namespace Utilities {
    export function log(message: string) {
        console.log(message);
    }

    export class Logger {
        log(message: string) {
            console.log(message);
        }
    }
}

export namespace App {
    export const name = "MyApp";
}
