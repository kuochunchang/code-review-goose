export function formatDate(date: Date): string {
    return date.toISOString();
}

export function log(message: string) {
    console.log(`[LOG]: ${message}`);
}
