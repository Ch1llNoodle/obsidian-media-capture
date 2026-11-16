await (async () => {
    const {host, t, selected, toggle, ready} = input;
    const document = host.ownerDocument;
    const shapes = JSON.parse(await app.vault.adapter.read('Capture Sample/assets/body-paths.json'));
    const ns = 'http://www.w3.org/2000/svg';
    const groups = {
        chest:'chest', deltoids:'shoulders', biceps:'arms', triceps:'arms', forearm:'arms',
        abs:'core', obliques:'core', trapezius:'back', 'upper-back':'back', 'lower-back':'back',
        gluteal:'legs', quadriceps:'legs', hamstring:'legs', calves:'legs', adductors:'legs', tibialis:'legs',
    };
    const labels = {chest:t('胸'),back:t('背'),shoulders:t('肩'),arms:t('手臂'),core:t('核心'),legs:t('腿')};
    const card = host.createDiv({cls:'capture-sample-body'});
    card.createEl('p', {text:t('点击人体图或勾选肌群，再保存；切换视角保留未保存的选择。')});
    const controls = card.createDiv({cls:'capture-body-controls'});
    const canvas = card.createDiv({cls:'capture-body-canvas'});
    let sex = 'male', side = 'front', rendered = new Map();
    const controlsByKey = [];
    const refresh = () => {
        for (const [name, group] of rendered) {
            const checked = selected(name);
            group.node.setAttribute('aria-pressed',String(checked));
            group.node.setAttribute('data-selected',String(checked));
            group.title.textContent = labels[name] + ' · ' + t(checked ? '已选择' : '未选择');
            for (const shape of group.paths) {
                shape.setAttribute('fill',checked ? 'var(--interactive-accent)' : 'var(--background-modifier-border)');
            }
        }
    };
    function render() {
        canvas.empty();
        rendered = new Map();
        const shape = shapes[sex + '-' + side];
        const svg = document.createElementNS(ns,'svg');
        svg.setAttribute('viewBox',shape.viewBox);
        const [, , bodyWidth, bodyHeight] = shape.viewBox.split(' ').map(Number);
        svg.setAttribute('width','260');
        svg.setAttribute('height',String(260 * bodyHeight / bodyWidth));

        svg.setAttribute('aria-label',t(sex === 'male' ? '男' : '女') + ' · ' + t(side === 'front' ? '正面' : '背面'));




        canvas.append(svg);
        const [cx,cy,rx,ry] = shape.head;
        const head = document.createElementNS(ns,'path');
        head.setAttribute('d','M0 -1 C-.62 -1 -1 -.78 -1 -.35 L-1 .12 C-1 .44 -.78 .73 -.5 .9 Q-.3 1 0 1 Q.3 1 .5 .9 C.78 .73 1 .44 1 .12 L1 -.35 C1 -.78 .62 -1 0 -1 Z');
        head.setAttribute('transform',`translate(${cx} ${cy}) scale(${rx} ${ry})`);
        for (const [key,value] of Object.entries({fill:'var(--background-secondary)',stroke:'var(--text-muted)','stroke-width':1,'vector-effect':'non-scaling-stroke'})) head.setAttribute(key,String(value));
        svg.append(head);
        for (const part of shape.parts) {
            const name = groups[part.slug];
            if (name && !rendered.has(name)) {
                const node = document.createElementNS(ns,'g');
                node.setAttribute('role','button');
                node.setAttribute('tabindex','0');
                node.setAttribute('aria-label',labels[name]);
                node.setAttribute('data-muscle',name);

                const title = document.createElementNS(ns,'title');
                node.append(title);
                const choose = () => { toggle(name); refresh(); };
                node.addEventListener('click',choose);
                node.addEventListener('keydown',event => {
                    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(); }
                });
                svg.append(node);
                rendered.set(name,{node,title,paths:[]});
            }
            for (const d of part.paths) {
                const path = document.createElementNS(ns,'path');
                path.setAttribute('d',d);
                path.setAttribute('fill',name ? 'var(--background-modifier-border)' : 'var(--background-secondary)');
                path.setAttribute('stroke','var(--background-primary)');
                path.setAttribute('stroke-width','.6');
                path.setAttribute('vector-effect','non-scaling-stroke');
                if (name) { const group=rendered.get(name);group.paths.push(path);group.node.append(path); }
                else { path.setAttribute('pointer-events','none');svg.append(path); }
            }
        }
        // Keep the bundled hairless-head contour and all four original view boxes.
        const clipId = 'capture-body-' + Math.random().toString(36).slice(2);
        const defs = document.createElementNS(ns,'defs'), clip = document.createElementNS(ns,'clipPath');
        clip.setAttribute('id',clipId);
        const [x,,width,height] = shape.viewBox.split(' ').map(Number);
        const rect = document.createElementNS(ns,'rect');
        for (const [key,value] of Object.entries({x,y:shape.outlineClipTop ?? cy+ry-2,width,height})) rect.setAttribute(key,String(value));
        clip.append(rect);defs.append(clip);svg.append(defs);
        const outline = document.createElementNS(ns,'path');
        for (const [key,value] of Object.entries({d:shape.outline,fill:'none',stroke:'var(--text-muted)','stroke-width':'1','vector-effect':'non-scaling-stroke','clip-path':'url(#'+clipId+')','pointer-events':'none'})) outline.setAttribute(key,value);
        svg.append(outline);
        refresh();
        for (const control of controlsByKey) control.node.setAttribute('aria-pressed',String((control.kind==='sex'?sex:side)===control.key));
    }
    for (const [kind,title,options] of [
        ['sex',t('体型'),[['male',t('男')],['female',t('女')]]],
        ['side',t('视角'),[['front',t('正面')],['back',t('背面')]]],
    ]) {
        const row=controls.createDiv({attr:{role:'group','aria-label':title}});
        for (const [key,label] of options) {
            const node=row.createEl('button',{text:label,attr:{type:'button'}});
            node.addEventListener('click',()=>{if(kind==='sex')sex=key;else side=key;render();});
            controlsByKey.push({kind,key,node});
        }
    }
    render();
    ready(refresh);
})();
