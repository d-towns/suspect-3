import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function cancelRun() {
    try {
        // Get the run ID from command line arguments
        const runId = process.argv[2];
        const threadId = process.argv[3];

        if (!runId || !threadId) {
            console.error('Please provide both a run ID and thread ID as arguments');
            console.error('Usage: node cancel-run.js <run_id> <thread_id>');
            process.exit(1);
        }

        // Cancel the run
        const canceledRun = await openai.beta.threads.runs.cancel(
            threadId,
            runId
        );

        console.log('Run cancelled successfully:', canceledRun);
    } catch (error) {
        console.error('Error cancelling run:', error);
        process.exit(1);
    }
}

await cancelRun();