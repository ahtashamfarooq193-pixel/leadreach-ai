import cron from 'node-cron';
import { fetchJobs } from './jobs/fetcher.js';
import { User, Settings, Job } from './models/index.js';
import { generatePitch } from './services/ai.js';
import { sendOutreachEmail, getDailyOutreachStats } from './mailer/outreach.js';

let cronTask = null;

// Helper to scan a description and extract emails
function extractEmails(text) {
  if (!text) return [];
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
  return text.match(emailRegex) || [];
}

// Core automation runner for a single user
export async function runUserAutomation(user) {
  console.log(`--- Starting Scheduled Outreach Routine for User: ${user.email} ---`);
  try {
    // 1. Fetch fresh screened jobs for this user
    const fetchResult = await fetchJobs(user);
    console.log(`Fetched and filtered jobs for ${user.email}:`, fetchResult.stats || fetchResult.error);

    // 2. Check settings for Auto-Apply
    const settings = await Settings.findOne({ userId: user._id });
    if (!settings) {
      console.log(`No settings configured for ${user.email}. Auto-apply aborted.`);
      return;
    }

    if (settings.auto_apply !== 1) {
      console.log(`Auto-apply is disabled in settings for ${user.email}. Skipping automatic email sends.`);
      return;
    }

    if (!settings.smtp_user || !settings.smtp_pass) {
      console.log(`SMTP credentials not configured for ${user.email}. Cannot auto-apply.`);
      return;
    }

    // 3. Find pending jobs for this user
    const pendingJobs = await Job.find({
      userId: user._id,
      status: 'pending'
    }).sort({ posted_at: -1 });

    if (pendingJobs.length === 0) {
      console.log(`No pending jobs to auto-apply for ${user.email} today.`);
      return;
    }

    console.log(`Found ${pendingJobs.length} pending jobs for ${user.email}. Processing auto-outreach...`);

    // 4. Try applying to them up to the daily limit
    let sentCount = 0;
    for (const job of pendingJobs) {
      const stats = await getDailyOutreachStats(user._id);
      if (stats.remaining <= 0) {
        console.log(`Daily outreach limit reached for ${user.email}! Stopping auto-apply.`);
        break;
      }

      // Check if description contains an email
      const emails = extractEmails(job.description);
      if (emails.length === 0) {
        // No email in description, skip auto-apply
        console.log(`Job "${job.title}" has no email in listing. Skipping auto-apply.`);
        continue;
      }

      const recipientEmail = emails[0];

      // Introduce a randomized human-like delay (45 to 90 seconds) between successive sends
      if (sentCount > 0) {
        const delaySeconds = Math.floor(Math.random() * (90 - 45 + 1)) + 45;
        console.log(`[Anti-Spam Throttling] User: ${user.email}. Waiting for ${delaySeconds} seconds before sending email to ${recipientEmail} for "${job.title}"...`);
        await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
      }

      console.log(`Found target email ${recipientEmail} for job "${job.title}" (User: ${user.email}). Drafting pitch...`);

      try {
        // Generate AI or Template Pitch
        const body = await generatePitch(job, settings);
        const subject = `Developer Outreach: Application for ${job.title} at ${job.company}`;

        // Send Email
        console.log(`Auto-sending email pitch to ${recipientEmail}...`);
        await sendOutreachEmail({
          jobId: job.id,
          recipientEmail,
          subject,
          body,
          userId: user._id
        });
        sentCount++;
      } catch (err) {
        console.error(`Auto-apply failed for job "${job.title}" (User: ${user.email}):`, err.message);
      }
    }
  } catch (err) {
    console.error(`Error during user ${user.email} automation:`, err.message);
  }
  console.log(`--- Scheduled Outreach Routine Completed for User: ${user.email} ---`);
}

// Master automation runner that loops through all onboarded users
export async function runDailyAutomation() {
  console.log('=== STARTING MASTER DAILY AUTOMATION ROUTINE ===');
  try {
    const activeUsers = await User.find({ isOnboarded: true });
    console.log(`Found ${activeUsers.length} onboarded users to process.`);
    
    for (const user of activeUsers) {
      await runUserAutomation(user);
    }
  } catch (err) {
    console.error('Error during master daily automation:', err.message);
  }
  console.log('=== MASTER DAILY AUTOMATION ROUTINE COMPLETED ===');
}

// Setup and start Scheduler (Runs at 9:00 AM daily by default)
export function startScheduler() {
  if (cronTask) {
    cronTask.stop();
  }

  // "0 9 * * *" means every day at 9:00 AM
  cronTask = cron.schedule('0 9 * * *', () => {
    console.log('Cron triggered: Running daily automation at 9:00 AM.');
    runDailyAutomation();
  });

  console.log('Automation Scheduler initialized: Set to run daily at 9:00 AM.');
}
