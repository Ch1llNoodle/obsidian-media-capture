import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { deployArtifacts, projectRoot } from './artifacts.mjs';

async function main() {
    const args = process.argv.slice(2);
    if (args.length && (args.length !== 2 || args[0] !== '--vault')) {
        throw new Error('Usage: npm run deploy -- --vault <absolute-vault-path>');
    }
    let vaultPath = args[1] || process.env.MEDIA_CAPTURE_VAULT;
    if (!vaultPath) {
        try {
            const local = JSON.parse(await readFile(path.join(projectRoot, '.deploy.local.json'), 'utf8'));
            vaultPath = local.vaultPath;
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
    }
    if (typeof vaultPath !== 'string' || !path.isAbsolute(vaultPath)) {
        throw new Error('Set an absolute vaultPath in .deploy.local.json, MEDIA_CAPTURE_VAULT, or --vault.');
    }
    const result = await deployArtifacts(vaultPath);
    console.log(`Deployed ${result.files.join(', ')} to ${result.destination}`);
}

main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
