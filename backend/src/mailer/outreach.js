import nodemailer from 'nodemailer';
import { Settings, OutreachLog, Job } from '../models/index.js';

// Helper to create Nodemailer transporter
async function getTransporter(userId) {
  let settings = null;
  try {
    settings = await Settings.findOne({ userId });
  } catch (err) {
    console.log('⚠️  MongoDB offline, using demo SMTP credentials');
  }

  let smtp_host, smtp_port, smtp_user, smtp_pass, senderEmail;

  if (settings && settings.smtp_host && settings.smtp_user && settings.smtp_pass) {
    // Use user's configured SMTP settings
    smtp_host = settings.smtp_host;
    smtp_port = settings.smtp_port;
    smtp_user = settings.smtp_user;
    smtp_pass = settings.smtp_pass;
    console.log(`📧 Using user SMTP: ${smtp_user} @ ${smtp_host}`);
  } else {
    // Fallback to Ethereal Email for testing (generates temp test account)
    console.log('📧 Using Ethereal Email test account (free testing service)');
    
    try {
      // Create test account on Ethereal
      let testAccount = await import('nodemailer').then(mod => 
        mod.createTestAccount?.() || Promise.resolve(null)
      ).catch(() => null);
      
      if (testAccount) {
        smtp_host = 'smtp.ethereal.email';
        smtp_port = 587;
        smtp_user = testAccount.user;
        smtp_pass = testAccount.pass;
        senderEmail = testAccount.user;
        console.log(`✅ Ethereal test account created: ${smtp_user}`);
      } else {
        // Fallback to hardcoded Ethereal account (if available)
        smtp_host = 'smtp.ethereal.email';
        smtp_port = 587;
        smtp_user = 'sheryl.orn48@ethereal.email'; // Pre-generated test account
        smtp_pass = 'eZP8NbqDSHnNwVpACP';
        senderEmail = smtp_user;
        console.log('⚠️  Using pre-generated Ethereal test account (may be invalid)');
      }
    } catch (err) {
      // Last resort: use Mailtrap free tier
      console.log('⚠️  Ethereal unavailable, attempting Mailtrap');
      smtp_host = 'live.smtp.mailtrap.io';
      smtp_port = 587;
      smtp_user = process.env.MAILTRAP_USER || 'api';
      smtp_pass = process.env.MAILTRAP_PASS || 'a0c1d73f5f67c3c0cd45e1df4f2e1234'; // Placeholder
      senderEmail = 'outreach@mailtrap.dev';
    }
  }

  return nodemailer.createTransport({
    host: smtp_host,
    port: parseInt(smtp_port) || 587,
    secure: false, // Use TLS for port 587
    auth: {
      user: smtp_user,
      pass: smtp_pass,
    },
  });
}

// Check if daily sending limit has been reached
export async function getDailyOutreachStats(userId) {
  try {
    // Set 3 second timeout for database queries
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database timeout')), 3000)
    );

    const settingsPromise = Settings.findOne({ userId });
    const settings = await Promise.race([settingsPromise, timeoutPromise]).catch(() => null);
    const limit = settings ? settings.daily_limit : 30;
    
    // If database is offline, return safe defaults
    if (!settings) {
      return { sent: 0, limit: 30, remaining: 30 };
    }

    // Count successful emails sent today by this specific user
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const countPromise = OutreachLog.countDocuments({
      userId,
      status: 'success',
      sent_at: { $gte: startOfToday, $lte: endOfToday }
    });

    const sentTodayCount = await Promise.race([countPromise, timeoutPromise]).catch(() => 0);

    return {
      sent: sentTodayCount,
      limit: limit,
      remaining: Math.max(0, limit - sentTodayCount)
    };
  } catch (err) {
    console.error('Error getting daily stats:', err.message);
    return { sent: 0, limit: 30, remaining: 30 };
  }
}

// Test SMTP connection
export async function testSMTPConnection(credentials) {
  try {
    const transporter = nodemailer.createTransport({
      host: credentials.smtp_host,
      port: parseInt(credentials.smtp_port) || 465,
      secure: parseInt(credentials.smtp_port) === 465,
      auth: {
        user: credentials.smtp_user,
        pass: credentials.smtp_pass,
      },
    });

    await transporter.verify();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Helper to query settings with timeout
async function getSettingsWithTimeout(userId) {
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Database timeout')), 3000)
  );
  try {
    return await Promise.race([Settings.findOne({ userId }), timeoutPromise]);
  } catch (err) {
    console.log('⚠️  Settings query timed out, using defaults');
    return null;
  }
}

// Send cold email outreach
export async function sendOutreachEmail({ jobId, recipientEmail, subject, body, userId }) {
  const stats = await getDailyOutreachStats(userId);
  if (stats.remaining <= 0) {
    throw new Error(`Daily outreach limit of ${stats.limit} has been reached.`);
  }

  const settings = await getSettingsWithTimeout(userId);
  const senderName = settings ? settings.sender_name : 'Outreach Specialist';
  const senderEmail = settings ? settings.smtp_user : 'noreply@outreach.local';

  let transporter;
  try {
    transporter = await getTransporter(userId);
  } catch (err) {
    console.error('Transporter creation failed:', err.message);
    throw new Error(`Email configuration error: ${err.message}`);
  }
  
  const mailOptions = {
    from: `"${senderName}" <${senderEmail}>`,
    to: recipientEmail,
    subject: subject,
    text: body,
  };

  try {
    console.log(`📧 Attempting to send email to ${recipientEmail}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email successfully sent to ${recipientEmail}. MessageId: ${info.messageId}`);

    // Try to update job status if database is available
    if (jobId) {
      try {
        await Promise.race([
          Job.findOneAndUpdate(
            { id: jobId, userId },
            { status: 'applied', customized_pitch: body }
          ),
          new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), 2000))
        ]).catch(() => null);
      } catch (err) {
        console.log('⚠️  Could not update job status (DB offline)');
      }
    }

    // Try to save success log
    try {
      await Promise.race([
        OutreachLog.create({
          userId,
          job_id: jobId || null,
          recipient_email: recipientEmail,
          subject,
          body,
          status: 'success'
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), 2000))
      ]).catch(() => null);
    } catch (err) {
      console.log('⚠️  Could not save outreach log (DB offline)');
    }

    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ Failed to send email to ${recipientEmail}:`, err.message);

    // Try to save failed log
    try {
      await Promise.race([
        OutreachLog.create({
          userId,
          job_id: jobId || null,
          recipient_email: recipientEmail,
          subject,
          body,
          status: 'failed',
          error_message: err.message
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), 2000))
      ]).catch(() => null);
    } catch (logErr) {
      console.log('⚠️  Could not save failure log (DB offline)');
    }

    throw err;
  }
}
