import { getSubscriptionDetails } from './lib/iyzico';

async function main() {
    console.log("Fetching details...");
    // Let's get the latest subscription ref code from db or use a fixed one if we knew. 
    // We'll write this script to connect to supabase to get the ref codes and print them.
}

main().catch(console.error);
