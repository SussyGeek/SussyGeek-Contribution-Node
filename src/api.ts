import axios, { AxiosInstance } from 'axios';
import { StudentData, BatchResponse } from './config';

/**
 * Backend API client — authenticated via sessionId cookie.
 */
export class BackendAPI {
    private client: AxiosInstance;

    constructor(backendUrl: string, sessionId: string) {
        this.client = axios.create({
            baseURL: backendUrl,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionId}`
            }
        });
    }

    /** Verify session → returns { username, isActive } */
    async me(): Promise<{ username: string; isActive: boolean }> {
        const { data } = await this.client.get('/user/me');
        return data;
    }

    /** Ping with empty batch → gets block assignment. */
    async ping(instituteId: string): Promise<BatchResponse> {
        const { data } = await this.client.post('/contribute/send/batch', {
            instituteId,
            students: [],
            seconds: 0
        });
        return data;
    }

    /** Submit a scraped batch → returns next page info + isBlockComplete. */
    async submitBatch(
        instituteId: string,
        students: StudentData[],
        seconds: number
    ): Promise<BatchResponse> {
        const { data } = await this.client.post('/contribute/send/batch', {
            instituteId,
            students,
            seconds
        });
        return data;
    }

    /** Stop an active contribution session. */
    async stop(instituteId: string): Promise<{ success: boolean; message: string }> {
        const { data } = await this.client.patch(`/contribute/stop/${instituteId}`);
        return data;
    }
}

/**
 * GFG API client — hits GeeksForGeeks directly from the contributor's machine.
 * No CORS in Node.js. This is what makes it truly distributed.
 */
export class GFGAPI {

    /** Fetch all student handles for an institute. */
    static async getStudentList(instituteId: string): Promise<{ handle: string; user_id: number }[]> {
        const base = 'https://practiceapi.geeksforgeeks.org/api/v1';

        // First call: get total count.
        const { data: peek } = await axios.get(
            `${base}/institute/${instituteId}/students/stats?page=1&page_size=1`
        );
        const count: number = peek.count;
        if (!count || count === 0)
            throw new Error('Institute has no registered students on GFG.');

        // Second call: fetch all handles in one shot.
        const { data: full } = await axios.get(
            `${base}/institute/${instituteId}/students/stats?page=1&page_size=${count}`
        );
        return full.results;
    }

    /** Fetch raw profile HTML for a single user. */
    static async getProfileHTML(username: string): Promise<string> {
        const { data } = await axios.get(
            `https://www.geeksforgeeks.org/profile/${username}?tab=activity`,
            {
                timeout: 15000,
                responseType: 'text',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Referer': 'https://www.geeksforgeeks.org/',
                    'Upgrade-Insecure-Requests': '1',
                    'Cache-Control': 'max-age=0',
                },
                validateStatus: (status: number) => status === 200
            }
        );
        return data;
    }
}
