export interface TaskLine {
    line: number;
    state: string;
    text: string;
    id: string | undefined;
    key: string;
}

export function parseTasks(source: string): TaskLine[] {
    const tasks: TaskLine[] = [];
    let fence: string | null = null;
    let frontmatter = false;
    const occurrences = new Map<string, number>();
    source.split(/\r?\n/).forEach((line, index) => {
        if (index === 0 && line === '---') { frontmatter = true; return; }
        if (frontmatter) { if (/^(---|\.\.\.)\s*$/.test(line)) frontmatter = false; return; }
        const code = /^\s*(?:>\s*)*(`{3,}|~{3,})/.exec(line)?.[1];
        if (code) {
            if (!fence) fence = code;
            else if (code[0] === fence[0] && code.length >= fence.length) fence = null;
            return;
        }
        if (fence) return;
        const match = /^\s*(?:>\s*)*(?:[-*+]|\d+[.)])\s+\[([^\]])\]\s+(.+)$/.exec(line);
        if (!match?.[1] || !match[2]) return;
        const id = /\s\^([\w-]+)\s*$/.exec(match[2])?.[1];
        const text = match[2].replace(/\s+\^[\w-]+\s*$/, '')
            .replace(/\s*[✅❌]\s*\d{4}-\d{2}-\d{2}/gu, '').trim();
        const occurrence = occurrences.get(text) || 0;
        occurrences.set(text, occurrence + 1);
        tasks.push({ line: index, state: match[1], text, id, key: `${text}\0${occurrence}` });
    });
    return tasks;
}

export function completedTasks(before: string, after: string): TaskLine[] {
    const previous = parseTasks(before);
    return parseTasks(after).filter(task => {
        const prior = task.id ? previous.find(item => item.id === task.id) || previous.find(item => item.key === task.key)
            : previous.find(item => item.key === task.key);
        return prior && !/[xX]/.test(prior.state) && /[xX]/.test(task.state);
    });
}

export function insertLog(source: string, heading: string, line: string): string {
    const lines = source.split('\n');
    const start = lines.findIndex(value => value.trim() === heading);
    if (start < 0) return `${source.trimEnd()}\n\n${heading}\n\n${line}\n`;
    const level = /^#+/.exec(heading)?.[0].length || 2;
    let end = start + 1;
    while (end < lines.length && !new RegExp(`^#{1,${level}}\\s`).test(lines[end]!)) end++;
    while (end > start + 1 && !lines[end - 1]!.trim()) end--;
    lines.splice(end, 0, '', line);
    return lines.join('\n');
}

export function withoutTaskLog(source: string, id: string): string {
    return source.split('\n').filter(value => !(value.startsWith('☑️') && value.includes(`#^${id}|`))).join('\n');
}
