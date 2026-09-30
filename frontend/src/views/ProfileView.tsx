import { useFrappeAuth, useFrappeGetDoc } from 'frappe-react-sdk';
import { User, Mail, Shield, Globe, CheckCircle2, XCircle, Info } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { StatusPill } from '@/components/ui/StatusPill';
import { LoadingState } from '@/components/ui/EmptyState';
import { LABELS } from '@/constants/labels';

interface UserRoleRow {
  role: string;
}

interface UserDoc {
  name: string;
  email: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  user_type?: string;
  language?: string;
  enabled?: number;
  roles?: UserRoleRow[];
}

export function ProfileView() {
  const { currentUser } = useFrappeAuth();

  const { data: userDoc, isLoading, error } = useFrappeGetDoc<UserDoc>(
    'User',
    currentUser ?? '',
    currentUser ? `user-profile-${currentUser}` : null,
  );

  const fullName = userDoc?.full_name || currentUser || 'User';
  const email = userDoc?.email || currentUser || '';
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2) || 'U';

  const roles = (userDoc?.roles ?? []).map((r) => r.role);

  return (
    <AppShell title={LABELS.profile.title}>
      {(search) => {
        const filteredRoles = search.trim()
          ? roles.filter((r) => r.toLowerCase().includes(search.toLowerCase()))
          : roles;

        return (
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            {/* Notice banner */}
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl border text-xs"
              style={{
                background: 'color-mix(in srgb, var(--primary) 8%, var(--bg-card))',
                borderColor: 'color-mix(in srgb, var(--primary) 30%, transparent)',
                color: 'var(--text)',
              }}
            >
              <Info size={16} className="text-primary flex-shrink-0" />
              <span>{LABELS.profile.readOnlyNotice}</span>
            </div>

            {isLoading ? (
              <div className="card border p-12 flex justify-center items-center">
                <LoadingState />
              </div>
            ) : error ? (
              <div className="card border p-6 text-sm text-accent">
                {LABELS.error}: {String(error)}
              </div>
            ) : (
              <>
                {/* Header Identity Card */}
                <div className="card border rounded-2xl p-6" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0 shadow-md"
                        style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
                      >
                        {initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="text-xl font-bold text-fg">{fullName}</h2>
                          <StatusPill status={userDoc?.enabled === 0 ? 'Cancelled' : 'Completed'} />
                        </div>
                        <p className="text-sm text-muted mt-1 flex items-center gap-1.5">
                          <Mail size={14} />
                          <span>{email}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                        style={{
                          background: userDoc?.enabled === 0 ? 'var(--bg-hover)' : 'color-mix(in srgb, var(--success) 12%, transparent)',
                          color: userDoc?.enabled === 0 ? 'var(--text-muted)' : 'var(--success)',
                        }}
                      >
                        {userDoc?.enabled === 0 ? <XCircle size={13} /> : <CheckCircle2 size={13} />}
                        {userDoc?.enabled === 0 ? LABELS.profile.disabled : LABELS.profile.active}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Profile Fields Grid */}
                <div className="card border rounded-2xl p-6" style={{ borderColor: 'var(--border)' }}>
                  <h3 className="text-sm font-semibold text-fg uppercase tracking-wider mb-5 flex items-center gap-2">
                    <User size={16} className="text-primary" />
                    <span>{LABELS.profile.subtitle}</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-xs text-muted font-medium mb-1">{LABELS.profile.fullName}</p>
                      <p className="text-sm font-semibold text-fg">{fullName || '—'}</p>
                    </div>

                    <div>
                      <p className="text-xs text-muted font-medium mb-1">{LABELS.profile.email}</p>
                      <p className="text-sm font-semibold text-fg">{email || '—'}</p>
                    </div>

                    <div>
                      <p className="text-xs text-muted font-medium mb-1">{LABELS.profile.userType}</p>
                      <p className="text-sm font-semibold text-fg">{userDoc?.user_type || 'System User'}</p>
                    </div>

                    <div>
                      <p className="text-xs text-muted font-medium mb-1 flex items-center gap-1.5">
                        <Globe size={13} />
                        <span>{LABELS.profile.language}</span>
                      </p>
                      <p className="text-sm font-semibold text-fg">{userDoc?.language || 'English (en)'}</p>
                    </div>

                    <div>
                      <p className="text-xs text-muted font-medium mb-1">{LABELS.profile.status}</p>
                      <p className="text-sm font-semibold text-fg">
                        {userDoc?.enabled === 0 ? LABELS.profile.disabled : LABELS.profile.active}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted font-medium mb-1 flex items-center gap-1.5">
                        <Shield size={13} />
                        <span>{LABELS.profile.roles}</span>
                      </p>
                      <p className="text-sm font-semibold text-fg">{roles.length} assigned</p>
                    </div>
                  </div>
                </div>

                {/* Assigned Roles Section */}
                <div className="card border rounded-2xl p-6" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-fg uppercase tracking-wider flex items-center gap-2">
                      <Shield size={16} className="text-primary" />
                      <span>{LABELS.profile.roles}</span>
                    </h3>
                    <span className="text-xs text-muted">
                      {filteredRoles.length} {filteredRoles.length === 1 ? 'role' : 'roles'}
                    </span>
                  </div>

                  {filteredRoles.length === 0 ? (
                    <p className="text-xs text-muted py-4">{LABELS.profile.noRoles}</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {filteredRoles.map((role) => (
                        <span
                          key={role}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border"
                          style={{
                            background: 'var(--bg-card2)',
                            borderColor: 'var(--border)',
                            color: 'var(--text)',
                          }}
                        >
                          <Shield size={12} className="text-muted" />
                          {role}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        );
      }}
    </AppShell>
  );
}
