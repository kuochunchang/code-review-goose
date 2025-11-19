export enum Status {
    Pending = "PENDING",
    Running = "RUNNING",
    Completed = "COMPLETED",
    Failed = "FAILED"
}

export enum NumericStatus {
    Pending,
    Running,
    Completed,
    Failed
}

export class Task {
    constructor(public name: string, public status: Status = Status.Pending) { }
}
