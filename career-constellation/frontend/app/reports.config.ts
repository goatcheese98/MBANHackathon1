/**
 * Configuration for Research Reports
 * 
 * These are the 6 Gemini Deep Research reports generated for Methanex career intelligence.
 * Each report is stored as a local markdown file in the /reports folder.
 */

export interface ReportConfig {
  id: string;
  title: string;
  type: 'local' | 'gemini_link';
  /** Filename without .md extension */
  source: string;
  icon?: string;
}

export const RESEARCH_REPORTS: ReportConfig[] = [
  {
    id: 'methanol-industry',
    title: 'Global Methanol Industry Intelligence',
    type: 'local',
    source: 'Global Methanol Industry Intelligence Report',
    icon: 'TrendingUp',
  },
  {
    id: 'career-architecture',
    title: 'Chemical Industry Career Architecture',
    type: 'local',
    source: 'Chemical Industry Career Architecture Report',
    icon: 'Network',
  },
  {
    id: 'skills-matrix',
    title: 'Methanol Operations Skills Matrix',
    type: 'local',
    source: 'Methanol Operations Skills Matrix',
    icon: 'Target',
  },
  {
    id: 'compensation',
    title: 'Chemicals & Energy Compensation',
    type: 'local',
    source: 'Chemicals & Energy Compensation Report',
    icon: 'DollarSign',
  },
  {
    id: 'energy-transition',
    title: 'Energy Transition Impact on Careers',
    type: 'local',
    source: 'Methanol Careers_ Energy Transition Impact',
    icon: 'Zap',
  },
  {
    id: 'competitive-intel',
    title: 'Methanol Industry Competitive Intelligence',
    type: 'local',
    source: 'Methanol Industry Competitive Intelligence',
    icon: 'Globe',
  },
];

export const DEFAULT_REPORT_ID = 'methanol-industry';
