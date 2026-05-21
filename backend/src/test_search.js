import { searchLocalLeads } from './services/localScraper.js';

async function run() {
  try {
    console.log("Running searchLocalLeads with Dentist and Los Angeles County, CA...");
    const leads = await searchLocalLeads('Dentist', 'Los Angeles County, CA', null, 'google');
    console.log(`Found ${leads.length} leads:`);
    console.log(leads.map(l => ({ name: l.name, website: l.website })));
  } catch (err) {
    console.error("Error during searchLocalLeads:", err);
  }
}

run();
