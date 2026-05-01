export interface ExportLookup {
  kind: 'collection' | 'company';
  name: string;
}

export interface CategoryDef {
  id: string;
  name: string;
  isNew?: boolean;
  extraParams?: Record<string, string | number>;
  exportLookup?: ExportLookup;
}

export interface ServiceDef {
  id: string;
  name: string;
  providerId: number;
  categories: CategoryDef[];
}

export const SERVICES: ServiceDef[] = [
  {
    id: 'disney_plus',
    name: 'Disney+',
    providerId: 337,
    categories: [
      { id: 'popular',   name: 'Popular on Disney+' },
      { id: 'new',       name: 'New on Disney+',       isNew: true },
      { id: 'marvel',    name: 'Marvel',                exportLookup: { kind: 'collection', name: 'Marvel Cinematic Universe' } },
      { id: 'star_wars', name: 'Star Wars',             exportLookup: { kind: 'collection', name: 'Star Wars Collection' } },
      { id: 'pixar',     name: 'Pixar',                 exportLookup: { kind: 'collection', name: 'Pixar Collection' } },
      { id: 'classics',  name: 'Disney Classics',       exportLookup: { kind: 'company',    name: 'Walt Disney Pictures' } },
    ],
  },
  {
    id: 'netflix',
    name: 'Netflix',
    providerId: 8,
    categories: [
      { id: 'popular',   name: 'Popular on Netflix' },
      { id: 'new',       name: 'New on Netflix',        isNew: true },
      { id: 'originals', name: 'Netflix Originals',     exportLookup: { kind: 'company', name: 'Netflix Productions' } },
      { id: 'action',    name: 'Action',                 extraParams: { with_genres: '28' } },
      { id: 'comedy',    name: 'Comedy',                 extraParams: { with_genres: '35' } },
      { id: 'thriller',  name: 'Thriller',               extraParams: { with_genres: '53' } },
    ],
  },
  {
    id: 'max',
    name: 'Max',
    providerId: 384,
    categories: [
      { id: 'popular',   name: 'Popular on Max' },
      { id: 'new',       name: 'New on Max',             isNew: true },
      { id: 'dc',        name: 'DC Universe',            exportLookup: { kind: 'collection', name: 'DC Extended Universe' } },
      { id: 'drama',     name: 'Drama',                  extraParams: { with_genres: '18' } },
      { id: 'action',    name: 'Action',                  extraParams: { with_genres: '28' } },
      { id: 'top_rated', name: 'Top Rated',              extraParams: { sort_by: 'vote_average.desc', 'vote_count.gte': 1000 } },
    ],
  },
  {
    id: 'hulu',
    name: 'Hulu',
    providerId: 15,
    categories: [
      { id: 'popular',   name: 'Popular on Hulu' },
      { id: 'new',       name: 'New on Hulu',            isNew: true },
      { id: 'horror',    name: 'Horror',                 extraParams: { with_genres: '27' } },
      { id: 'comedy',    name: 'Comedy',                  extraParams: { with_genres: '35' } },
      { id: 'scifi',     name: 'Sci-Fi',                 extraParams: { with_genres: '878' } },
      { id: 'thriller',  name: 'Thriller',               extraParams: { with_genres: '53' } },
    ],
  },
  {
    id: 'amazon_prime',
    name: 'Amazon Prime',
    providerId: 9,
    categories: [
      { id: 'popular',       name: 'Popular on Prime' },
      { id: 'new',           name: 'New on Prime',       isNew: true },
      { id: 'action',        name: 'Action',              extraParams: { with_genres: '28' } },
      { id: 'comedy',        name: 'Comedy',              extraParams: { with_genres: '35' } },
      { id: 'drama',         name: 'Drama',               extraParams: { with_genres: '18' } },
      { id: 'international', name: 'International',       extraParams: { with_original_language: 'ko|ja|fr|es' } },
    ],
  },
  {
    id: 'paramount_plus',
    name: 'Paramount+',
    providerId: 531,
    categories: [
      { id: 'popular',            name: 'Popular on Paramount+' },
      { id: 'new',                name: 'New on Paramount+',    isNew: true },
      { id: 'mission_impossible', name: 'Mission: Impossible',  exportLookup: { kind: 'collection', name: 'Mission: Impossible Collection' } },
      { id: 'action',             name: 'Action',               extraParams: { with_genres: '28' } },
      { id: 'drama',              name: 'Drama',                extraParams: { with_genres: '18' } },
      { id: 'comedy',             name: 'Comedy',               extraParams: { with_genres: '35' } },
    ],
  },
  {
    id: 'peacock',
    name: 'Peacock',
    providerId: 386,
    categories: [
      { id: 'popular', name: 'Popular on Peacock' },
      { id: 'new',     name: 'New on Peacock',           isNew: true },
      { id: 'comedy',  name: 'Comedy',                   extraParams: { with_genres: '35' } },
      { id: 'horror',  name: 'The Conjuring Universe',   exportLookup: { kind: 'collection', name: 'The Conjuring Collection' } },
      { id: 'action',  name: 'Action',                   extraParams: { with_genres: '28' } },
      { id: 'drama',   name: 'Drama',                    extraParams: { with_genres: '18' } },
    ],
  },
  {
    id: 'apple_tv_plus',
    name: 'Apple TV+',
    providerId: 350,
    categories: [
      { id: 'popular',   name: 'Popular on Apple TV+' },
      { id: 'new',       name: 'New on Apple TV+',       isNew: true },
      { id: 'originals', name: 'Apple TV+ Originals',    exportLookup: { kind: 'company', name: 'Apple Studios' } },
      { id: 'drama',     name: 'Drama',                  extraParams: { with_genres: '18' } },
      { id: 'scifi',     name: 'Sci-Fi',                 extraParams: { with_genres: '878' } },
      { id: 'thriller',  name: 'Thriller',               extraParams: { with_genres: '53' } },
    ],
  },
];

export const TARGET_COLLECTIONS = [
  'Star Wars Collection',
  'Marvel Cinematic Universe',
  'Pixar Collection',
  'DC Extended Universe',
  'James Bond Collection',
  'The Fast and the Furious Collection',
  'Mission: Impossible Collection',
  'The Conjuring Collection',
] as const;

export const TARGET_COMPANIES = [
  'Marvel Studios',
  'Lucasfilm',
  'Pixar',
  'Walt Disney Pictures',
  'DC Studios',
  'Blumhouse Productions',
  'A24',
  'Netflix Productions',
  'Apple Studios',
] as const;
