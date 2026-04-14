import { PROFESSIONS, PROBLEM_MATRIX } from '../../constants/problemMatrix';
import type { DomainCategory, Problem } from '../../constants/problemMatrix';

const DISAMBIGUATION_RULES = [
  'Clothing/fabric \u2192 seamstress (NOT handyman)',
  'Solar water heater (\u05D3\u05D5\u05D3 \u05E9\u05DE\u05E9) \u2192 solar_water_heater_tech (NOT plumber)',
  'Metal fences/gates \u2192 metalworker (NOT handyman)',
  'Gas smell \u2192 gas_technician (NOT home_appliance_repair)',
  'Shutters \u2192 shutter_technician (NOT handyman, NOT electrician)',
  'Broken glass \u2192 glazier (NOT handyman)',
  'Phones/tablets \u2192 mobile_repair (NOT computer_repair)',
  'TVs \u2192 tv_repair (NOT home_appliance_repair)',
  'Tiles/flooring \u2192 tiler (NOT handyman)',
  'Drywall/plaster \u2192 plasterer (NOT painter)',
  'Cockroaches/ants/mice \u2192 exterminator (NOT cleaning_service)',
  'Door installation \u2192 door_installer (NOT carpenter, NOT locksmith)',
  'Waterproofing \u2192 waterproofing_specialist',
  'Security cameras \u2192 security_camera_installer (NOT electrician)',
  'General renovation \u2192 renovator (if spans multiple trades)',
];

function buildProfessionList(): string {
  return PROFESSIONS
    .map((p) => `- ${p.key} (${p.labelHe})`)
    .join('\n');
}

function formatProblemLine(problem: Problem): string {
  const profs = `[${problem.professions.join(', ')}]`;
  const urgencyTag = problem.urgency === 'urgent' ? ' \u26A0\uFE0F URGENT' : '';
  return `- ${problem.id}: ${problem.descriptionHe} \u2192 ${profs}${urgencyTag}`;
}

function buildDomainSection(domain: DomainCategory): string {
  const header = `## ${domain.labelHe} (${domain.labelEn})`;
  const lines = domain.problems.map(formatProblemLine);
  return `${header}\n${lines.join('\n')}`;
}

function buildProblemReference(): string {
  return PROBLEM_MATRIX.map(buildDomainSection).join('\n\n');
}

function buildDisambiguationSection(): string {
  return DISAMBIGUATION_RULES.map((r) => `- ${r}`).join('\n');
}

export function generateAnalysisPrompt(): string {
  return `You are a profession-identifier AI for a home-services marketplace in Israel.

Your ONLY job is to look at the image(s) and description and identify which PROFESSIONS should be contacted. Do NOT explain the problem, do NOT diagnose it, do NOT give advice.

Return a JSON object with exactly these fields:
{
  "professions": ["array of 1-3 profession keys from the list below, most relevant first"],
  "professionLabelsHe": ["Hebrew labels for the professions, same order"],
  "problemId": "the closest matching problem ID from the reference below, or null if none match",
  "urgency": "urgent | normal | flexible",
  "shortSummary": "A short (1 sentence, max 15 words) neutral description in Hebrew"
}

PROFESSIONS (use these EXACT keys):
${buildProfessionList()}

PROBLEM REFERENCE:

${buildProblemReference()}

DISAMBIGUATION RULES:
${buildDisambiguationSection()}

General rules:
- Return 1-3 professions, most relevant first
- Pick the MOST SPECIFIC profession
- Only use "handyman" if truly generic
- shortSummary: neutral, factual, 1 sentence, Hebrew
- Always respond with valid JSON only, no markdown`;
}
