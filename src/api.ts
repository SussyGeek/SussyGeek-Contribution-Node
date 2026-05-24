import axios, { AxiosInstance } from 'axios';
import { StudentData, BatchResponse, GFG_PROFILE } from './config';

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

    /** Fetch the frozen, ordered student list cached on the backend. */
    async getStudentList(instituteId: string): Promise<{ handle: string; user_id: number }[]> {
        const { data } = await this.client.get(`/student/${instituteId}/list`);
        return data.data.students;
    }

    /** Stop an active contribution session. */
    async stop(instituteId: string): Promise<{ success: boolean; message: string }> {
        const { data } = await this.client.patch(`/contribute/stop/${instituteId}`);
        return data;
    }
}

// Client API for profile scrapping.
export class GFGAPI {

    /** Fetch raw profile HTML for a single user. */
    static async getProfileHTML(username: string): Promise<string> {
        const { data } = await axios.get(
            `${GFG_PROFILE}/${username}?tab=activity`,
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
