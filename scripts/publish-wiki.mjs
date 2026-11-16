import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const sourceDirectory = fileURLToPath(new URL('../docs/wiki/', import.meta.url));
const project = fileURLToPath(new URL('../', import.meta.url));
const managedMarker = '<!-- Maintained in docs/wiki; publish with npm run wiki:publish. -->';
const git = (args, cwd) => {
    const nativeSsh = process.platform === 'win32' ? path.join(process.env.SystemRoot ?? 'C:/Windows', 'System32/OpenSSH/ssh.exe').replaceAll('\\', '/') : null;
    const prefix = nativeSsh && existsSync(nativeSsh) ? ['-c', `core.sshCommand=${nativeSsh}`] : [];
    return execFileSync('git', [...prefix, ...args], { cwd, encoding: 'utf8', timeout: 60000, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
};

export async function readWikiPages(source = sourceDirectory) {
    const names = (await readdir(source)).filter(name => name.endsWith('.md')).sort();
    if (!names.includes('Home.md') || !names.includes('_Sidebar.md')) throw new Error('Wiki needs Home.md and _Sidebar.md.');
    const pages = new Map();
    for (const name of names) {
        if (!/^[A-Za-z0-9_-]+\.md$/.test(name)) throw new Error(`Unsupported wiki filename: ${name}`);
        const text = await readFile(path.join(source, name), 'utf8');
        if (!text.trim()) throw new Error(`Empty wiki page: ${name}`);
        for (const match of text.matchAll(/\]\(([^)\s]+)\)/g)) {
            const target = match[1];
            if (/^(https?:|mailto:|#)/.test(target)) continue;
            const page = target.split('#')[0];
            const file = page.endsWith('.md') ? page : page + '.md';
            if (!names.includes(file)) throw new Error(`Broken wiki link: ${name} -> ${target}`);
        }
        pages.set(name, text);
    }
    return pages;
}

export function wikiContent(text) {
    return managedMarker + '\n\n' + text.replace(/\]\(([A-Za-z0-9_-]+)\.md(#[^)]*)?\)/g, ']($1$2)');
}

export async function stageWikiPages(pages, destination) {
    await mkdir(destination, { recursive: true });
    for (const [name, text] of pages) await writeFile(path.join(destination, name), wikiContent(text), 'utf8');
    // Files not represented in the source are left in place, including web-created pages.
    return [...pages.keys()];
}

export function wikiRemote(origin) {
    const match = /^(git@github\.com:|https:\/\/github\.com\/)([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:\.git)?$/.exec(origin);
    if (!match || match[2].endsWith('.wiki')) throw new Error('Origin must be a GitHub source repository URL without embedded credentials.');
    return match[1] + match[2] + '.wiki.git';
}

export async function publishWiki({ source = sourceDirectory, remote, author } = {}) {
    const pages = await readWikiPages(source);
    const target = remote ?? wikiRemote(git(['remote', 'get-url', 'origin'], project));
    const identity = author ?? { name: git(['config', 'user.name'], project), email: git(['config', 'user.email'], project) };
    const temporary = await mkdtemp(path.join(os.tmpdir(), 'capture-wiki-'));
    const checkout = path.join(temporary, 'wiki');
    try {
        git(['clone', '--quiet', '--', target, checkout], temporary);
        try { git(['rev-parse', '--verify', 'HEAD'], checkout); }
        catch { throw new Error('The Wiki has no initial page. Create and save Home on GitHub, then retry npm run wiki:publish.'); }
        const names = await stageWikiPages(pages, checkout);
        git(['add', '--', ...names], checkout);
        const changes = git(['diff', '--cached', '--name-only'], checkout);
        if (!changes) return { changed: false, pages: names.length };
        git(['-c', `user.name=${identity.name}`, '-c', `user.email=${identity.email}`, 'commit', '--quiet', '-m', 'docs: sync Capture user guide'], checkout);
        git(['push', 'origin', 'HEAD'], checkout);
        return { changed: true, pages: names.length };
    } finally {
        // Only remove the new temporary checkout owned by this invocation.
        if (path.dirname(path.resolve(temporary)) !== path.resolve(os.tmpdir()) || !path.basename(temporary).startsWith('capture-wiki-')) throw new Error('Unsafe temporary cleanup path.');
        await rm(temporary, { recursive: true, force: true });
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        if (process.argv.length > 3 || process.argv[2] && process.argv[2] !== '--check') throw new Error('Usage: node scripts/publish-wiki.mjs [--check]');
        if (process.argv[2] === '--check') console.log(`Validated ${(await readWikiPages()).size} Wiki pages and local links.`);
        else {
            const result = await publishWiki();
            console.log(result.changed ? `Published ${result.pages} Wiki pages.` : 'Wiki is already up to date.');
        }
    } catch (error) {
        const detail = error.stderr?.toString().trim() || error.message;
        console.error(detail);
        console.error('Wiki publishing did not complete. Check GitHub access, repository Wiki settings and the initial Home page.');
        process.exitCode = 1;
    }
}
