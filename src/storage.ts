import { normalizePath, type Vault, type TAbstractFile, type TFile } from "obsidian";

async function ensureFolder(vault: Vault, path: string): Promise<void> {
    const parts = normalizePath(path).split("/");
    for (let i = 1; i <= parts.length; i++) {
        const part = parts.slice(0, i).join("/");
        if (vault.getAbstractFileByPath(part)) continue;
        try { await vault.createFolder(part); }
        catch (error) { if (!vault.getAbstractFileByPath(part)) throw error; }
    }
}


export { ensureFolder };

export function isVaultFile(file: TAbstractFile | null | undefined): file is TFile {
    return file != null && 'extension' in file;
}

export function isMarkdownFile(file: TAbstractFile | null | undefined): file is TFile {
    return isVaultFile(file) && file.extension === 'md';
}
