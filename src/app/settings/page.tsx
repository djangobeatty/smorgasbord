'use client';

import { useState, useEffect } from 'react';
import { NavBar } from '@/components/layout';
import { useRigs } from '@/lib/use-rigs';
import { useTheme } from '@/lib/theme-provider';
import { useProjectMode } from '@/lib/project-mode';
import { RigCard } from '@/components/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { VisualTheme, FeatureMode } from '@/types/config';

interface GtInfo {
  gtRoot: string;
  source: string;
  envVar: string | null;
  beadsPath: string | null;
  resolvedBeadsPath: string;
  beadsSource: string;
}

export default function Settings() {
  const {
    rigs,
    isLoading: rigsLoading,
    error: rigsError,
    refresh: refreshRigs,
    addRig,
    removeRig,
    startRig,
    parkRig,
    unparkRig,
  } = useRigs();

  const { theme, setTheme } = useTheme();
  const isKawaii = theme === 'smorgasbord';
  const { isBeadsOnly } = useProjectMode();

  // GT info state
  const [gtInfo, setGtInfo] = useState<GtInfo | null>(null);
  const [gtInfoLoading, setGtInfoLoading] = useState(true);
  const [gtPathInput, setGtPathInput] = useState('');
  const [gtPathDirty, setGtPathDirty] = useState(false);
  const [savingGtPath, setSavingGtPath] = useState(false);
  const [gtPathSaved, setGtPathSaved] = useState(false);

  // Beads path state (for beads-only mode)
  const [beadsPathInput, setBeadsPathInput] = useState('');
  const [beadsPathDirty, setBeadsPathDirty] = useState(false);
  const [savingBeadsPath, setSavingBeadsPath] = useState(false);
  const [beadsPathSaved, setBeadsPathSaved] = useState(false);

  // Add rig form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRigName, setNewRigName] = useState('');
  const [newRigGitUrl, setNewRigGitUrl] = useState('');
  const [newRigPrefix, setNewRigPrefix] = useState('');
  const [addingRig, setAddingRig] = useState(false);
  const [addRigError, setAddRigError] = useState<string | null>(null);

  // Feature mode state
  const [featureMode, setFeatureMode] = useState<FeatureMode>('gastown');
  const [modeSaved, setModeSaved] = useState(false);
  const FEATURE_MODE_KEY = 'smorgasbord-feature-mode';

  // Fetch GT info on mount
  useEffect(() => {
    async function fetchGtInfo() {
      try {
        const response = await fetch('/api/gt-info');
        if (response.ok) {
          const data = await response.json();
          setGtInfo(data);
          setGtPathInput(data.envVar || data.gtRoot || '');
          setBeadsPathInput(data.beadsPath || data.resolvedBeadsPath || '');
        }
      } catch (err) {
        console.error('Failed to fetch GT info:', err);
      } finally {
        setGtInfoLoading(false);
      }
    }
    fetchGtInfo();
  }, []);

  // Load feature mode from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FEATURE_MODE_KEY);
      if (stored === 'gastown' || stored === 'beads-only') {
        setFeatureMode(stored);
      }
    } catch (err) {
      console.error('Failed to load feature mode:', err);
    }
  }, []);

  const handleFeatureModeChange = (value: FeatureMode) => {
    setFeatureMode(value);
    setModeSaved(false);
    try {
      localStorage.setItem(FEATURE_MODE_KEY, value);
      setModeSaved(true);
    } catch (err) {
      console.error('Failed to save feature mode:', err);
    }
  };

  const handleGtPathChange = (value: string) => {
    setGtPathInput(value);
    setGtPathDirty(value !== (gtInfo?.envVar || gtInfo?.gtRoot || ''));
    setGtPathSaved(false);
  };

  const handleSaveGtPath = async () => {
    setSavingGtPath(true);
    try {
      const response = await fetch('/api/gt-info', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gtBasePath: gtPathInput }),
      });
      if (response.ok) {
        setGtPathDirty(false);
        setGtPathSaved(true);
      }
    } catch (err) {
      console.error('Failed to save GT path:', err);
    } finally {
      setSavingGtPath(false);
    }
  };

  const handleBeadsPathChange = (value: string) => {
    setBeadsPathInput(value);
    setBeadsPathDirty(value !== (gtInfo?.beadsPath || ''));
    setBeadsPathSaved(false);
  };

  const handleSaveBeadsPath = async () => {
    setSavingBeadsPath(true);
    try {
      const response = await fetch('/api/gt-info', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beadsPath: beadsPathInput }),
      });
      if (response.ok) {
        setBeadsPathDirty(false);
        setBeadsPathSaved(true);
      }
    } catch (err) {
      console.error('Failed to save beads path:', err);
    } finally {
      setSavingBeadsPath(false);
    }
  };

  const handleAddRig = async () => {
    if (!newRigName.trim() || !newRigGitUrl.trim()) {
      setAddRigError('Name and Git URL are required');
      return;
    }

    setAddingRig(true);
    setAddRigError(null);
    try {
      await addRig(newRigName.trim(), newRigGitUrl.trim(), newRigPrefix.trim() || undefined);
      // Reset form
      setNewRigName('');
      setNewRigGitUrl('');
      setNewRigPrefix('');
      setShowAddForm(false);
    } catch (err) {
      setAddRigError(err instanceof Error ? err.message : 'Failed to add rig');
    } finally {
      setAddingRig(false);
    }
  };

  const error = rigsError;

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-3">
          {isKawaii && <span className="text-4xl">⚙️</span>}
          <div>
            <h2 className="text-2xl font-bold text-foreground">Settings</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure your dashboard preferences
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
            <p className="text-destructive">Error: {error.message}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Rigs Section - Gas Town only */}
          {!isBeadsOnly && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {isKawaii && <span>🏗️</span>}
                  Rigs
                </CardTitle>
                <CardDescription>
                  Manage Gas Town rigs (project containers wrapping git repositories)
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setShowAddForm(!showAddForm)} variant="default" size="sm">
                  {isKawaii && <span className="mr-1">{showAddForm ? '❌' : '➕'}</span>}
                  {showAddForm ? 'Cancel' : 'Add Rig'}
                </Button>
                <Button onClick={refreshRigs} variant="outline" size="sm">
                  {isKawaii && <span className="mr-1">🔄</span>}
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Rig Form */}
              {showAddForm && (
                <div className="p-4 border border-border rounded-lg bg-muted/30 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-rig-name">Rig Name</Label>
                      <Input
                        id="new-rig-name"
                        value={newRigName}
                        onChange={(e) => setNewRigName(e.target.value)}
                        placeholder="my-project"
                        disabled={addingRig}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-rig-prefix">Prefix (optional)</Label>
                      <Input
                        id="new-rig-prefix"
                        value={newRigPrefix}
                        onChange={(e) => setNewRigPrefix(e.target.value)}
                        placeholder="mp"
                        disabled={addingRig}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-rig-git-url">Git URL</Label>
                    <Input
                      id="new-rig-git-url"
                      value={newRigGitUrl}
                      onChange={(e) => setNewRigGitUrl(e.target.value)}
                      placeholder="https://github.com/user/repo.git"
                      disabled={addingRig}
                    />
                  </div>
                  {addRigError && (
                    <p className="text-sm text-destructive">{addRigError}</p>
                  )}
                  <Button onClick={handleAddRig} disabled={addingRig}>
                    {addingRig ? 'Adding... (this may take a minute)' : 'Add Rig'}
                  </Button>
                </div>
              )}

              {/* Rig List */}
              {rigsLoading ? (
                <div className="py-8 text-center text-muted-foreground">
                  Loading rigs...
                </div>
              ) : rigs.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <p>No rigs found.</p>
                  <p className="mt-2 text-sm">
                    Click &quot;Add Rig&quot; above to add your first rig.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rigs.map((rig) => (
                    <RigCard
                      key={rig.name}
                      rig={rig}
                      onStart={startRig}
                      onPark={parkRig}
                      onUnpark={unparkRig}
                      onRemove={removeRig}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          )}

          {/* Display Settings Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isKawaii && <span>🎨</span>}
                Display Settings
              </CardTitle>
              <CardDescription>
                Configure the dashboard appearance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="theme">Visual Theme</Label>
                <Select
                  value={theme}
                  onChange={(value) => setTheme(value as VisualTheme)}
                  options={[
                    { value: 'smorgasbord', label: 'envs.now' },
                    { value: 'hangover', label: 'Hangover' },
                  ]}
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground">
                  envs.now is the default kawaii theme. Hangover is for when you can&apos;t handle the colours.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feature-mode">Dashboard Mode</Label>
                <Select
                  value={featureMode}
                  onChange={(value) => handleFeatureModeChange(value as FeatureMode)}
                  options={[
                    { value: 'gastown', label: 'Gas Town' },
                    { value: 'beads-only', label: 'Beads Only' },
                  ]}
                  className="max-w-xs"
                />
                {modeSaved && (
                  <p className="text-sm text-chart-2">
                    Mode saved. Refresh the page to apply changes.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Gas Town shows all features (Mayor, Crew, Polecats, Witnesses, etc.).
                  Beads Only shows just the kanban board for issue tracking.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Beads Path Configuration - Beads Only mode */}
          {isBeadsOnly && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isKawaii && <span>📿</span>}
                Beads Path
              </CardTitle>
              <CardDescription>
                Path to your .beads directory (contains beads.db)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {gtInfoLoading ? (
                <div className="py-2 text-muted-foreground">Loading...</div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="beads-path">BEADS_PATH</Label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        id="beads-path"
                        value={beadsPathInput}
                        onChange={(e) => handleBeadsPathChange(e.target.value)}
                        placeholder="/path/to/your/project/.beads"
                        className="max-w-lg font-mono"
                      />
                      <Button
                        onClick={handleSaveBeadsPath}
                        disabled={!beadsPathDirty || savingBeadsPath}
                        size="sm"
                      >
                        {savingBeadsPath ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                    {beadsPathSaved && (
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        Saved to .env.local. Restart the server for changes to take effect.
                      </p>
                    )}
                    {gtInfo && gtInfo.resolvedBeadsPath && (
                      <p className="text-xs text-muted-foreground">
                        Currently using: {gtInfo.resolvedBeadsPath}
                        {gtInfo.beadsSource && ` (${gtInfo.beadsSource})`}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          )}

          {/* Gas Town Path Configuration - Gas Town only */}
          {!isBeadsOnly && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isKawaii && <span>⛽</span>}
                Gas Town Path
              </CardTitle>
              <CardDescription>
                Path to your Gas Town root directory (contains .gt folder and rigs)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {gtInfoLoading ? (
                <div className="py-2 text-muted-foreground">Loading...</div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="gt-base-path">GT_BASE_PATH</Label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        id="gt-base-path"
                        value={gtPathInput}
                        onChange={(e) => handleGtPathChange(e.target.value)}
                        placeholder="/path/to/your/gt"
                        className="max-w-lg font-mono"
                      />
                      <Button
                        onClick={handleSaveGtPath}
                        disabled={!gtPathDirty || savingGtPath}
                        size="sm"
                      >
                        {savingGtPath ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                    {gtPathSaved && (
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        Saved to .env.local. Restart the server for changes to take effect.
                      </p>
                    )}
                    {gtInfo && (
                      <p className="text-xs text-muted-foreground">
                        Currently using: {gtInfo.gtRoot} ({gtInfo.source})
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          )}

          {/* Configuration Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isKawaii && <span>📋</span>}
                Configuration
              </CardTitle>
              <CardDescription>
                Configuration file information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {!isBeadsOnly && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Rig Source:</span>
                  <span className="font-mono text-foreground">
                    mayor/rigs.json
                  </span>
                </div>
              )}
              {isBeadsOnly && gtInfo && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Beads Database:</span>
                  <span className="font-mono text-foreground">
                    {gtInfo.resolvedBeadsPath}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Environment Config:</span>
                <span className="font-mono text-foreground">
                  .env.local
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Theme Storage:</span>
                <span className="font-mono text-foreground">
                  Browser localStorage
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
