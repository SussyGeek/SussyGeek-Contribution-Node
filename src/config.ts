export const BATCH_SIZE = 20;
export const PROFILE_DELAY = 7;   // seconds between each profile scrape
export const BATCH_DELAY = 12;   // seconds cooldown after a full batch

export const GFG_API = 'https://practiceapi.geeksforgeeks.org/api/v1';
export const GFG_PROFILE = 'https://www.geeksforgeeks.org/profile';

export const MODE_MAP: Record<
    "contribute" | "stop" | "exit",
    string
> = {
    contribute: "1",
    stop: "2",
    exit: "3",
};

// --- Types ---

export interface StudentData {
    id: string;
    username: string;
    fullName?: string;
    institution?: string;
    codingScore: number;
    problemsSolved: number;
    instituteRank: number;
    streak?: number;
    longestStreak: number;
    scrapedAt: string;
}

export interface BlockConfig {
    assignedBlockId: number;
    startingPage: number;
    endingPage: number;
    batchSize: number;
    blockSize: number;
}

export interface BatchResponse {
    success: true;
    data: {
        startingPage: number;
        endingPage: number;
        batchSize: number;
        assignedBlockId: number;
        blockSize: number;
        isBlockComplete?: boolean;
        instituteScrappedCount: number;
    };
}
