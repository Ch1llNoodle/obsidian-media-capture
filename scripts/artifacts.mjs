import { copyFile, lstat, mkdir, readFile, realpath, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));

export async function readManifest(root = projectRoot) {
    const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
    if (typeof manifest.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(manifest.id) || typeof manifest.version !== 'string') {
        throw new Error('Invalid plugin manifest.');
    }
    return manifest;
}

export function releaseDirectory(manifest, root = projectRoot) {
    return path.join(root, 'release', manifest.id);
}

export async function stageMetadata(manifest, root = projectRoot) {
    const output = releaseDirectory(manifest, root);
    await mkdir(output, { recursive: true });
    await copyFile(path.join(root, 'manifest.json'), path.join(output, 'manifest.json'));
    try {
        await copyFile(path.join(root, 'styles.css'), path.join(output, 'styles.css'));
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        await rm(path.join(output, 'styles.css'), { force: true });
    }
}

async function inspect(file) {
    try { return await lstat(file); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

/** Deploy a fixed allowlist; data.json and other installation files are untouched. */
export async function deployArtifacts(vaultPath, root = projectRoot) {
    const manifest = await readManifest(root);
    const source = releaseDirectory(manifest, root);
    const staged = JSON.parse(await readFile(path.join(source, 'manifest.json'), 'utf8'));
    if (staged.id !== manifest.id || staged.version !== manifest.version) {
        throw new Error('Release metadata is stale. Run npm run build first.');
    }
    const vault = await realpath(vaultPath);
    const config = path.join(vault, '.obsidian');
    const configInfo = await inspect(config);
    if (!configInfo?.isDirectory() || configInfo.isSymbolicLink()) {
        throw new Error('The target must be an existing Obsidian vault with a regular .obsidian directory.');
    }
    const destination = path.join(config, 'plugins', manifest.id);
    for (const directory of [path.join(config, 'plugins'), destination]) {
        const info = await inspect(directory);
        if (info && (!info.isDirectory() || info.isSymbolicLink())) throw new Error('Deployment directories must not be files or symbolic links.');
    }
    if (await inspect(path.join(destination, '.git'))) throw new Error('Refusing to deploy into a source repository.');
    const previous = path.join(destination, 'manifest.json');
    if (await inspect(previous)) {
        const installed = JSON.parse(await readFile(previous, 'utf8'));
        if (installed.id !== manifest.id) throw new Error('The installed plugin ID does not match the release.');
    }
    const files = ['main.js', 'manifest.json'];
    if (await inspect(path.join(source, 'styles.css'))) files.push('styles.css');
    for (const file of files) {
        const sourceInfo = await inspect(path.join(source, file));
        const targetInfo = await inspect(path.join(destination, file));
        if (!sourceInfo?.isFile() || sourceInfo.isSymbolicLink() || targetInfo?.isSymbolicLink()) {
            throw new Error(`Unsafe or missing release file: ${file}`);
        }
        if (targetInfo && !targetInfo.isFile()) throw new Error(`Deployment target is not a file: ${file}`);
    }
    await mkdir(destination, { recursive: true });
    for (const file of files) await copyFile(path.join(source, file), path.join(destination, file));
    return { destination, files };
}
