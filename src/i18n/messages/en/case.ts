import type { caseStudy as reference } from '../es/case';

export const caseStudy = {
  back: 'Back',
  backLabel: 'Back to works',
  meta: {
    service: 'Service',
    tools: 'Tools',
    year: 'Year',
    visit: 'Visit the site',
  },
  mapLabel: 'Case sections',
  sections: {
    overview: 'Overview',
    challenge: 'Challenge',
    approach: 'Approach',
    research: 'Research',
    design: 'Design solutions',
    outcome: 'Outcome',
  },
  otherCases: 'Other cases',
  previous: 'Previous case',
  next: 'Next case',
  previousLabel: 'Previous case: {name}',
  nextLabel: 'Next case: {name}',
  enlargeImage: 'Enlarge image: {alt}',
  lightbox: 'Enlarged image',
  close: 'Close',
} satisfies typeof reference;
