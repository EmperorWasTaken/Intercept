import { useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, TestTube } from 'lucide-react';
import { validateProfile, testRulesAgainstUrl } from '../../validator';

export default function ValidationPanel({ currentProfile }) {
  const [testUrl, setTestUrl] = useState('');
  const [testResults, setTestResults] = useState(null);

  const validation = validateProfile(currentProfile);
  const hasIssues = validation.errors.length > 0 || validation.warnings.length > 0;

  async function handleTestCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        setTestUrl(tab.url);
        const results = testRulesAgainstUrl(currentProfile, tab.url);
        setTestResults(results);
      }
    } catch (error) {
      console.error('Failed to get current tab:', error);
    }
  }

  function handleTestUrl() {
    if (testUrl.trim()) {
      const results = testRulesAgainstUrl(currentProfile, testUrl);
      setTestResults(results);
    }
  }

  return (
    <div className="flex-1 bg-bg-primary p-6 overflow-auto">
      <div className="max-w-3xl space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-2">Profile Validation</h2>
          <p className="text-sm text-text-secondary">Check for errors and potential issues in your rules</p>
        </div>

        {!hasIssues ? (
          <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-md">
            <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-500">No issues found</p>
              <p className="text-xs text-text-secondary mt-0.5">Your profile configuration looks good</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {validation.errors.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-red-500 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Errors ({validation.errors.length})
                </h3>
                <div className="space-y-2">
                  {validation.errors.map((error, i) => (
                    <div key={i} className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                      <p className="text-sm text-red-400">{error.message}</p>
                      {error.category && (
                        <p className="text-xs text-text-tertiary mt-1">{error.category}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {validation.warnings.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-yellow-500 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Warnings ({validation.warnings.length})
                </h3>
                <div className="space-y-2">
                  {validation.warnings.map((warning, i) => (
                    <div key={i} className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                      <p className="text-sm text-yellow-400">{warning.message}</p>
                      {warning.category && (
                        <p className="text-xs text-text-tertiary mt-1">{warning.category}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="border-t border-border pt-6">
          <h2 className="text-lg font-semibold text-text-primary mb-2">Test Rules</h2>
          <p className="text-sm text-text-secondary mb-4">See which rules would match a URL without applying them</p>

          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTestUrl();
                }}
                placeholder="https://example.com/path"
                className="flex-1 bg-bg-secondary text-text-primary border border-border rounded-md px-3 py-2 focus:outline-none focus:border-primary text-sm"
              />
              <button
                onClick={handleTestUrl}
                disabled={!testUrl.trim()}
                className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:bg-bg-tertiary disabled:text-text-secondary text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2"
              >
                <TestTube size={16} />
                Test
              </button>
            </div>

            <button
              onClick={handleTestCurrentTab}
              className="px-4 py-2 bg-bg-tertiary hover:bg-bg-primary border border-border text-text-primary rounded-md text-sm font-medium transition-colors"
            >
              Use Current Tab URL
            </button>
          </div>

          {testResults && (
            <div className="mt-4 space-y-3">
              <div className="p-3 bg-bg-secondary rounded-md">
                <p className="text-xs text-text-secondary mb-1">Testing URL:</p>
                <p className="text-sm text-text-primary break-all font-mono">{testResults.url}</p>
              </div>

              {testResults.matchedFilters.length > 0 && (
                <TestResultSection title="URL Filters" items={testResults.matchedFilters} />
              )}

              {testResults.matchedBlocks.length > 0 && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md">
                  <p className="text-sm font-medium text-red-500 mb-2">⛔ Request Would Be Blocked</p>
                  {testResults.matchedBlocks.map((block, i) => (
                    <div key={i} className="text-xs text-text-secondary">
                      Pattern: <code className="text-red-400">{block.pattern}</code>
                      {block.comment && <span className="ml-2">({block.comment})</span>}
                    </div>
                  ))}
                </div>
              )}

              {testResults.matchedRedirects.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-text-primary">Redirects ({testResults.matchedRedirects.length})</p>
                  {testResults.matchedRedirects.map((redirect, i) => (
                    <div key={i} className="p-3 bg-bg-secondary rounded-md space-y-1">
                      <p className="text-xs text-text-secondary">From: <code className="text-primary">{redirect.from}</code></p>
                      <p className="text-xs text-text-secondary">To: <code className="text-primary">{redirect.to}</code></p>
                      <p className="text-xs text-green-400">Result: {redirect.result}</p>
                      {redirect.comment && <p className="text-xs text-text-tertiary">({redirect.comment})</p>}
                    </div>
                  ))}
                </div>
              )}

              {testResults.matchedHeaders.length > 0 && (
                <TestResultSection title={`Request Headers (${testResults.matchedHeaders.length})`} items={testResults.matchedHeaders} showNameValue />
              )}

              {testResults.matchedResponseHeaders.length > 0 && (
                <TestResultSection title={`Response Headers (${testResults.matchedResponseHeaders.length})`} items={testResults.matchedResponseHeaders} showNameValue />
              )}

              {testResults.matchedFilters.length === 0 && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                  <p className="text-sm text-yellow-500">⚠️ No URL filters match - rules won't apply</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TestResultSection({ title, items, showNameValue }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-text-primary">{title}</p>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i} className="p-2 bg-bg-secondary rounded text-xs">
            {showNameValue ? (
              <>
                <p className="text-text-primary"><code className="text-primary">{item.name}</code>: {item.value}</p>
                {item.comment && <p className="text-text-tertiary mt-1">({item.comment})</p>}
              </>
            ) : (
              <>
                <p className="text-text-primary"><code className="text-primary">{item.pattern}</code></p>
                {item.comment && <p className="text-text-tertiary mt-1">({item.comment})</p>}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
