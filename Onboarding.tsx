import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { ArrowRight, Building2, Mail, User } from 'lucide-react';

export default function Onboarding() {
  const { session, refreshProfile } = useAuth();
  const [step,setStep]=useState<'choose'|'personal'|'institution'>('choose');
  const [fullName,setFullName]=useState(''); const [institutionName,setInstitutionName]=useState(''); const [message,setMessage]=useState(''); const [error,setError]=useState<string|null>(null); const [busy,setBusy]=useState(false);
  const email=session?.user?.email ?? '';
  const domain=email.split('@')[1] ?? '';
  const createPersonal=async()=>{ if(!session?.user) return; setBusy(true); setError(null); try {
    const {data,error:we}=await supabase.from('workspaces').insert({type:'personal',owner_id:session.user.id}).select().single(); if(we) throw we;
    const {error:pe}=await supabase.from('profiles').insert({id:session.user.id,workspace_id:data.id,email,full_name:fullName||null,role:'researcher'}); if(pe) throw pe;
    await supabase.from('workspace_members').insert({workspace_id:data.id,user_id:session.user.id,role:'admin'}); await refreshProfile();
  } catch(e){setError(e instanceof Error?e.message:'Unable to create personal workspace.');} finally{setBusy(false);} };
  const requestInstitution=async(e:React.FormEvent)=>{e.preventDefault(); if(!institutionName.trim()) return; setBusy(true); setError(null); try {
    const {error:rpcError}=await supabase.rpc('request_institution_setup',{p_institution_name:institutionName.trim(),p_domain:domain||null,p_message:message||null,p_full_name:fullName||null});
    if(rpcError) throw rpcError; setStep('choose'); setMessage('Your institutional setup request has been recorded. An administrator can establish the workspace and invite you.');
  } catch(e){setError(e instanceof Error?e.message:'Unable to submit the request.');} finally{setBusy(false);} };
  return <div className="auth-screen"><div className="auth-card onboarding-card"><div className="auth-brand"><span className="brand-mark" aria-hidden="true"><span/><span/><span/></span><span>ResearchAtlas</span></div>
    {step==='choose' && <><p className="eyebrow">Workspace setup</p><h1>How do you work?</h1><p className="auth-subtitle">Choose the research environment that matches how you work. Personal research never requires a fake institution.</p>{message&&<div className="scholarly-note"><Mail size={16}/>{message}</div>}<div className="onboarding-choices"><button className="onboarding-choice" onClick={()=>setStep('personal')}><User size={28}/><strong>I'm doing my own research</strong><span>Personal workspace with the complete research lifecycle.</span><span className="choice-arrow"><ArrowRight size={16}/></span></button><button className="onboarding-choice" onClick={()=>setStep('institution')}><Building2 size={28}/><strong>I'm part of an institution</strong><span>Join an existing institution or request institutional setup.</span><span className="choice-arrow"><ArrowRight size={16}/></span></button></div></>}
    {step==='personal' && <><p className="eyebrow">Personal</p><h1>Your research workspace</h1><p className="auth-subtitle">Self-directed stage completion is available here. You can invite a supervisor, mentor, co-author, or reviewer later.</p><form className="auth-form" onSubmit={e=>{e.preventDefault();createPersonal()}}><label className="auth-field"><span>Your name</span><input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Dr. Jane Smith"/></label><p className="onboarding-info">Email: {email}</p>{error&&<p className="auth-error">{error}</p>}<button className="button button-solid auth-submit" disabled={busy}>{busy?'Creating…':'Create personal workspace'}<ArrowRight size={15}/></button></form><button className="auth-back" onClick={()=>setStep('choose')}>Back</button></>}
    {step==='institution' && <><p className="eyebrow">Institution</p><h1>Join your institution</h1><p className="auth-subtitle">Institutional hierarchies are created and governed by authorized administrators. If yours is not set up, request setup instead.</p><form className="auth-form" onSubmit={requestInstitution}><label className="auth-field"><span>Your name</span><input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Dr. Jane Smith"/></label><label className="auth-field"><span>Institution</span><input value={institutionName} onChange={e=>setInstitutionName(e.target.value)} required placeholder="University name"/></label><label className="auth-field"><span>Institutional domain</span><input value={domain} readOnly/></label><label className="auth-field"><span>Optional note</span><textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Department, research group, or setup context" rows={3}/></label>{error&&<p className="auth-error">{error}</p>}<button className="button button-solid auth-submit" disabled={busy}>{busy?'Sending…':'Request institutional setup'}<ArrowRight size={15}/></button></form><button className="auth-back" onClick={()=>setStep('choose')}>Back</button></>}
  </div></div>;
}
