const axios = require('axios');

class GeeksForGeeksProfileScraper {
    constructor() {
        this.baseUrl = 'https://www.geeksforgeeks.org/profile/';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Referer': 'https://www.geeksforgeeks.org/',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0',
        };
    }

    async getProfileData(username) {
        try {
            const url = `${this.baseUrl}${username}?tab=activity`;
            
            const response = await axios.get(url, {
                headers: this.headers,
                timeout: 15000,
                responseType: 'text',
                validateStatus: (status) => status === 200
            });

            const html = response.data;

            return this.fallbackRegexExtraction(html, username);

        } catch (error) {
            console.error(`[${username}] Fatal Error:`, error.message);
            return {
                success: false,
                error: error.message,
                username: username
            };
        }
    }

    fallbackRegexExtraction(html, username) {
        // Extract values - improved to handle escaped strings better
        const extract = (key) => {
            // This regex captures values between quotes/escaped quotes and stops at comma, quote, or brace
            const re = new RegExp(`\\\\?"${key}\\\\?"\\s*:\\s*\\\\?"?([^,"\\\\}]+)`, 'i');
            const match = html.match(re);
            if (match && match[1]) {
                // Clean up the captured value - remove any trailing backslashes or quotes
                return match[1]
                    .replace(/\\+$/g, '')  // Remove trailing backslashes
                    .replace(/"+$/g, '')   // Remove trailing quotes
                    .replace(/\\u0026/g, '&')  // Decode &
                    .trim();
            }
            return null;
        };

        const extractName = () => {
            // CRITICAL FIX: First, look for the user's own data structures that match the username
            
            // Strategy 1: Extract from the mentor object that matches the requested username
            // We need to find: \"mentor\":{\"handle\":\"kartik\",\"name\":\"kartik\"
            // The current regex was too broad and matched ANY mentor object
            
            // Improved pattern: look for mentor object with this specific username
            const mentorPattern = new RegExp(`\\\\"mentor\\\\":\\\\{.*?\\\\"handle\\\\":\\\\"${username}\\\\".*?\\\\"name\\\\":\\\\"([^"]+)\\\\"`, 's');
            let match = html.match(mentorPattern);
            if (match && match[1]) {
                const name = match[1];
                if (name && name.trim()) {
                    return name.replace(/\\u0026/g, '&').trim();
                }
            }

            // Strategy 2: Extract from userData object (this is the most reliable source)
            const userDataPattern = /\\"userData\\":\\{[^}]*\\"data\\":\\{[^}]*\\"name\\":\\"([^"]+)\\"/;
            match = html.match(userDataPattern);
            if (match && match[1]) {
                const name = match[1];
                if (name && name.trim()) {
                    return name.replace(/\\u0026/g, '&').trim();
                }
            }

            // Strategy 3: Fallback - look for name in the specific JSON at the end
            // This avoids picking up names from "topExperts" or other sections
            const jsonEndPattern = /6:\[.*?\\"name\\":\\"([^"]+)\\"/s;
            match = html.match(jsonEndPattern);
            if (match && match[1]) {
                const name = match[1];
                if (name && name.trim()) {
                    return name.replace(/\\u0026/g, '&').trim();
                }
            }

            // Strategy 4: As last resort, look for any name but exclude known "topExperts" patterns
            // This regex specifically avoids the "topExperts" section
            const safeNamePattern = /\\"name\\":\\"([^"]+)\\"(?!.*topExperts)/s;
            match = html.match(safeNamePattern);
            if (match && match[1]) {
                const name = match[1];
                // Additional validation: not a username from topExperts list
                const topExpertsUsernames = ['shubhspj', 'monika13', 'asutosh98', 'lovernat89ch', 'erkhushbossg9', 'namansinghal2'];
                if (name && !topExpertsUsernames.includes(name.toLowerCase()) && name.trim()) {
                    return name.replace(/\\u0026/g, '&').trim();
                }
            }

            return null;
        };

        const score = parseInt(extract('score') || '0', 10);
        const problems = parseInt(extract('total_problems_solved') || '0', 10);
        const rank = parseInt(extract('institute_rank') || '0', 10);
        const streak = parseInt(extract('pod_solved_current_streak') || '0', 10);
        const longestStreak = parseInt(extract('pod_solved_longest_streak') || '0', 10);
        const name = extractName();
        const institute = extract('institute_name');

        if (score === 0 && problems === 0 && !name) {
            throw new Error("Fallback extraction failed. Unable to find profile data.");
        }

        return {
            success: true,
            username: username,
            fullName: name,
            institution: institute,
            codingScore: score,
            problemsSolved: problems,
            instituteRank: rank,
            streak: streak,
            longestStreak: longestStreak,
            scrapedAt: new Date().toISOString(),
            source: "fallback_regex"
        };
    }
}

// Usage
const main = async () => {
    try{
        const scraper = new GeeksForGeeksProfileScraper(); // satvikichvvib
        const result = await scraper.getProfileData('anantchavan');
        console.log(JSON.stringify(result, null, 2));
    } catch(err){
        console.log(err);
    }

};

main();