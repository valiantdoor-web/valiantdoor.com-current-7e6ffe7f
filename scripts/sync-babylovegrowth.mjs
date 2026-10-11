#!/usr/bin/env node
// Server-only/manual sync. Production runs automatically via Vercel Cron.
// Required environment: BABYLOVEGROWTH_API_KEY and BLOB_READ_WRITE_TOKEN.
import publishingSync from '../lib/blog-sync.js';
try {
 let result;
 do {result=await publishingSync.syncArticles();console.log(JSON.stringify(result));} while(!result.complete);
} catch(error) {console.error('[sync]',error.message);process.exitCode=1;}
