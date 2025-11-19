/* eslint-disable @typescript-eslint/naming-convention */
import { vi } from 'vitest';

const Uri: any = {
    parse: vi.fn((path: string) => ({
        path,
        fsPath: path,
        with: vi.fn((change: { path: string }) => ({ ...Uri.parse(change.path) })),
        toString: vi.fn(() => path),
    })),
    file: vi.fn((path: string) => ({
        path,
        fsPath: path,
        with: vi.fn((change: { path: string }) => ({ ...Uri.file(change.path) })),
        toString: vi.fn(() => path),
        scheme: 'file',
    })),
    joinPath: vi.fn((base: any, ...paths: string[]) => {
        const newPath = [base.path, ...paths].join('/').replace(/\/+/g, '/');
        return {
            path: newPath,
            fsPath: newPath,
            with: vi.fn((change: { path: string }) => ({ ...Uri.file(change.path) })),
            toString: vi.fn(() => newPath),
            scheme: 'file',
        };
    }),
};

const FileType = {
    File: 1,
    Directory: 2,
    SymbolicLink: 64,
    Unknown: 0,
};

const StatusBarAlignment = {
    Left: 1,
    Right: 2,
};

const ViewColumn = {
    Active: -1,
    Beside: -2,
    One: 1,
    Two: 2,
    Three: 3,
    Four: 4,
    Five: 5,
    Six: 6,
    Seven: 7,
    Eight: 8,
    Nine: 9,
};

const Disposable = class {
    dispose = vi.fn();
    static from = vi.fn((..._disposables: { dispose: () => any }[]) => {
        return new Disposable();
    });
};

const TextEditorRevealType = {
    Default: 0,
    InCenter: 1,
    InCenterIfOutsideViewport: 2,
    AtTop: 3,
};

const window = {
    createStatusBarItem: vi.fn(() => ({
        show: vi.fn(),
        hide: vi.fn(),
        dispose: vi.fn(),
        text: '',
        command: '',
        tooltip: '',
    })),
    createWebviewPanel: vi.fn(() => ({
        webview: {
            html: '',
            onDidReceiveMessage: vi.fn(() => ({ dispose: vi.fn() })),
            postMessage: vi.fn(async () => { }),
            asWebviewUri: vi.fn((uri: any) => uri),
        },
        reveal: vi.fn(),
        onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
        dispose: vi.fn(),
    })),
    showErrorMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showInformationMessage: vi.fn(),
    showTextDocument: vi.fn(async () => ({
        selection: {} as any,
        revealRange: vi.fn(),
    })),
    activeTextEditor: undefined,
    onDidChangeActiveTextEditor: vi.fn(() => ({ dispose: vi.fn() })),
    fs: {
        readFile: vi.fn(async () => new Uint8Array()),
        stat: vi.fn(async () => ({ type: FileType.File })),
    },
};

const commands = {
    registerCommand: vi.fn(() => ({ dispose: vi.fn() })),
    executeCommand: vi.fn(async () => { }),
};

const workspace = {
    fs: {
        readFile: vi.fn(async () => new Uint8Array()),
        stat: vi.fn(async () => ({ type: FileType.File })),
    },
    findFiles: vi.fn(async () => []),
    workspaceFolders: [],
    getWorkspaceFolder: vi.fn(() => undefined),
    asRelativePath: vi.fn((uri: any) => uri.fsPath),
    getConfiguration: vi.fn(() => ({
        get: vi.fn(() => undefined),
        update: vi.fn(async () => { }),
    })),
    openTextDocument: vi.fn(async (uri: any) => ({
        uri,
        languageId: 'typescript',
        fileName: uri.fsPath.split('/').pop() || 'test.ts',
        getText: vi.fn(() => ''),
    })),
};

class RelativePattern {
    constructor(public base: any, public pattern: string) { }
}

const Range = class {
    constructor(public start: any, public end: any) { }
};

const Position = class {
    constructor(public line: number, public character: number) { }
};

const Location = class {
    constructor(public uri: any, public range: any) { }
};

const env = {
    clipboard: {
        writeText: vi.fn(async () => {}),
        readText: vi.fn(async () => ''),
    },
};

const Selection = class {
    constructor(public anchor: any, public active: any) { }
};

export {
    Uri,
    FileType,
    StatusBarAlignment,
    ViewColumn,
    Disposable,
    window,
    commands,
    workspace,
    RelativePattern,
    Range,
    Position,
    Location,
    TextEditorRevealType,
    env,
    Selection,
};
