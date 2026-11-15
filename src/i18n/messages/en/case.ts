import type { caseStudy as reference } from '../es/case';

export const caseStudy = {
  documentTitle: '{title} | {site}',
  back: 'Back',
  backLabel: 'Back to works',
  backNavLabel: 'Return to the list',
  meta: {
    label: 'Project details',
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
  figure: {
    placeholder: 'Image in progress',
  },
  chat: {
    label: 'Conversation about the project',
    visitor: 'Visitor',
    visitorInitial: 'V',
    sebastian: 'Sebastian',
    delivered: 'Delivered',
    reaction: 'Reaction: {emoji}',
  },
} satisfies typeof reference;
