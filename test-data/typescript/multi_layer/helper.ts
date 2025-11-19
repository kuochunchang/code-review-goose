import { formatDate, log } from './utils';

export class Helper {
    static process(data: any) {
        log(`Processing data at ${formatDate(new Date())}`);
        return { processed: true, ...data };
    }
}
