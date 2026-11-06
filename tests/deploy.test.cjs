const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'podcast-deploy-test-'));
    t.after(() => {
        const resolved = path.resolve(root);
        assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
        assert(path.basename(resolved).startsWith('podcast-deploy-test-'));
        fs.rmSync(resolved, { recursive: true, force: true });
    });
    const repo = path.join(root, 'repo');
    const vault = path.join(root, 'vault');
    const release = path.join(repo, 'release', 'media-capture');
    const installed = path.join(vault, '.obsidian', 'plugins', 'media-capture');
    fs.mkdirSync(release, { recursive: true });
    fs.mkdirSync(installed, { recursive: true });
    const manifest = { id: 'media-capture', version: '0.3.1' };
    for (const dir of [repo, release, installed]) fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest));
    fs.writeFileSync(path.join(repo, 'styles.css'), 'source styles');
    fs.writeFileSync(path.join(release, 'main.js'), 'new bundle');
    fs.writeFileSync(path.join(release, 'styles.css'), 'new styles');
    fs.writeFileSync(path.join(release, 'data.json'), 'must not deploy');
    fs.writeFileSync(path.join(release, 'README.md'), 'must not deploy');
    fs.writeFileSync(path.join(installed, 'data.json'), '{"keep":"personal settings"}');
    fs.writeFileSync(path.join(installed, 'main.js'), 'old bundle');
    fs.writeFileSync(path.join(installed, 'custom.txt'), 'keep');
    return { repo, vault, release, installed };
}

test('部署只复制运行文件，保留个人配置和其他安装文件', async t => {
    const { deployArtifacts } = await import('../scripts/artifacts.mjs');
    const f = fixture(t);
    const result = await deployArtifacts(f.vault, f.repo);
    assert.deepEqual(result.files, ['main.js', 'manifest.json', 'styles.css']);
    assert.equal(fs.readFileSync(path.join(f.installed, 'main.js'), 'utf8'), 'new bundle');
    assert.equal(fs.readFileSync(path.join(f.installed, 'data.json'), 'utf8'), '{"keep":"personal settings"}');
    assert.equal(fs.readFileSync(path.join(f.installed, 'custom.txt'), 'utf8'), 'keep');
    assert(!fs.existsSync(path.join(f.installed, 'README.md')));
});

test('发布文件缺失或版本过期时，在写入前拒绝部署', async t => {
    const { deployArtifacts } = await import('../scripts/artifacts.mjs');
    const f = fixture(t);
    fs.unlinkSync(path.join(f.release, 'main.js'));
    await assert.rejects(deployArtifacts(f.vault, f.repo), /missing release file/);
    assert.equal(fs.readFileSync(path.join(f.installed, 'main.js'), 'utf8'), 'old bundle');
    fs.writeFileSync(path.join(f.release, 'main.js'), 'new bundle');
    fs.writeFileSync(path.join(f.release, 'manifest.json'), '{"id":"media-capture","version":"0.0.1"}');
    await assert.rejects(deployArtifacts(f.vault, f.repo), /stale/);
});

test('拒绝无效笔记库、其他插件目录和源码仓库', async t => {
    const { deployArtifacts } = await import('../scripts/artifacts.mjs');
    const f = fixture(t);
    await assert.rejects(deployArtifacts(f.repo, f.repo), /existing Obsidian vault/);
    fs.writeFileSync(path.join(f.installed, 'manifest.json'), '{"id":"other-plugin"}');
    await assert.rejects(deployArtifacts(f.vault, f.repo), /does not match/);
    fs.mkdirSync(path.join(f.installed, '.git'));
    await assert.rejects(deployArtifacts(f.vault, f.repo), /source repository/);
});

test('构建包仅暂存 manifest 与样式，不包含个人配置', async t => {
    const { stageMetadata, readManifest } = await import('../scripts/artifacts.mjs');
    const f = fixture(t);
    const manifest = await readManifest(f.repo);
    await stageMetadata(manifest, f.repo);
    assert.equal(fs.readFileSync(path.join(f.release, 'styles.css'), 'utf8'), 'source styles');
    assert.equal(JSON.parse(fs.readFileSync(path.join(f.release, 'manifest.json'), 'utf8')).version, '0.3.1');
    fs.unlinkSync(path.join(f.repo, 'styles.css'));
    await stageMetadata(manifest, f.repo);
    assert(!fs.existsSync(path.join(f.release, 'styles.css')));
    fs.writeFileSync(path.join(f.repo, 'manifest.json'), '{"id":"../escape","version":"0.3.1"}');
    await assert.rejects(readManifest(f.repo), /Invalid plugin manifest/);
});
