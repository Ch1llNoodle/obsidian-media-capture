import { normalizePath } from "obsidian";

async function ensureFolder(vault, path) {
    const parts = normalizePath(path).split("/");
    for (let i = 1; i <= parts.length; i++) {
        const part = parts.slice(0, i).join("/");
        if (vault.getAbstractFileByPath(part)) continue;
        try { await vault.createFolder(part); }
        catch (error) { if (!vault.getAbstractFileByPath(part)) throw error; }
    }
}


export { ensureFolder };
