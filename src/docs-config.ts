import introduction from './docs/introduction.md?raw';
import installation from './docs/installation.md?raw';
import configuration from './docs/configuration.md?raw';
import architecture from './docs/architecture.md?raw';
import razorpayTesting from './docs/razorpay-testing.md?raw';
import techDebt from './docs/tech-debt.md?raw';

export interface DocPage {
  id: string;
  title: string;
  content: string;
}

export interface DocCategory {
  title: string;
  pages: DocPage[];
}

export interface DocsConfig {
  [categoryKey: string]: DocCategory;
}

export const docsConfig: DocsConfig = {
  'overview': {
    title: 'Overview & Getting Started',
    pages: [
      { id: 'introduction', title: 'Introduction', content: introduction },
      { id: 'installation', title: 'Installation Guide', content: installation },
    ],
  },
  'architecture': {
    title: 'Architecture & Tech Stack',
    pages: [
      { id: 'architecture', title: 'System Architecture', content: architecture },
      { id: 'configuration', title: 'Database & Env Settings', content: configuration },
    ],
  },
  'guides': {
    title: 'Guides & Workflows',
    pages: [
      { id: 'razorpay-testing', title: 'Razorpay Sandbox', content: razorpayTesting },
    ],
  },
  'backlog': {
    title: 'Development Backlog',
    pages: [
      { id: 'tech-debt', title: 'Backlog & Tech Debt', content: techDebt },
    ],
  },
};

// Flattened pages helper for easy routing & search
export const allPages: DocPage[] = Object.values(docsConfig).reduce<DocPage[]>(
  (acc, category) => [...acc, ...category.pages],
  []
);
