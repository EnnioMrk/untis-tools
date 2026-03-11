export function formatSubjectDisplayName(subject: string): string {
    const normalized = subject.trim();
    const untisGroupPattern =
        /^(?:[A-Za-z]+\d+(?:\.\d+)*-)([A-Za-zÄÖÜäöüß]+)\d*$/u;
    const match = normalized.match(untisGroupPattern);

    if (!match) {
        return normalized;
    }

    const [, shortName] = match;

    return shortName.charAt(0).toUpperCase() + shortName.slice(1).toLowerCase();
}
