function safePart(value) {
  return (
    String(value || 'producto')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'producto'
  );
}

export function wallapopMediaUrl(value) {
  if (typeof value !== 'string') return '';
  if (value.startsWith('/')) return `https://hsmuebles.es${value}`;
  return value;
}

export function photoExtension(url) {
  try {
    const pathname = new URL(url, window.location.origin).pathname;
    const match = pathname.match(/\.([a-zA-Z0-9]{2,5})$/);
    return match ? `.${match[1].toLowerCase()}` : '.jpg';
  } catch {
    return '.jpg';
  }
}

export function photoFilename(record, index, url) {
  const number = String(index + 1).padStart(2, '0');
  return `${number}-${safePart(record.reference || record.productId)}${photoExtension(url)}`;
}

export function zipFilename(record) {
  return `${safePart(record.reference || record.productId)}.zip`;
}

async function fetchPhoto(url) {
  const response = await fetch(wallapopMediaUrl(url));
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.blob();
}

function saveBlob(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function downloadPhotosZip(record, onProgress) {
  if (!record.photos?.length) throw new Error('У товара нет фотографий');
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const failures = [];
  let completed = 0;
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < record.photos.length) {
      const index = nextIndex;
      nextIndex += 1;
      const url = record.photos[index];
      try {
        zip.file(photoFilename(record, index, url), await fetchPhoto(url));
      } catch (error) {
        failures.push(`${url} — ${error.message}`);
      } finally {
        completed += 1;
        onProgress?.(completed, record.photos.length);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(4, record.photos.length) }, worker));
  if (failures.length === record.photos.length) {
    throw new Error('Не удалось скачать фотографии');
  }
  if (failures.length) zip.file('_errors.txt', failures.join('\n'));

  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
  saveBlob(blob, zipFilename(record));
  return { downloaded: record.photos.length - failures.length, failed: failures.length };
}
