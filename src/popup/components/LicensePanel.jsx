import { useState, useEffect } from 'react';
import { KeyRound, CheckCircle, XCircle, Loader, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { getLicenseData, activateLicense, removeLicense } from '../../license.js';
import { signInWithGoogle, signOut, getCloudUser } from '../../cloud-auth.js';
import { syncProfiles, getLastSynced } from '../../cloud-sync.js';
import { loadAllProfiles, saveAllProfiles } from '../../storage.js';

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

  useEffect(() => {
    getCloudUser().then(u => {
      setCloudUser(u);
      setLoadingUser(false);
    });
    getLastSynced().then(setLastSynced);
  }, []);

  async function handleSignIn() {
    setSigningIn(true);
    setSyncStatus(null);
    try {
      const user = await signInWithGoogle();
      setCloudUser(user);
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
