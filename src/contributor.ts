import { BackendAPI, GFGAPI } from './api';
import { parseProfile } from './scraper';
import { StudentData, BlockConfig, PROFILE_DELAY, BATCH_DELAY } from './config';
import { sleep } from './utils/utils';

/**
 * Core contribution engine.
 * 
 * Coordinates: GFG scraping (from THIS machine's IP) ↔ Backend (block/batch management).
 * Each contributor instance is a distributed scraping node.
 */
export class Contributor {
    private api: BackendAPI;
    private running = false;
    private students: { handle: string; user_id: number }[] = [];

    // Session stats
    totalStudents = 0;
    totalSeconds = 0;

    constructor(api: BackendAPI) {
        this.api = api;
    }

    /** Start the contribution loop for an institute. */
    async start(instituteId: string): Promise<void> {
        // 1. Ping backend → get block assignment.
        const pingRes = await this.api.ping(instituteId);
        if (!pingRes.success)
            throw new Error('Failed to join contribution network.');

        let config: BlockConfig = {
            assignedBlockId: pingRes.data.assignedBlockId,
            startingPage: pingRes.data.startingPage,
            endingPage: pingRes.data.endingPage,
            batchSize: pingRes.data.batchSize,
            blockSize: pingRes.data.blockSize,
        };

        // 2. Fetch student list from GFG (directly from this machine).
        this.log(`Fetching student list from GFG...`);
        this.students = await GFGAPI.getStudentList(instituteId);
        this.log(`Loaded ${this.students.length} students. Block: pages ${config.startingPage}–${config.endingPage}`);

        // 3. Scraping loop.
        this.running = true;
        while (this.running) {
            const { batch, seconds } = await this.scrapeBatch(config);

            if (batch.length === 0) {
                this.log('Empty batch — no students scraped. Stopping.');
                break;
            }

            // 4. Submit batch to backend.
            const res = await this.api.submitBatch(instituteId, batch, seconds);
            if (!res.success) {
                throw new Error('Batch submission rejected by server.');
            }

            this.totalStudents += batch.length;
            this.totalSeconds += seconds;

            this.log(
                `Batch submitted: ${batch.length} students | ` +
                `Total: ${this.totalStudents} | ${this.totalSeconds}s elapsed`
            );

            // 5. Handle block completion → get new block or continue.
            if (res.data.isBlockComplete) {
                this.log('Block complete. Requesting new block...');
                const next = await this.api.ping(instituteId);
                if (!next.success) {
                    this.log('No more blocks available.');
                    break;
                }
                config = {
                    assignedBlockId: next.data.assignedBlockId,
                    startingPage: next.data.startingPage,
                    endingPage: next.data.endingPage,
                    batchSize: next.data.batchSize,
                    blockSize: next.data.blockSize,
                };
                this.log(`New block assigned: pages ${config.startingPage}–${config.endingPage}`);
            } else {
                config.startingPage = res.data.startingPage;
            }

            await sleep(BATCH_DELAY + Math.ceil(Math.random() * 1.5));
        }

        this.log(`Session complete. Scraped ${this.totalStudents} students in ${this.totalSeconds}s.`);
    }

    /** Stop the loop gracefully. */
    async stop(instituteId: string): Promise<void> {
        this.running = false;
        const res = await this.api.stop(instituteId);
        this.log(res.message || 'Contribution stopped.');
    }

    /** Signal the loop to halt (for Ctrl+C). */
    halt(): void {
        this.running = false;
    }

    // --- Internal ---

    private async scrapeBatch(config: BlockConfig): Promise<{ batch: StudentData[]; seconds: number }> {
        const batch: StudentData[] = [];
        let seconds = 0;

        for (let i = config.startingPage - 1; i < config.endingPage && this.running; i++) {
            if (i >= this.students.length) break;

            const student = this.students[i];
            try {
                const html = await GFGAPI.getProfileHTML(student.handle);
                const studentId = student.user_id.toString();
                const data = parseProfile(html, student.handle, studentId);

                if (!data) {
                    this.log(`  ⚠ Could not parse profile: ${student.handle}`);
                    continue;
                } else if (data.id.trim() === '') {
                    const errorStr = `Invalid ID for ${student.handle} having ID: ${student.user_id}`;
                    throw new Error(errorStr);
                }

                batch.push(data);
                process.stdout.write('\r\x1b[K');
                process.stdout.write(`✓ ${student.handle} (${batch.length}/${config.batchSize})`);
            } catch (err: any) {
                this.log(`  ✗ Failed: ${student.handle} — ${err.message}`);
                throw err;
            }

            await sleep(PROFILE_DELAY + Math.ceil(Math.random() * 1.5));
            seconds += PROFILE_DELAY;

            if (batch.length >= config.batchSize) break;
        }

        process.stdout.write('\n');
        return { batch, seconds };
    }

    private log(msg: string): void {
        console.log(`[contributor] ${msg}`);
    }
}
