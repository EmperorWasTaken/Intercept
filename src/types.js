export const createRequestHeader = (name = '', value = '') => ({
  id: crypto.randomUUID(),
  enabled: true,
  name,
  value,
  comment: ''
});

export const createRedirect = (from = '', to = '') => ({
  id: crypto.randomUUID(),
  enabled: true,
  from,
  to,
  comment: ''
});

export const createRequestFilter = (value = '') => ({
  id: crypto.randomUUID(),
  enabled: true,
  value,
  comment: ''
});

export const createProfile = (name = 'New Profile') => ({
  id: crypto.randomUUID(),
  name,
  active: false,
  requestHeaders: [],
  redirects: [],
  filters: []
});