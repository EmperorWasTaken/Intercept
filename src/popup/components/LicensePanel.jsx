import { useState, useEffect } from 'react';
import { KeyRound, CheckCircle, XCircle, Loader, Cloud, CloudOff, RefreshCw, Users, UserPlus, Download, Trash2 } from 'lucide-react';
import { getLicenseData, activateLicense, removeLicense } from '../../license.js';
import { signInWithGoogle, signOut, getCloudUser } from '../../cloud-auth.js';
import { syncProfiles, getLastSynced } from '../../cloud-sync.js';
import { loadAllProfiles, saveAllProfiles } from '../../storage.js';
import { getMyOrg, getOrgProfiles, getOrgMembers, shareProfileToOrg, deleteOrgProfile, inviteMember } from '../../team-sync.js';

export default function LicensePanel() {
  const [licenseData, setLicenseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [keyInput, setKeyInput] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getLicenseData().then(data => {
      setLicenseData(data);
      setLoading(false);
    });
  }, []);

  async function handleActivate(e) {
    e.preventDefault();
    const key = keyInput.trim();
    if (!key) return;

    setWorking(true);
    setError(null);

    const result = await activateLicense(key);

    if (result.success) {
      const data = await getLicenseData();
      setLicenseData(data);
      setKeyInput('');
      setSuccess(true);
    } else {
      setError(result.error);
    }

    setWorking(false);
  }

  async function handleRemove() {
    setWorking(true);
    await removeLicense();
    setLicenseData(null);
    setSuccess(false);
    setWorking(false);
  }

  const isPro = licenseData?.status === 'active';

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto">
      <div className="flex items-center gap-3 mb-6">
        <KeyRound size={20} className="text-primary" />
        <h2 className="text-lg font-semibold text-text-primary">Intercept Pro</h2>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-text-secondary text-sm">
          <Loader size={16} className="animate-spin" />
          <span>Loading…</span>
        </div>
      ) : isPro ? (
        <ActiveState licenseData={licenseData} onRemove={handleRemove} working={working} />
      ) : (
        <ActivateForm
          keyInput={keyInput}
          onKeyChange={setKeyInput}
          onSubmit={handleActivate}
          working={working}
          error={error}
          success={success}
        />
      )}
    </div>
  );
}

function ActiveState({ licenseData, onRemove, working }) {
  const activatedDate = licenseData.activatedAt
    ? new Date(licenseData.activatedAt).toLocaleDateString()
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
        <CheckCircle size={16} />
        <span>Pro license active</span>
      </div>

      <div className="bg-bg-secondary border border-border rounded-md p-4 flex flex-col gap-2 text-sm">
        {licenseData.customerEmail && (
          <Row label="Email" value={licenseData.customerEmail} />
        )}
        {licenseData.customerName && (
          <Row label="Name" value={licenseData.customerName} />
        )}
        {activatedDate && (
          <Row label="Activated" value={activatedDate} />
        )}
      </div>

      <button
        onClick={onRemove}
        disabled={working}
        className="w-fit px-4 py-2 bg-bg-tertiary hover:bg-bg-primary border border-border text-text-secondary hover:text-text-primary rounded-md text-sm transition-colors disabled:opacity-50"
      >
        {working ? 'Removing…' : 'Remove license'}
      </button>

      <p className="text-text-secondary text-xs leading-relaxed">
        Removing the license frees up one activation slot so you can use it on another device.
      </p>

      <div className="border-t border-border pt-4">
        <CloudSyncPanel />
      </div>
    </div>
  );
}

