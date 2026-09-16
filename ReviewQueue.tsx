import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { STAGE_LABELS, REVIEW_STATUS_LABELS, type Review, type Project, type Profile } from '@/lib/types';
import { ArrowRight, ShieldCheck, Clock } from 'lucide-react';

export default function ReviewQueue({ onOpenProject }: { onOpenProject: (id: string) => void }) {
  const { profile } = useAuth();
  const [reviews, setReviews] = useState<(Review & { project?: Project; submitter?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data: memberData } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', profile.id)
        .in('role', ['supervisor', 'reviewer']);
      const projectIds = (memberData ?? []).map((m: { project_id: string }) => m.project_id);
      if (projectIds.length === 0) {
        setReviews([]);
        setLoading(false);
        return;
      }
      const { data: reviewData } = await supabase
        .from('reviews')
        .select('*, project:projects(*), submitter:profiles!reviews_submitted_by_fkey(*)')
        .in('project_id', projectIds)
        .eq('status', 'pending')
        .order('submitted_at', { ascending: false });
      setReviews((reviewData ?? []) as (Review & { project?: Project; submitter?: Profile })[]);
      setLoading(false);
    })();
  }, [profile]);

  if (loading) return <div className="page-loading">Loading review queue...</div>;

  return (
    <div className="review-queue-page">
      <div className="page-header">
        <div>
          <h1>Review Queue</h1>
          <p className="page-subtitle">Research stages awaiting your review across all assigned projects.</p>
        </div>
        <div className="review-count-badge">
          <ShieldCheck size={18} /> {reviews.length} pending
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="empty-state-large">
          <h3>No reviews pending</h3>
          <p>When researchers submit stages for review, they will appear here.</p>
        </div>
      ) : (
        <div className="review-list">
          {reviews.map((review) => (
            <button
              key={review.id}
              className="review-card"
              onClick={() => onOpenProject(review.project_id)}
            >
              <div className="review-card-header">
                <span className="review-stage-badge">{STAGE_LABELS[review.stage]}</span>
                <span className="review-time-ago">
                  <Clock size={14} /> Submitted {new Date(review.submitted_at).toLocaleDateString()}
                </span>
              </div>
              <h3>{review.project?.title ?? 'Unknown project'}</h3>
              <p>Submitted by {review.submitter?.full_name ?? 'Unknown researcher'}</p>
              <span className="review-action-link">
                Review <ArrowRight size={14} />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
