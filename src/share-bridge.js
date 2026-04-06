document.dispatchEvent(new CustomEvent('intercept:ready'));

document.addEventListener('intercept:import', (e) => {
  chrome.runtime.sendMessage(
    { action: 'importSharedProfile', profile: e.detail },
    (response) => {
      const ok = response?.success === true;
      document.dispatchEvent(new CustomEvent('intercept:importResult', { detail: { ok } }));
    }
  );
});
