import { GoogleGenerativeAI } from '@google/generative-ai';

export async function generatePitch(job, settings) {
  if (!settings) {
    throw new Error('Settings not configured.');
  }

  const {
    sender_name = 'Developer',
    portfolio_url = '',
    github_url = '',
    resume_url = '',
    default_template,
    gemini_api_key,
    groq_api_key,
    target_keywords = 'WordPress, React, HTML, CSS, JavaScript, Node.js, Flutter'
  } = settings;

  const prompt = `
You are ${sender_name}, a high-skilled developer.
Your links:
- Portfolio: ${portfolio_url}
- GitHub: ${github_url}
- Resume: ${resume_url}

Your skills: ${target_keywords}.

Write a highly personalized, professional, and concise cold email pitch applying to the following job post:
Job Title: ${job.title}
Company: ${job.company}
Platform: ${job.platform}

Job Description:
${job.description}

Instructions for the email:
1. Address the client/hiring manager warmly but professionally (use the company name if available).
2. Keep the email direct, short, and persuasive (around 120-180 words maximum).
3. Clearly explain how your skillset (${target_keywords}) directly solves their specific problem in the job description.
4. Seamlessly incorporate your Portfolio, GitHub, and Resume links.
5. End with a strong call-to-action (e.g. inviting them to a brief call or chat).
6. Do NOT include a subject line in your output, ONLY output the email body text.
7. Replace all placeholders; the final output must be ready to send without any [insert here] markers.
8. Output the raw plain text email body only. No markdown formatting like asterisks or hashtags.
`;

  // 1. Try Google Gemini AI
  if (gemini_api_key && gemini_api_key.trim() !== '' && gemini_api_key !== '••••••••') {
    try {
      console.log(`Generating AI pitch with Gemini for job: "${job.title}" at "${job.company}"`);
      const genAI = new GoogleGenerativeAI(gemini_api_key);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let pitchText = response.text();

      // Clean up markdown formatting if Gemini included any
      pitchText = pitchText.replace(/\*\*/g, '').replace(/###/g, '').trim();

      return pitchText;
    } catch (err) {
      console.error('Gemini Pitch Generation failed. Trying Groq fallback:', err.message);
    }
  }

  // 2. Try Groq Llama-3 AI Fallback
  if (groq_api_key && groq_api_key.trim() !== '' && groq_api_key !== '••••••••') {
    try {
      console.log(`Generating AI pitch with Groq (Llama-3) for job: "${job.title}" at "${job.company}"`);
      const pitchText = await callGroqAPI(prompt, groq_api_key);
      let cleanedPitch = pitchText.replace(/\*\*/g, '').replace(/###/g, '').trim();
      return cleanedPitch;
    } catch (err) {
      console.error('Groq Pitch Generation failed. Falling back to template:', err.message);
    }
  }

  // Fallback: Template replacement
  console.log(`Using default template fallback for job: "${job.title}"`);
  let template = default_template || '';

  // Replace standard placeholders
  template = template
    .replace(/{job_title}/gi, job.title)
    .replace(/{company}/gi, job.company)
    .replace(/{platform}/gi, job.platform)
    .replace(/{sender_name}/gi, sender_name)
    .replace(/{portfolio_url}/gi, portfolio_url)
    .replace(/{github_url}/gi, github_url)
    .replace(/{resume_url}/gi, resume_url);

  return template;
}

export async function generateB2BPitch(lead, settings) {
  if (!settings) {
    throw new Error('Settings not configured.');
  }

  const {
    sender_name = 'Developer',
    portfolio_url = '',
    github_url = '',
    resume_url = '',
    gemini_api_key,
    groq_api_key,
    target_keywords = 'WordPress, React, HTML, CSS, JavaScript, Node.js, Flutter'
  } = settings;

  // Prepare specific audit reasons for the AI prompt
  let auditContext = "";
  if (lead.needs_optimization === 1) {
    if (!lead.website || lead.website.trim() === '') {
      auditContext = "- Audit Status: This business DOES NOT have a website configured on Google Maps.\n- Primary Painpoint: Lacks any online presence. Pitch them a brand-new, modern business website built from scratch using WordPress or React.";
    } else {
      const reasonsList = lead.optimization_reasons ? lead.optimization_reasons.split('|').map(r => r.trim()) : [];
      auditContext = `- Audit Status: Outdated/Unoptimized Website detected.\n- Detected Technical Flaws & Opportunities:\n${reasonsList.map(r => `  * ${r}`).join('\n')}\n- Pitch Instructions: Directly, politely, and casually reference these specific flaws (e.g. lack of mobile responsiveness, insecure SSL/HTTP, outdated copyright year) as the exact reason you are reaching out, and explain how fixing them will immediately grow their sales and convert more local visitors.`;
    }
  } else {
    const siteUrl = lead.website || '';
    auditContext = `- Audit Status: Fully optimized modern website (${siteUrl}).\n- Pitch Instructions: Praise their modern website, and pitch them custom mobile application development (using Flutter) or advanced booking systems to help retain existing customers and increase customer lifetime value.`;
  }

  const prompt = `
You are ${sender_name}, a professional developer.
Your links:
- Portfolio: ${portfolio_url}
- GitHub: ${github_url}
- Resume: ${resume_url}

Your skills: ${target_keywords}.

Write a highly personalized, warm, professional, and very concise B2B cold email proposal to a local business owner offering your development services.
Business Details:
- Business Name: ${lead.name}
- Niche/Industry: ${lead.niche}
- Location: ${lead.location}
- Website: ${lead.website || 'None'}
${auditContext}

Instructions for the email:
1. Address the business owner warmly but professionally.
2. Keep the email direct, short, and highly persuasive (around 100-150 words maximum).
3. Connect your pitch directly to the business's specific audit status and painpoints above.
4. Seamlessly incorporate your Portfolio, GitHub, and Resume links naturally as proof of your technical expertise.
5. Do NOT include a subject line in your output, ONLY output the email body text.
6. Replace all placeholders; the final output must be ready to send without any [insert here] markers.
7. Output the raw plain text email body only. No markdown formatting like asterisks or hashtags.
`;

  // 1. Try Google Gemini AI
  if (genAIKeyValid(gemini_api_key)) {
    try {
      console.log(`Generating AI B2B pitch with Gemini for local business: "${lead.name}" (${lead.niche})`);
      const genAI = new GoogleGenerativeAI(gemini_api_key.trim());
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let pitchText = response.text();

      pitchText = pitchText.replace(/\*\*/g, '').replace(/###/g, '').trim();
      return pitchText;
    } catch (err) {
      console.error('Gemini B2B Pitch Generation failed. Trying Groq fallback:', err.message);
    }
  }

  // 2. Try Groq Llama-3 AI Fallback
  if (groq_api_key && groq_api_key.trim() !== '' && groq_api_key !== '••••••••') {
    try {
      console.log(`Generating AI B2B pitch with Groq (Llama-3) for local business: "${lead.name}" (${lead.niche})`);
      const pitchText = await callGroqAPI(prompt, groq_api_key);
      let cleanedPitch = pitchText.replace(/\*\*/g, '').replace(/###/g, '').trim();
      return cleanedPitch;
    } catch (err) {
      console.error('Groq B2B Pitch Generation failed. Falling back to template:', err.message);
    }
  }

  // Fallback Template
  console.log(`Using default fallback template for B2B lead: "${lead.name}"`);
  let issueText = "";
  if (lead.needs_optimization === 1) {
    if (!lead.website) {
      issueText = "I noticed that you don't currently have a business website configured on Google Maps. In today's digital era, having a modern, fast, and mobile-friendly online presence is absolutely critical for local clients to find and book your services.";
    } else {
      const flaws = lead.optimization_reasons ? lead.optimization_reasons.split('|').map(r => r.trim().toLowerCase()) : [];
      const hasMobileFlaw = flaws.some(f => f.includes('mobile') || f.includes('viewport'));
      const hasSslFlaw = flaws.some(f => f.includes('ssl') || f.includes('secure') || f.includes('insecure'));
      
      let specificFixes = [];
      if (hasMobileFlaw) specificFixes.push("making it fully mobile-responsive");
      if (hasSslFlaw) specificFixes.push("securing your connection with modern SSL encryption (HTTPS)");
      
      const fixesStr = specificFixes.length > 0 ? ` specifically by ${specificFixes.join(' and ')}` : "";
      
      issueText = `I visited your website (${lead.website}) and noticed a few critical areas that could be optimized to boost your local conversions${fixesStr}. Having an optimized, secure, and mobile-responsive website is crucial for converting local searchers into high-paying clients.`;
    }
  } else {
    issueText = `I visited your website (${lead.website}) and loved the design! To complement your excellent web presence, I would love to help you build a custom mobile application or integrate advanced booking systems to further increase customer retention.`;
  }

  return `Hi,
 
I hope you are doing well.
 
I came across your business, ${lead.name}, in ${lead.location}. ${issueText}
 
I am a Full Stack & Mobile App Developer specializing in building high-performance WordPress/React websites and custom Flutter mobile applications. You can review my work at:
- Portfolio: ${portfolio_url}
- GitHub: ${github_url}
- Resume: ${resume_url}
 
Are you available for a brief call this week to discuss how we can work together to grow your business?
 
Best regards,
${sender_name}`;
}

// Quick helper to check if genAI key is configured
function genAIKeyValid(key) {
  return key && key.trim() !== '' && key !== '••••••••';
}

async function callGroqAPI(prompt, apiKey) {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Groq API returned HTTP ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    }
    throw new Error('No completion choices returned by Groq.');
  } catch (err) {
    console.error('Error calling Groq API directly:', err.message);
    throw err;
  }
}
