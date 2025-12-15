export function validateProfile(profile) {
  const errors = [];
  const warnings = [];

  if (!profile) {
    errors.push({ type: 'profile', message: 'Profile is null or undefined' });
    return { errors, warnings, valid: false };
  }

  validateHeaders(profile.requestHeaders, 'Request Header', errors, warnings);
  validateHeaders(profile.responseHeaders, 'Response Header', errors, warnings);
  validateRedirects(profile.redirects, errors, warnings);
  validateBlocks(profile.blocks, errors, warnings);
  validateFilters(profile.filters, errors, warnings);

  return {
    errors,
    warnings,
    valid: errors.length === 0
  };
}

function validateHeaders(headers, type, errors, warnings) {
  if (!headers) return;

  const enabledNameCount = {};

  headers.forEach((header, index) => {
    if (!header.name || !header.name.trim()) {
      errors.push({
        type: 'header',
        index,
        category: type,
        message: `${type} #${index + 1}: Name is required`
      });
    }

    if (header.enabled && header.name) {
      enabledNameCount[header.name] = (enabledNameCount[header.name] || 0) + 1;
    }

    if (header.name && /[^a-zA-Z0-9-_]/.test(header.name)) {
      warnings.push({
        type: 'header',
        index,
        category: type,
        message: `${type} "${header.name}": Contains unusual characters`
      });
    }

    if (!header.value || !header.value.trim()) {
      warnings.push({
        type: 'header',
        index,
        category: type,
        message: `${type} "${header.name || 'Unnamed'}": Value is empty`
      });
    }
  });

  Object.entries(enabledNameCount).forEach(([name, count]) => {
    if (count > 1) {
      warnings.push({
        type: 'header',
        category: type,
        message: `${type} "${name}": Appears ${count} times enabled (will send multiple headers)`
      });
    }
  });
}

function validateRedirects(redirects, errors, warnings) {
  if (!redirects) return;

  redirects.forEach((redirect, index) => {
    if (!redirect.from || !redirect.from.trim()) {
      errors.push({
        type: 'redirect',
        index,
        message: `Redirect #${index + 1}: "From" pattern is required`
      });
    } else {
      try {
        new RegExp(redirect.from);
      } catch (e) {
        errors.push({
          type: 'redirect',
          index,
          message: `Redirect #${index + 1}: Invalid regex in "From" pattern: ${e.message}`
        });
      }
    }

    if (!redirect.to || !redirect.to.trim()) {
      errors.push({
        type: 'redirect',
        index,
        message: `Redirect #${index + 1}: "To" URL is required`
      });
    }

    if (redirect.from === redirect.to) {
      warnings.push({
        type: 'redirect',
        index,
        message: `Redirect #${index + 1}: "From" and "To" are identical (infinite loop risk)`
      });
    }
  });
}

function validateBlocks(blocks, errors, warnings) {
  if (!blocks) return;

  blocks.forEach((block, index) => {
    if (!block.pattern || !block.pattern.trim()) {
      errors.push({
        type: 'block',
        index,
        message: `Block #${index + 1}: Pattern is required`
      });
    } else {
      const isRegex = /[\[\](){}^$+?|\\]/.test(block.pattern) || /\.\*/.test(block.pattern);
      
      if (isRegex) {
        try {
          new RegExp(block.pattern);
        } catch (e) {
          errors.push({
            type: 'block',
            index,
            message: `Block #${index + 1}: Invalid regex pattern: ${e.message}`
          });
        }
      }
    }

    if (block.pattern === '.*') {
      warnings.push({
        type: 'block',
        index,
        message: `Block #${index + 1}: Pattern ".*" will block ALL requests`
      });
    }
  });
}

function validateFilters(filters, errors, warnings) {
  if (!filters) return;

  filters.forEach((filter, index) => {
    if (!filter.value || !filter.value.trim()) {
      errors.push({
        type: 'filter',
        index,
        message: `Filter #${index + 1}: Pattern is required`
      });
    } else {
      try {
        new RegExp(filter.value);
      } catch (e) {
        errors.push({
          type: 'filter',
          index,
          message: `Filter #${index + 1}: Invalid regex pattern: ${e.message}`
        });
      }
    }
  });
}

export function testRulesAgainstUrl(profile, url) {
  const results = {
    url,
    matchedHeaders: [],
    matchedResponseHeaders: [],
    matchedRedirects: [],
    matchedBlocks: [],
    matchedFilters: []
  };

  try {
    const urlObj = new URL(url);
    
    if (profile.filters && profile.filters.length > 0) {
      const matchesFilter = profile.filters.some(filter => {
        if (!filter.enabled) return false;
        try {
          const regex = new RegExp(filter.value);
          return regex.test(url);
        } catch {
          return false;
        }
      });

      profile.filters.forEach(filter => {
        if (!filter.enabled) return;
        try {
          const regex = new RegExp(filter.value);
          if (regex.test(url)) {
            results.matchedFilters.push({
              pattern: filter.value,
              comment: filter.comment
            });
          }
        } catch {}
      });

      if (!matchesFilter) {
        return results;
      }
    }

    if (profile.requestHeaders) {
      profile.requestHeaders.forEach(header => {
        if (header.enabled && header.name) {
          results.matchedHeaders.push({
            name: header.name,
            value: header.value,
            comment: header.comment
          });
        }
      });
    }

    if (profile.responseHeaders) {
      profile.responseHeaders.forEach(header => {
        if (header.enabled && header.name) {
          results.matchedResponseHeaders.push({
            name: header.name,
            value: header.value,
            comment: header.comment
          });
        }
      });
    }

    if (profile.redirects) {
      profile.redirects.forEach(redirect => {
        if (!redirect.enabled) return;
        try {
          const regex = new RegExp(redirect.from);
          if (regex.test(url)) {
            const newUrl = url.replace(regex, redirect.to.replace(/\$(\d+)/g, '\\$1'));
            results.matchedRedirects.push({
              from: redirect.from,
              to: redirect.to,
              result: newUrl,
              comment: redirect.comment
            });
          }
        } catch {}
      });
    }

    if (profile.blocks) {
      profile.blocks.forEach(block => {
        if (!block.enabled) return;
        try {
          const isRegex = /[\[\](){}^$+?|\\]/.test(block.pattern) || /\.\*/.test(block.pattern);
          if (isRegex) {
            const regex = new RegExp(block.pattern);
            if (regex.test(url)) {
              results.matchedBlocks.push({
                pattern: block.pattern,
                comment: block.comment
              });
            }
          } else {
            if (url.includes(block.pattern)) {
              results.matchedBlocks.push({
                pattern: block.pattern,
                comment: block.comment
              });
            }
          }
        } catch {}
      });
    }

  } catch (e) {
    console.error('Error testing URL:', e);
  }

  return results;
}
