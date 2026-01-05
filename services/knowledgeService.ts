
export interface KnowledgeSource {
  id: string;
  name: string;
  type: 'PDF' | 'E-BOOK' | 'WEBSITE' | 'GOOGLE DRIVE' | 'GOOGLE SHEETS';
  link: string;
  status: 'INDEXED' | 'SYNCED' | 'INDEXING' | 'FAILED';
  lastUpdated: string;
  size?: string;
}

const STORAGE_KEY = 'zerin_knowledge_base';

export const knowledgeService = {
  getSources: (): KnowledgeSource[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [
      { id: '1', name: 'Zerin Protocol Alpha', type: 'PDF', status: 'INDEXED', link: 'https://cdn.zerin.ai/docs/alpha.pdf', lastUpdated: '2023-10-27' },
      { id: '2', name: 'Global Population Metrics', type: 'GOOGLE SHEETS', status: 'SYNCED', link: 'https://docs.google.com/spreadsheets/d/1...', lastUpdated: '2023-10-28' }
    ];
  },

  addSource: (source: Omit<KnowledgeSource, 'id' | 'status' | 'lastUpdated'>): KnowledgeSource => {
    const sources = knowledgeService.getSources();
    const newSource: KnowledgeSource = {
      ...source,
      id: Math.random().toString(36).substr(2, 9),
      status: 'INDEXING',
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    sources.push(newSource);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
    return newSource;
  },

  updateSource: (id: string, updates: Partial<KnowledgeSource>) => {
    const sources = knowledgeService.getSources();
    const index = sources.findIndex(s => s.id === id);
    if (index !== -1) {
      sources[index] = { ...sources[index], ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
    }
  },

  deleteSource: (id: string) => {
    const sources = knowledgeService.getSources().filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
  },

  syncAll: async () => {
    // Simulated sync process
    const sources = knowledgeService.getSources();
    const updated = sources.map(s => ({ ...s, status: 'INDEXING' as const }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    
    return new Promise((resolve) => {
      setTimeout(() => {
        const final = updated.map(s => ({ ...s, status: 'INDEXED' as const, lastUpdated: new Date().toISOString().split('T')[0] }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(final));
        resolve(final);
      }, 2000);
    });
  }
};
