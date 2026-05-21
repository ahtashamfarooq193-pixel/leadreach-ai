import nodemailer from 'nodemailer';
import { Settings, OutreachLog, Job } from '../models/index.js';

// Helper to create Nodemailer transporter
async function getTransporter(userId) {
  const settings = await Settings.findOne({ userId });
  if (!settings) {
    throw new Error('Settings not found in database.');
  }

  const { smtp_host, smtp_port, smtp_user, smtp_pass } = settings;

  if (!smtp_host || !smtp_user || !smtp_pass) {
    throw new Error('SMTP credentials are not fully configured in settings.');
  }

  return nodemailer.createTransport({
    host: smtp_host,
    port: parseInt(smtp_port) || 465,
    secure: parseInt(smtp_port) === 465, // Port 465 is secure SSL, 587 or 25 is TLS (secure: false)
    auth: {
      user: smtp_user,
      pass: smtp_pass,
    },
  });
}

// Check if daily sending limit has been reached
export async function getDailyOutreachStats(userId) {
  try {
    const settings = await Settings.findOne({ userId });
    const limit = settings ? settings.daily_limit : 30;
    
    // Count successful emails sent today by this specific user
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const sentTodayCount = await OutreachLog.countDocuments({
      userId,
      status: 'success',
      sent_at: { $gte: startOfToday, $lte: endOfToday }
    });

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

// Send cold email outreach
export async function sendOutreachEmail({ jobId, recipientEmail, subject, body, userId }) {
  const stats = await getDailyOutreachStats(userId);
  if (stats.remaining <= 0) {
    throw new Error(`Daily outreach limit of ${stats.limit} has been reached.`);
  }

  const settings = await Settings.findOne({ userId });
  const senderName = settings ? settings.sender_name : 'Developer';
  const senderEmail = settings ? settings.smtp_user : '';

  let transporter;
  try {
    transporter = await getTransporter(userId);
  } catch (err) {
    // Save failed log in MongoDB
    await OutreachLog.create({
      userId,
      job_id: jobId || null,
      recipient_email: recipientEmail,
      subject,
      body,
      status: 'failed',
      error_message: err.message
    });
    throw err;
  }

  const mailOptions = {
    from: `"${senderName}" <${senderEmail}>`,
    to: recipientEmail,
    subject: subject,
    text: body,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email successfully sent to ${recipientEmail}. MessageId: ${info.messageId}`);

    // Update job status in MongoDB only if jobId is provided
    if (jobId) {
      await Job.findOneAndUpdate(
        { id: jobId, userId },
        { status: 'applied', customized_pitch: body }
      );
    }

    // Save success log in MongoDB
    await OutreachLog.create({
      userId,
      job_id: jobId || null,
      recipient_email: recipientEmail,
      subject,
      body,
      status: 'success'
    });

    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`Failed to send email to ${recipientEmail}:`, err.message);

    // Save failed log in MongoDB
    await OutreachLog.create({
      userId,
      job_id: jobId || null,
      recipient_email: recipientEmail,
      subject,
      body,
      status: 'failed',
      error_message: err.message
    });

    throw new Error(`SMTP Send Failed: ${err.message}`);
  }
}
