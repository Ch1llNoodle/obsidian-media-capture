const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

test('Wiki contains all language pages and rewrites links for publication',async()=>{
    const {readWikiPages,wikiContent,wikiRemote}=await import('../scripts/publish-wiki.mjs');
    const pages=await readWikiPages();
    for(const topic of ['Home','Getting-started','Save-layouts','Modules','Service-connections','Sample-vault','Troubleshooting']) {
        for(const suffix of ['','-zh-CN','-fr']) assert(pages.has(topic+suffix+'.md'));
    }
    assert(pages.has('_Sidebar.md'));assert(pages.has('_Footer.md'));
    const rendered=wikiContent('[Guide](Getting-started-fr.md#installation) [Source](https://example.test/README.md)');
    assert(rendered.includes('[Guide](Getting-started-fr#installation)'));
    assert(rendered.includes('[Source](https://example.test/README.md)'));
    assert.equal(wikiRemote('git@github.com:owner/repo.git'),'git@github.com:owner/repo.wiki.git');
    assert.equal(wikiRemote('https://github.com/owner/repo.git'),'https://github.com/owner/repo.wiki.git');
    assert.throws(()=>wikiRemote('https://user:secret@github.com/owner/repo.git'));
});

test('Wiki staging preserves unrelated pages and rejects broken links before publishing',async()=>{
    const {stageWikiPages,readWikiPages}=await import('../scripts/publish-wiki.mjs');
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'capture-wiki-test-'));
    try {
        const destination=path.join(temporary,'published');
        await fs.mkdir(destination);
        await fs.writeFile(path.join(destination,'Personal.md'),'Keep this page.');
        const pages=new Map([['Home.md','[Start](Getting-started.md)'],['Getting-started.md','Start here.'],['_Sidebar.md','[Home](Home.md)']]);
        await stageWikiPages(pages,destination);
        assert.equal(await fs.readFile(path.join(destination,'Personal.md'),'utf8'),'Keep this page.');
        assert((await fs.readFile(path.join(destination,'Home.md'),'utf8')).includes('[Start](Getting-started)'));
        const invalid=path.join(temporary,'invalid');
        await fs.mkdir(invalid);
        await fs.writeFile(path.join(invalid,'Home.md'),'[Missing](Missing.md)');
        await fs.writeFile(path.join(invalid,'_Sidebar.md'),'[Home](Home.md)');
        await assert.rejects(readWikiPages(invalid),/Broken wiki link/);
    } finally {
        assert.equal(path.dirname(path.resolve(temporary)),path.resolve(os.tmpdir()));
        assert(path.basename(temporary).startsWith('capture-wiki-test-'));
        await fs.rm(temporary,{recursive:true,force:true});
    }
});
