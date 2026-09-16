import { useMemo, useState } from 'react';
import { BookOpen, ExternalLink, Search, ShieldCheck } from 'lucide-react';

type JournalResult = { id: string; name: string; publisher?: string; issn?: string; url?: string; oa?: boolean; score?: number; source: 'OpenAlex' | 'Crossref' };

export default function JournalFinder() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<JournalResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim(); if (!q) return;
    setLoading(true); setError(null); setSearched(true);
    try {
      const [oaRes, crRes] = await Promise.all([
        fetch(`https://api.openalex.org/sources?search=${encodeURIComponent(q)}&per-page=12`),
        fetch(`https://api.crossref.org/journals?query=${encodeURIComponent(q)}&rows=12`),
      ]);
      if (!oaRes.ok || !crRes.ok) throw new Error('One or more scholarly metadata services could not be reached.');
      const oa = await oaRes.json(); const cr = await crRes.json();
      const a: JournalResult[] = (oa.results ?? []).map((x: any) => ({ id:`oa-${x.id}`, name:x.display_name, publisher:x.host_organization_name, issn:x.issn_l, url:x.homepage_url, oa:x.is_oa, score:Math.round((x.relevance_score ?? 0)*100), source:'OpenAlex' }));
      const b: JournalResult[] = (cr.message?.items ?? []).map((x: any) => ({ id:`cr-${x.ISSN?.[0] ?? x.title?.[0]}`, name:x.title?.[0] ?? 'Untitled journal', publisher:x.publisher, issn:x.ISSN?.[0], url:x.URL, source:'Crossref' }));
      const merged = [...a, ...b].filter((x,i,arr)=>i===arr.findIndex(y=>(x.issn && y.issn===x.issn)||y.name.toLowerCase()===x.name.toLowerCase()));
      setResults(merged);
    } catch (err) { setError(err instanceof Error ? err.message : 'Journal search failed.'); }
    finally { setLoading(false); }
  };

  const sourceNote = useMemo(() => searched ? 'Results come from OpenAlex and Crossref. Verify scope, indexing, APCs, and author guidelines before selection.' : '', [searched]);

  return <div className="journal-finder-page">
    <div className="page-header"><div><p className="eyebrow">Publication infrastructure</p><h1>Journal Finder</h1><p className="page-subtitle">Discover journal metadata without treating a match score as an academic verdict.</p></div></div>
    <form className="journal-search" onSubmit={search}><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by topic, journal, ISSN, or discipline" aria-label="Journal search"/><button className="button button-solid" disabled={loading}>{loading?'Searching…':'Search'}</button></form>
    {sourceNote && <div className="scholarly-note"><ShieldCheck size={16}/><span>{sourceNote}</span></div>}
    {error && <div className="error-banner">{error}</div>}
    {searched && !loading && results.length===0 && !error && <div className="empty-state-large"><BookOpen size={24}/><h3>No journals found</h3><p>Try a broader research topic or a journal name.</p></div>}
    <div className="journal-results">{results.map(r=><article className="journal-result" key={r.id}><div className="journal-result-main"><div className="journal-icon"><BookOpen size={18}/></div><div><h3>{r.name}</h3><p>{r.publisher ?? 'Publisher not reported'}{r.issn ? ` · ISSN ${r.issn}`:''}</p><div className="journal-meta"><span>Source: {r.source}</span>{r.oa !== undefined && <span>Open Access: {r.oa?'Yes':'No'}</span>}{r.score !== undefined && <span>Relevance signal: {r.score}%</span>}</div></div></div>{r.url && <a className="button button-outline button-small" href={r.url} target="_blank" rel="noreferrer">Open source <ExternalLink size={13}/></a>}</article>)}</div>
  </div>;
}
