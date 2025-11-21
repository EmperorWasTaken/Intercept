export const createRequestHeader = (name = '', value = '') => ({
  id: crypto.randomUUID(),
  enabled: true,
  name,
  value
});

export const createRedirect = (from = '', to = '') => ({
  id: crypto.randomUUID(),
  enabled: true,
  from,
  to
});

export const createRequestFilter = (value = '') => ({
  id: crypto.randomUUID(),
  enabled: true,
  value
});

export const createProfile = (name = 'New Profile') => ({
  id: crypto.randomUUID(),
  name,
  active: false,
  requestHeaders: [],
  redirects: [],
  filters: []
});