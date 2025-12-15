import { useState, useEffect } from 'react';
import { Activity, Database, ToggleLeft, Edit3, Download, RotateCcw } from 'lucide-react';
import { getAllStats, resetStats, exportLogs, getStorageStats, getActiveRuleCount } from '../../stats';
import { loadAllProfiles, getActiveProfileId } from '../../storage';

export default function StatsPanel() {
  const [stats, setStats] = useState(null);
  const [storageStats, setStorageStats] = useState(null);
  const [activeRuleCount, setActiveRuleCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    const data = await getAllStats();
    const storage = await getStorageStats();
    
    const profiles = await loadAllProfiles();
    const activeProfileId = await getActiveProfileId();
    const activeProfile = profiles.find(p => p.id === activeProfileId);
    const ruleCount = activeProfile ? getActiveRuleCount(activeProfile) : 0;
    
    setStats(data);
    setStorageStats(storage);
    setActiveRuleCount(ruleCount);
    setLoading(false);
  }

  async function handleReset() {
    if (confirm('Are you sure you want to reset all statistics? This cannot be undone.')) {
      await resetStats();
      await loadStats();
    }
  }

  function handleExport() {
    exportLogs();
  }

  if (loading) {
    return (
      <div className="flex-1 bg-bg-primary p-6 flex items-center justify-center">
        <p className="text-text-secondary">Loading statistics...</p>
      </div>
    );
  }

  const totalProfileActivations = Object.values(stats.profileActivations || {})
    .reduce((sum, p) => sum + p.count, 0);
  const totalRuleToggles = Object.values(stats.ruleToggles || {})
    .reduce((sum, t) => sum + t.enabled + t.disabled, 0);
  const totalRuleEdits = Object.values(stats.ruleEdits || {})
    .reduce((sum, e) => sum + e.created + e.updated + e.deleted, 0);

  const topProfiles = Object.entries(stats.profileActivations || {})
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const trackingSince = stats.lastReset ? new Date(stats.lastReset) : new Date();
  const daysSince = Math.floor((Date.now() - trackingSince) / (1000 * 60 * 60 * 24));

  return (
    <div className="flex-1 bg-bg-primary p-6 overflow-auto">
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">Usage Statistics</h2>
            <p className="text-sm text-text-secondary">
              Tracking user actions since {trackingSince.toLocaleDateString()} ({daysSince} {daysSince === 1 ? 'day' : 'days'} ago)
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Download size={16} />
              Export
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-bg-tertiary hover:bg-bg-primary border border-border text-text-primary rounded-md text-sm font-medium transition-colors flex items-center gap-2"
            >
              <RotateCcw size={16} />
              Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <StatCard
            title="Profile Activations"
            value={totalProfileActivations.toLocaleString()}
            icon={<Activity className="w-5 h-5 text-primary" />}
            subtitle="Times profiles were switched"
          />
          <StatCard
            title="Rule Toggles"
            value={totalRuleToggles.toLocaleString()}
            icon={<ToggleLeft className="w-5 h-5 text-primary" />}
            subtitle="Rules enabled/disabled"
          />
          <StatCard
            title="Rule Edits"
            value={totalRuleEdits.toLocaleString()}
            icon={<Edit3 className="w-5 h-5 text-primary" />}
            subtitle="Created, updated, deleted"
          />
          <StatCard
            title="Active Rules"
            value={activeRuleCount.toLocaleString()}
            icon={<Activity className="w-5 h-5 text-green-500" />}
            subtitle="Currently enabled in active profile"
          />
        </div>

        {storageStats && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Storage Usage</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-bg-secondary rounded-md space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text-primary">Sync Storage</span>
                  <Database className="w-4 h-4 text-text-secondary" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${storageStats.sync.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-text-secondary font-mono">
                    {storageStats.sync.percentage}%
                  </span>
                </div>
                <p className="text-xs text-text-secondary">
                  {(storageStats.sync.used / 1024).toFixed(1)} KB / {(storageStats.sync.quota / 1024).toFixed(0)} KB
                </p>
              </div>
              
              <div className="p-4 bg-bg-secondary rounded-md space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text-primary">Local Storage</span>
                  <Database className="w-4 h-4 text-text-secondary" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${storageStats.local.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-text-secondary font-mono">
                    {storageStats.local.percentage}%
                  </span>
                </div>
                <p className="text-xs text-text-secondary">
                  {(storageStats.local.used / 1024).toFixed(1)} KB / {(storageStats.local.quota / 1024).toFixed(0)} KB
                </p>
              </div>
            </div>
          </div>
        )}

        {topProfiles.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Most Used Profiles</h3>
            <div className="space-y-2">
              {topProfiles.map((profile) => (
                <div key={profile.id} className="flex items-center justify-between p-3 bg-bg-secondary rounded-md">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-text-primary font-medium block truncate">{profile.name}</span>
                    {profile.lastActivated && (
                      <span className="text-xs text-text-secondary">
                        Last used: {new Date(profile.lastActivated).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <div className="h-2 w-24 bg-bg-tertiary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${(profile.count / topProfiles[0].count) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-text-secondary font-mono w-12 text-right">
                      {profile.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-md">
          <p className="text-sm text-blue-400">
            <strong>Note:</strong> These statistics track user actions only (profile switches, rule edits, toggles). 
            Manifest V3's declarativeNetRequest API doesn't provide callbacks for individual rule matches, 
            so real-time request interception cannot be tracked.
          </p>
        </div>

      </div>
    </div>
  );
}

function StatCard({ title, value, icon, subtitle }) {
  return (
    <div className="p-4 bg-bg-secondary rounded-md border border-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-text-secondary">{title}</span>
        {icon}
      </div>
      <p className="text-2xl font-semibold text-text-primary">{value}</p>
      {subtitle && <p className="text-xs text-text-tertiary mt-1">{subtitle}</p>}
    </div>
  );
}
