const LS_STORE = 'intercept';
const LS_VARIANT_ID = '1494839';
const LS_API_BASE = 'https://api.lemonsqueezy.com/v1/licenses';
const STORAGE_KEY = 'licenseData';

let _cache = null;

async function getInstanceId() {
  const { licenseInstanceId } = await chrome.storage.local.get('licenseInstanceId');
  if (licenseInstanceId) return licenseInstanceId;
  const id = crypto.randomUUID();
  await chrome.storage.local.set({ licenseInstanceId: id });
  return id;
}

async function saveLicenseData(data) {
  _cache = data;
  await chrome.storage.local.set({ [STORAGE_KEY]: data });
}

export async function getLicenseData() {
  if (_cache) return _cache;
  const result = await chrome.storage.local.get(STORAGE_KEY);
  _cache = result[STORAGE_KEY] ?? null;
  return _cache;
}

export async function isPro() {
  const data = await getLicenseData();
  return data?.status === 'active';
}

export async function activateLicense(licenseKey) {
  const instanceId = await getInstanceId();

  let res;
  try {
    res = await fetch(`${LS_API_BASE}/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        license_key: licenseKey,
        instance_name: `Intercept-${instanceId.slice(0, 8)}`,
      }),
    });
  } catch {
    return { success: false, error: 'Network error. Check your connection.' };
  }

  const json = await res.json();

  if (!res.ok || !json.activated) {
    return { success: false, error: json.error ?? 'Activation failed.' };
  }


  const meta = json.meta;
  if (String(meta?.variant_id) !== LS_VARIANT_ID || meta?.store_id?.toString().includes(LS_STORE) === false) {

    if (String(meta?.variant_id) !== LS_VARIANT_ID) {
      await deactivateLicense(licenseKey, json.instance?.id);
      return { success: false, error: 'This key is not for Intercept Pro.' };
    }
  }

  await saveLicenseData({
    key: licenseKey,
    instanceId: json.instance?.id,
    status: 'active',
    customerName: meta?.customer_name ?? null,
    customerEmail: meta?.customer_email ?? null,
    activatedAt: Date.now(),
    validatedAt: Date.now(),
  });

  return { success: true };
}

export async function validateStoredLicense() {
  const data = await getLicenseData();
  if (!data?.key) return;

  let res;
  try {
    res = await fetch(`${LS_API_BASE}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ license_key: data.key }),
    });
  } catch {
    return;
  }

  const json = await res.json();
  const valid = res.ok && json.valid;

  await saveLicenseData({
    ...data,
    status: valid ? 'active' : 'invalid',
    validatedAt: Date.now(),
  });
}

export async function removeLicense() {
  const data = await getLicenseData();

  if (data?.key && data?.instanceId) {
    await deactivateLicense(data.key, data.instanceId).catch(() => {});
  }

  _cache = null;
  await chrome.storage.local.remove(STORAGE_KEY);
}

async function deactivateLicense(licenseKey, instanceId) {
  if (!instanceId) return;
  await fetch(`${LS_API_BASE}/deactivate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ license_key: licenseKey, instance_id: instanceId }),
  });
}
