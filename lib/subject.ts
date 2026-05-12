export const SUBJECT_NAME_MAP: Record<string, string> = {
    sp: "Sport",
    de: "Deutsch",
    en: "Englisch",
    ma: "Mathematik",
    ph: "Physik",
    ch: "Chemie",
    bi: "Biologie",
    ge: "Geschichte",
    er: "Erdkunde",
    ku: "Kunst",
    mu: "Musik",
    if: "Informatik",
    wr: "Wirtschaft/Recht",
    sf: "Seminarfach",
    wn: "Werte und Normen",
    pw: "Politik/Wirtschaft",
};

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

export function formatSubjectName(
    subjectId: string,
    useShort: boolean = true,
): string {
    const shortName = formatSubjectDisplayName(subjectId);

    if (useShort) {
        return shortName;
    }

    const lowerShortName = shortName.toLowerCase();
    const full = SUBJECT_NAME_MAP[lowerShortName];

    if (full) {
        return full;
    }

    if (subjectId.startsWith("sub-")) {
        return `Fach ${subjectId.replace("sub-", "")}`;
    }

    if (/^\d+$/.test(subjectId)) {
        return `Fach ${subjectId}`;
    }

    return shortName;
}
