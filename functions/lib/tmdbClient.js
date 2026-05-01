"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tmdbMovieToDoc = tmdbMovieToDoc;
exports.discoverPage = discoverPage;
exports.fetchCollection = fetchCollection;
const axios_1 = __importDefault(require("axios"));
const TMDB_BASE = 'https://api.themoviedb.org/3';
function tmdbMovieToDoc(m) {
    const year = m.release_date ? parseInt(m.release_date.split('-')[0], 10) : 0;
    return {
        tmdb_id: String(m.id),
        title: m.title ?? '',
        year,
        poster_url: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : '',
        backdrop_url: m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : '',
        rating: m.vote_average,
        vote_count: m.vote_count,
        overview: m.overview ?? '',
        genre_ids: m.genre_ids ?? [],
        popularity: m.popularity,
        collection_id: m.belongs_to_collection?.id ?? null,
    };
}
async function discoverPage(apiKey, params) {
    const res = await axios_1.default.get(`${TMDB_BASE}/discover/movie`, {
        params: { api_key: apiKey, ...params },
        timeout: 15000,
    });
    return res.data.results ?? [];
}
async function fetchCollection(apiKey, collectionId) {
    const res = await axios_1.default.get(`${TMDB_BASE}/collection/${collectionId}`, {
        params: { api_key: apiKey, language: 'en-US' },
        timeout: 15000,
    });
    return (res.data.parts ?? []).filter(m => m.release_date);
}
//# sourceMappingURL=tmdbClient.js.map