module.exports = function scenario(validate, defaults, options = {}) {
    const { preset, notesFolder, notesPath, notesTemplateFile, notesTemplate, logPath, logHeading, logTemplate, ...settings } = options;
    const rules = (settings.writeRules ?? defaults.writeRules).map(rule => ({...rule}));
    for (const rule of rules) {
        if (preset) rule.enabled = rule.id === 'catalog' ? ['log', 'both'].includes(preset) : rule.id === 'notes' ? ['note', 'both'].includes(preset) : preset === 'show';
        if (rule.id === 'catalog') {
            if (logPath !== undefined) {rule.folder = ''; rule.pathTemplate = logPath;}
            if (logHeading !== undefined) rule.heading = logHeading;
            if (logTemplate !== undefined) rule.template = logTemplate;
        }
        if (rule.id === 'notes') {
            if (notesFolder !== undefined) rule.folder = notesFolder;
            if (notesPath !== undefined) rule.pathTemplate = notesPath;
            if (notesTemplateFile !== undefined) rule.templateFile = notesTemplateFile;
            if (notesTemplate !== undefined) rule.template = notesTemplate;
        }
    }
    return validate({...defaults, ...settings, writeRules: rules});
};
