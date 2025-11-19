async function fetchData(url: string): Promise<string> {
    return new Promise(resolve => setTimeout(() => resolve(`Data from ${url}`), 1000));
}

export class AsyncProcessor {
    async processUrls(urls: string[]): Promise<string[]> {
        const tasks = urls.map(url => fetchData(url));
        return await Promise.all(tasks);
    }
}
