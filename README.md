# ResearchAtlas

ResearchAtlas is a research-lifecycle platform for personal and institutional research workspaces.

## This revision

The codebase has been aligned to the Master Product Owner / UX / Engineering specification supplied with the project. The specification is the source of truth; see the attached master specification for the complete product contract. fileciteturn1file0L5-L9

### Security and architecture changes
- Workspace membership is an explicit tenancy primitive.
- Project creation is atomic through `create_project`, including initial project membership.
- Institutional stage submission and review decisions use server-side PostgreSQL functions rather than trusting React state.
- Personal self-directed completion is restricted server-side to personal workspaces.
- Journal metadata is read/discovered from OpenAlex/Crossref; client users cannot mutate the journal cache.
- Institutional onboarding no longer lets arbitrary users create a university hierarchy. It records an institutional setup request instead.
- Audit events are created for project creation, stage submission, personal completion and review decisions.

### Product surfaces
- Personal and institutional onboarding
- Eight-stage research lifecycle
- Projects, tasks, documents and comments
- Institutional Review Queue
- Publications and publication lifecycle
- Journal Finder using OpenAlex + Crossref discovery
- Institution hierarchy administration
- Research pipeline analytics
- Knowledge Library
- Responsive, accessible scholarly visual language

## Supabase
Run migrations in order:
1. `20260916183829_001_researchatlas_foundation.sql`
2. `20260916190000_002_researchatlas_workflow_security.sql`

Configure:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The Google Docs and institutional invitation flows require OAuth/Edge Function credentials and should be enabled only after the corresponding Supabase secrets and production permission model are configured. The v1 architecture keeps Google Docs as the manuscript editing environment rather than rebuilding the editor. 

## Important build rule
The master specification explicitly says to establish the Phase 1 foundation and prove workspace isolation before moving on to the advanced publication, analytics and Google Docs integrations. fileciteturn1file0L2362-L2383