function CloudSyncPanel() {
  const [cloudUser, setCloudUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [org, setOrg] = useState(null);

  useEffect(() => {
    getCloudUser().then(u => {
      setCloudUser(u);
      setLoadingUser(false);
      if (u) getMyOrg().then(setOrg);
    });
    getLastSynced().then(setLastSynced);
  }, []);

  async function handleSignIn() {
    setSigningIn(true);
    setSyncStatus(null);
    try {
      const user = await signInWithGoogle();
      setCloudUser(user);
      getMyOrg().then(setOrg);
    } catch (err) {
      setSyncStatus({ ok: false, message: err.message });
    }
    setSigningIn(false);
  }

  async function handleSignOut() {
    await signOut();
    setCloudUser(null);
    setLastSynced(null);
    setSyncStatus(null);
    setOrg(null);
  }

  async function handleSync() {
    setSyncing(true);
    setSyncStatus(null);
    try {
      const profiles = await loadAllProfiles();
      const result = await syncProfiles(profiles, saveAllProfiles);
      if (result.success) {
        const ts = await getLastSynced();
        setLastSynced(ts);
        setSyncStatus({
          ok: true,
          message: result.added > 0
            ? `Synced. ${result.added} new profile${result.added > 1 ? 's' : ''} added from cloud.`
            : 'Synced successfully.',
        });
      } else {
        setSyncStatus({ ok: false, message: result.error });
      }
    } catch (err) {
      setSyncStatus({ ok: false, message: err.message });
    }
    setSyncing(false);
  }

  const lastSyncedLabel = lastSynced
    ? new Date(lastSynced).toLocaleString()
    : null;

  if (loadingUser) {
    return (
      <div className="flex items-center gap-2 text-text-secondary text-sm">
        <Loader size={14} className="animate-spin" />
        <span>Loading cloud sync…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-text-primary text-sm font-medium">
        {cloudUser ? <Cloud size={15} className="text-primary" /> : <CloudOff size={15} className="text-text-secondary" />}
        <span>Cloud sync</span>
      </div>

      {cloudUser ? (
        <>
          <div className="bg-bg-secondary border border-border rounded-md p-3 flex flex-col gap-1.5 text-sm">
            <Row label="Signed in as" value={cloudUser.email} />
            {lastSyncedLabel && <Row label="Last synced" value={lastSyncedLabel} />}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing…' : 'Sync now'}
            </button>
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 bg-bg-tertiary hover:bg-bg-primary border border-border text-text-secondary hover:text-text-primary rounded-md text-sm transition-colors"
            >
              Sign out
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-text-secondary text-xs leading-relaxed">
            Sign in to sync your profiles across browsers and devices.
          </p>
          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="w-fit flex items-center gap-2 px-3 py-1.5 bg-bg-secondary hover:bg-bg-tertiary border border-border text-text-primary rounded-md text-sm transition-colors disabled:opacity-50"
          >
            {signingIn
              ? <><Loader size={13} className="animate-spin" />Signing in…</>
              : <>Sign in with Google</>
            }
          </button>
        </>
      )}

      {syncStatus && (
        <div className={`flex items-center gap-1.5 text-xs ${syncStatus.ok ? 'text-green-400' : 'text-red-400'}`}>
          {syncStatus.ok ? <CheckCircle size={13} /> : <XCircle size={13} />}
          <span>{syncStatus.message}</span>
        </div>
      )}

      {org && (
        <div className="border-t border-border pt-4 mt-1">
          <TeamPanel org={org} />
        </div>
      )}
    </div>
  );
}

function TeamPanel({ org }) {
  const [profiles, setProfiles] = useState([]);
  const [members, setMembers] = useState([]);
  const [localProfiles, setLocalProfiles] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [sharing, setSharing] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [status, setStatus] = useState(null);

  const isAdmin = org.role === 'admin';

  useEffect(() => {
    Promise.all([
      getOrgProfiles(org.id),
      getOrgMembers(org.id),
      loadAllProfiles(),
    ]).then(([profResult, memResult, local]) => {
      if (profResult.success) setProfiles(profResult.profiles);
      if (memResult.success) setMembers(memResult.members);
      setLocalProfiles(local);
      setLoadingProfiles(false);
    });
  }, [org.id]);

  async function handleShare() {
    const profile = localProfiles.find(p => p.id === selectedProfileId);
    if (!profile) return;
    setSharing(true);
    setStatus(null);
    const result = await shareProfileToOrg(org.id, profile);
    if (result.success) {
      const r = await getOrgProfiles(org.id);
      if (r.success) setProfiles(r.profiles);
      setSelectedProfileId('');
      setStatus({ ok: true, message: `"${profile.name}" shared with team.` });
    } else {
      setStatus({ ok: false, message: result.error });
    }
    setSharing(false);
  }

  async function handleDelete(profileId) {
    const result = await deleteOrgProfile(profileId);
    if (result.success) {
      setProfiles(prev => prev.filter(p => p.id !== profileId));
    } else {
      setStatus({ ok: false, message: result.error });
    }
  }

  async function handleUse(profile) {
    const existing = localProfiles.find(p => p.id === profile.data.id);
    if (!existing) {
      const updated = [...localProfiles, profile.data];
      await saveAllProfiles(updated);
      setLocalProfiles(updated);
      setStatus({ ok: true, message: `"${profile.name}" added to your profiles.` });
    } else {
      setStatus({ ok: true, message: `"${profile.name}" is already in your profiles.` });
    }
  }

  async function handleInvite(e) {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;
    setInviting(true);
    setStatus(null);
    const result = await inviteMember(org.id, email);
    if (result.success) {
      setInviteEmail('');
      setStatus({ ok: true, message: `Invite sent to ${email}.` });
    } else {
      setStatus({ ok: false, message: result.error });
    }
    setInviting(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-text-primary text-sm font-medium">
          <Users size={15} className="text-primary" />
          <span>{org.name}</span>
        </div>
        <span className="text-text-secondary text-xs">{members.length}/{org.seat_limit} seats</span>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-text-secondary text-xs font-medium uppercase tracking-wide">Shared profiles</p>
        {loadingProfiles ? (
          <div className="flex items-center gap-2 text-text-secondary text-xs py-1">
            <Loader size={12} className="animate-spin" />
            <span>Loading…</span>
          </div>
        ) : profiles.length === 0 ? (
          <p className="text-text-secondary text-xs py-1">No shared profiles yet.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {profiles.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-2 bg-bg-secondary border border-border rounded px-3 py-2">
                <span className="text-text-primary text-xs truncate">{p.name}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleUse(p)}
                    className="flex items-center gap-1 px-2 py-1 bg-bg-tertiary hover:bg-bg-primary border border-border text-text-secondary hover:text-text-primary rounded text-xs transition-colors"
                    title="Add to my profiles"
                  >
                    <Download size={11} />
                    Use
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-1 text-text-secondary hover:text-red-400 transition-colors"
                      title="Remove from team"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isAdmin && (
        <>
          <div className="flex gap-2">
            <select
              value={selectedProfileId}
              onChange={e => setSelectedProfileId(e.target.value)}
              className="flex-1 px-2 py-1.5 bg-bg-secondary border border-border rounded text-xs text-text-primary focus:outline-none focus:border-primary"
            >
              <option value="">Share a local profile…</option>
              {localProfiles.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button
              onClick={handleShare}
              disabled={!selectedProfileId || sharing}
              className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded text-xs font-medium transition-colors disabled:opacity-50"
            >
              {sharing ? <Loader size={12} className="animate-spin" /> : 'Share'}
            </button>
          </div>

          <form onSubmit={handleInvite} className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="Invite by email…"
              className="flex-1 px-2 py-1.5 bg-bg-secondary border border-border rounded text-xs text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={!inviteEmail.trim() || inviting}
              className="flex items-center gap-1 px-3 py-1.5 bg-bg-secondary hover:bg-bg-tertiary border border-border text-text-secondary hover:text-text-primary rounded text-xs transition-colors disabled:opacity-50"
            >
              {inviting ? <Loader size={12} className="animate-spin" /> : <><UserPlus size={12} /> Invite</>}
            </button>
          </form>
        </>
      )}

      {status && (
        <div className={`flex items-center gap-1.5 text-xs ${status.ok ? 'text-green-400' : 'text-red-400'}`}>
          {status.ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
          <span>{status.message}</span>
        </div>
      )}
    </div>
  );
}

function ActivateForm({ keyInput, onKeyChange, onSubmit, working, error, success }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <p className="text-text-primary text-sm font-medium">Unlock Pro features</p>
        <p className="text-text-secondary text-xs leading-relaxed">
          Enter your license key to activate cloud sync, cross-browser profiles, and team workspaces.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          value={keyInput}
          onChange={e => onKeyChange(e.target.value)}
          placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
          spellCheck={false}
          className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-md text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary font-mono"
        />

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs">
            <XCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        {success && !error && (
          <div className="flex items-center gap-2 text-green-400 text-xs">
            <CheckCircle size={14} />
            <span>License activated successfully.</span>
          </div>
        )}

        <button
          type="submit"
          disabled={working || !keyInput.trim()}
          className="w-fit px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {working && <Loader size={14} className="animate-spin" />}
          {working ? 'Activating…' : 'Activate'}
        </button>
      </form>

      <div className="border-t border-border pt-4">
        <p className="text-text-secondary text-xs leading-relaxed">
          Don't have a license?{' '}
          <a
            href="https://intercept.lemonsqueezy.com"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            Get Intercept Pro
          </a>
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-text-secondary">{label}</span>
      <span className="text-text-primary font-mono text-xs">{value}</span>
    </div>
  );
}
