type ServerStatus = {
    status: 'available' | 'unavailable',
    availableCommandUrls: string[],
    error?: any
}

type PanelState = {
    label?: string;
    contents: Item[] | string;
};

type Settings = {
    server_url: string;
    commands: Record<string, Command>;
    debug: 'verbose' | 'off';
};

type Command = {
    active: boolean;
    label: string;
    type:
        | 'panel'
        | 'replace-text'
        | 'insert-text';
    invokeOnOpen: boolean;
};

interface CommandView {
    setData: any;
    redraw: any;
}

// This goes to the server
type Input = {
    vaultPath: string; // The current vault
    notePath?: string; // The active note (if there is one)
    text?: string; // The selected text (if there is)
    variant?: string; // when having different ML models.
};

// This comes from the server
type Item = {
    path: string; // Can be an internal link (or perhaps a url?)
    name: string;
    info?: object;
};

