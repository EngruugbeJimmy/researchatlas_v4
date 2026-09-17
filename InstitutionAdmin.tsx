import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Institution, Faculty, Department, Profile, InstitutionSetupRequest } from '@/lib/types';
import { Building2, Plus, Users, X, GraduationCap, Layers, Check, Ban } from 'lucide-react';

export default function InstitutionAdmin() {
  const { workspace } = useAuth();
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<InstitutionSetupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [showAddFaculty, setShowAddFaculty] = useState(false);
  const [newFacultyName, setNewFacultyName] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showAddDept, setShowAddDept] = useState<string | null>(null);
  const [newDeptName, setNewDeptName] = useState('');

  const load = async () => {
    if (!workspace?.institution_id) return;
    const { data: inst } = await supabase
      .from('institutions')
      .select('*')
      .eq('id', workspace.institution_id)
      .maybeSingle();
    setInstitution(inst as Institution | null);

    const { data: facs } = await supabase
      .from('faculties')
      .select('*')
      .eq('institution_id', workspace.institution_id)
      .order('name');
    setFaculties((facs ?? []) as Faculty[]);

    if ((facs ?? []).length > 0) {
      const facultyIds = (facs as Faculty[]).map((f) => f.id);
      const { data: depts } = await supabase
        .from('departments')
        .select('*')
        .in('faculty_id', facultyIds)
        .order('name');
      setDepartments((depts ?? []) as Department[]);
    }

    const { data: profs } = await supabase
      .from('profiles')
      .select('*')
      .eq('workspace_id', workspace.id)
      .order('full_name');
    setMembers((profs ?? []) as Profile[]);

    const { data: requestRows } = await supabase
      .from('institution_setup_requests')
      .select('*')
      .order('created_at', { ascending: false });

    const requestIds = (requestRows ?? []).map((r) => r.requester_id);
    const { data: profileRows } = requestIds.length
      ? await supabase.from('profiles').select('id,email').in('id', requestIds)
      : { data: [] };

    const emailMap = new Map<string, string>();
    (profileRows ?? []).forEach((profile) => {
      emailMap.set(profile.id, profile.email);
    });

    setRequests((requestRows ?? []).map((request) => ({
      ...request,
      requester_email: emailMap.get(request.requester_id) ?? null,
    })) as InstitutionSetupRequest[]);

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [workspace]);

  const addFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace?.institution_id || !newFacultyName) return;
    await supabase.from('faculties').insert({
      institution_id: workspace.institution_id,
      name: newFacultyName,
    });
    setNewFacultyName('');
    setShowAddFaculty(false);
    await load();
  };

  const addDepartment = async (e: React.FormEvent, facultyId: string) => {
    e.preventDefault();
    if (!newDeptName) return;
    await supabase.from('departments').insert({
      faculty_id: facultyId,
      name: newDeptName,
    });
    setNewDeptName('');
    setShowAddDept(null);
    await load();
  };

  const handleRequestDecision = async (requestId: string, decision: 'approved' | 'rejected') => {
    setRequestMessage(null);

    try {
      if (decision === 'approved') {
        const { error } = await supabase.rpc('approve_institution_setup', { p_request_id: requestId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('institution_setup_requests')
          .update({ status: 'rejected' })
          .eq('id', requestId);
        if (error) throw error;
      }

      await load();
      setRequestMessage(decision === 'approved'
        ? 'Institution request approved. The requester was assigned a new institution workspace.'
        : 'Institution request rejected.');
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Unable to update the request.';
      setRequestMessage(text);
    }
  };

  if (loading) return <div className="page-loading">Loading institution...</div>;

  return (
    <div className="institution-page">
      <div className="page-header">
        <div>
          <h1>{institution?.name ?? 'Institution'}</h1>
          <p className="page-subtitle">Manage faculties, departments, members, and setup requests.</p>
        </div>
        <button className="button button-solid" onClick={() => setShowAddFaculty(true)}>
          <Plus size={16} /> Add faculty
        </button>
      </div>

      {requestMessage && (
        <div className="scholarly-note" style={{ marginBottom: '1rem' }}>{requestMessage}</div>
      )}

      <div className="institution-grid">
        <div className="institution-section">
          <h3><Building2 size={18} /> Faculties and Departments</h3>
          {faculties.length === 0 ? (
            <p className="empty-hint">No faculties yet. Create one to start building your hierarchy.</p>
          ) : (
            <div className="faculty-list">
              {faculties.map((faculty) => {
                const facultyDepts = departments.filter((d) => d.faculty_id === faculty.id);
                return (
                  <div key={faculty.id} className="faculty-item">
                    <div className="faculty-header">
                      <span><GraduationCap size={16} /> {faculty.name}</span>
                      <button className="button button-outline button-small" onClick={() => setShowAddDept(showAddDept === faculty.id ? null : faculty.id)}>
                        <Plus size={12} /> Department
                      </button>
                    </div>
                    {showAddDept === faculty.id && (
                      <form onSubmit={(e) => addDepartment(e, faculty.id)} className="inline-form">
                        <input
                          type="text"
                          value={newDeptName}
                          onChange={(e) => setNewDeptName(e.target.value)}
                          placeholder="Department name..."
                          autoFocus
                        />
                        <button type="submit" className="button button-solid button-small">Add</button>
                      </form>
                    )}
                    {facultyDepts.length > 0 && (
                      <div className="dept-list">
                        {facultyDepts.map((dept) => (
                          <div key={dept.id} className="dept-item">
                            <Layers size={14} /> {dept.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="institution-section">
          <h3><Users size={18} /> Members</h3>
          {members.length === 0 ? (
            <p className="empty-hint">No members yet.</p>
          ) : (
            <div className="member-table">
              {members.map((m) => (
                <div key={m.id} className="member-row">
                  <div className="member-avatar">{(m.full_name ?? m.email)[0].toUpperCase()}</div>
                  <div>
                    <strong>{m.full_name ?? 'Unknown'}</strong>
                    <span>{m.email}</span>
                  </div>
                  <span className={`role-badge ${m.role}`}>{m.role}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="institution-section" style={{ marginTop: '1.5rem' }}>
        <h3><Building2 size={18} /> Institution setup requests</h3>
        {requests.length === 0 ? (
          <p className="empty-hint">No institution setup requests.</p>
        ) : (
          <div className="request-list">
            {requests.map((request) => (
              <div key={request.id} className="request-item" style={{ border: '1px solid #dfe7f1', borderRadius: '12px', padding: '1rem', marginTop: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div>
                    <strong>{request.institution_name}</strong>
                    <div style={{ color: '#5b6b7d', fontSize: '0.92rem' }}>
                      {request.requester_email ?? 'Unknown requester'} • {new Date(request.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={`role-badge ${request.status}`}>{request.status}</span>
                </div>

                {request.full_name && <p style={{ marginTop: '0.75rem', marginBottom: '0.15rem' }}><strong>Contact:</strong> {request.full_name}</p>}
                {request.domain && <p style={{ margin: '0.15rem 0' }}><strong>Domain:</strong> {request.domain}</p>}
                {request.message && <p style={{ margin: '0.15rem 0' }}><strong>Message:</strong> {request.message}</p>}

                {request.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.9rem', flexWrap: 'wrap' }}>
                    <button className="button button-solid button-small" onClick={() => handleRequestDecision(request.id, 'approved')}>
                      <Check size={14} /> Approve
                    </button>
                    <button className="button button-outline button-small" onClick={() => handleRequestDecision(request.id, 'rejected')}>
                      <Ban size={14} /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddFaculty && (
        <div className="modal-overlay" onClick={() => setShowAddFaculty(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Faculty</h2>
              <button className="modal-close" onClick={() => setShowAddFaculty(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={addFaculty} className="modal-form">
              <label className="form-field">
                <span>Faculty name</span>
                <input type="text" value={newFacultyName} onChange={(e) => setNewFacultyName(e.target.value)} required placeholder="Faculty of Science" />
              </label>
              <div className="modal-actions">
                <button type="button" className="button button-outline" onClick={() => setShowAddFaculty(false)}>Cancel</button>
                <button type="submit" className="button button-solid">Add faculty</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
