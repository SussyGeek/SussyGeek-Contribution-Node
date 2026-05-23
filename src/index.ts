import * as readline from 'readline';
import * as dotenv from 'dotenv';
import { BackendAPI } from './api';
import { Contributor } from './contributor';
import { invokeArgs } from './args/invokeArgs';
import { MODE_MAP } from './config';

dotenv.config();

const BACKEND_URL = process.env.BACKEND_URL;
if (!BACKEND_URL) {
    console.error('Missing BACKEND_URL in .env');
    process.exit(1);
}

// --- CLI helpers ---

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string): Promise<string> => new Promise(r => rl.question(q, r));

function banner() {
    console.log();
    console.log('  ┌──────────────────────────────────┐');
    console.log('  │    SussyGeek Contributor CLI      │');
    console.log('  │    Distributed Scraping Node      │');
    console.log('  └──────────────────────────────────┘');
    console.log();
}

// --- Main ---

async function main() {
    banner();

    const { args, isAutomated } = await invokeArgs();

    // 1. Authenticate
    const sessionId = isAutomated ?
        args.sessionId :
        await ask('  Session ID: ');

    if (!sessionId!.trim()) {
        console.log('  No session ID provided. Exiting.');
        process.exit(0);
    }

    const api = new BackendAPI(BACKEND_URL!, sessionId!.trim());

    let username: string;
    try {
        const user = await api.me();
        username = user.username;
        console.log(`  ✓ Authenticated as: ${username} (${user.isActive ? 'active' : 'idle'})\n`);
    } catch (err: any) {
        console.error(`  ✗ Authentication failed: ${err?.response?.data?.message || err.message}`);
        process.exit(1);
    }

    // 2. Menu loop
    let contributor: Contributor | null = null;

    // Graceful Ctrl+C during scraping
    process.on('SIGINT', () => {
        if (contributor) {
            console.log('\n  Stopping gracefully...');
            contributor.halt();
        } else {
            console.log('\n  Bye.');
            process.exit(0);
        }
    });

    while (true) {

        let choice;
        if (!isAutomated) {
            console.log('  [1] Start Contribution');
            console.log('  [2] Stop Contribution');
            console.log('  [3] Exit');

            choice = (await ask('\n  > ')).trim();
        } else {
            choice = MODE_MAP[args.mode as keyof typeof MODE_MAP];
        }

        if (choice === '1') {
            const instituteId = isAutomated ?
                args.instituteId :
                (await ask('  Institute ID: ')).trim();

            if (!instituteId) {
                console.log('  Invalid ID.\n');
                continue;
            }

            contributor = new Contributor(api);
            try {
                await contributor.start(instituteId);
            } catch (err: any) {
                console.error(`  ✗ Error: ${err?.response?.data?.message || err.message}`);
                if (isAutomated) break;
            }
            contributor = null;
            console.log();

        } else if (choice === '2') {
            const instituteId = isAutomated ?
                args.instituteId :
                (await ask('  Institute ID to stop: ')).trim();
            if (!instituteId) {
                console.log('  Invalid ID.\n');
                continue;
            }
            try {
                await api.stop(instituteId);
                console.log('  ✓ Contribution stopped.\n');
            } catch (err: any) {
                console.error(`  ✗ Stop failed: ${err?.response?.data?.message || err.message}\n`);
            }

        } else if (choice === '3') {
            console.log('  Bye.');
            break;

        } else {
            console.log('  Invalid option.\n');
        }
        if (isAutomated) break;
    }

    rl.close();
    process.exit(0);
}

main();
