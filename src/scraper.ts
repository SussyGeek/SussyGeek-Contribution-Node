import { StudentData } from './config';


export function parseProfile(html: string, username: string, user_id: string): StudentData | null {
    return regexExtraction(html, username, user_id);
}

function regexExtraction(html: string, username: string, user_id: string): StudentData | null {
    const extract = (key: string): string | null => {
        const re = new RegExp(`\\\\?"${key}\\\\?"\\s*:\\s*\\\\?"?([^,"\\\\}]+)`, 'i');
        const m = html.match(re);
        if (!m?.[1]) return null;
        return m[1]
            .replace(/\\+$/g, '')
            .replace(/"+$/g, '')
            .replace(/\\u0026/g, '&')
            .trim();
    };

    const score = parseInt(extract('score') || '0', 10);
    const problems = parseInt(extract('total_problems_solved') || '0', 10);
    const rank = parseInt(extract('institute_rank') || '0', 10);
    const streak = parseInt(extract('pod_solved_current_streak') || '0', 10);
    const longestStreak = parseInt(extract('pod_solved_longest_streak') || '0', 10);
    const name = extractName(html, username);
    const institute = extract('institute_name');

    if (score === 0 && problems === 0 && !name) return null;

    return {
        id: user_id,
        username,
        fullName: name ?? undefined,
        institution: institute ?? undefined,
        codingScore: score,
        problemsSolved: problems,
        instituteRank: rank,
        streak,
        longestStreak,
        scrapedAt: new Date().toISOString(),
    };
}

function extractName(html: string, username: string): string | null {
    // Strategy 1: mentor object matching this username
    const mentorRe = new RegExp(
        `\\\\"mentor\\\\":\\\\{.*?\\\\"handle\\\\":\\\\"${username}\\\\".*?\\\\"name\\\\":\\\\"([^"]+)\\\\"`, 's'
    );
    let m = html.match(mentorRe);
    if (m?.[1]?.trim()) return m[1].replace(/\\u0026/g, '&').trim();

    // Strategy 2: userData.data.name
    m = html.match(/\\"userData\\":\\{[^}]*\\"data\\":\\{[^}]*\\"name\\":\\"([^"]+)\\"/);
    if (m?.[1]?.trim()) return m[1].replace(/\\u0026/g, '&').trim();

    // Strategy 3: tail-end JSON name
    m = html.match(/6:\[.*?\\"name\\":\\"([^"]+)\\"/s);
    if (m?.[1]?.trim()) return m[1].replace(/\\u0026/g, '&').trim();

    // Strategy 4: last resort — any name, but exclude known topExperts patterns
    const safeNamePattern = /\\"name\\":\\"([^"]+)\\"(?!.*topExperts)/s;
    m = html.match(safeNamePattern);
    if (m?.[1]?.trim()) {
        const name = m[1].trim();
        const topExpertsUsernames = [
            'shubhspj', 'monika13', 'asutosh98',
            'lovernat89ch', 'erkhushbossg9', 'namansinghal2'
        ];
        if (!topExpertsUsernames.includes(name.toLowerCase())) {
            return name.replace(/\\u0026/g, '&').trim();
        }
    }

    return null;
}
