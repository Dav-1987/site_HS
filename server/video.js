/**
 * Нормализация загруженного видео: HEVC/большие исходники → H.264 в вебовом
 * размере.
 *
 * Зачем вообще: телефон (особенно iPhone) пишет HEVC, а браузеры его тянут
 * неравномерно — Safari играет всегда, Chrome только при аппаратном декодере,
 * Firefox долго не умел вовсе. У части посетителей на месте ролика чёрный
 * прямоугольник, и в аналитике это выглядит как обычный просмотр. Плюс сырая
 * запись с телефона приезжает в 1440×2560 при 10 Мбит/с — вчетверо больше, чем
 * нужно рамке шириной в 600 px.
 *
 * Перекодирование НЕ бесплатно по размеру: H.264 менее эффективен, чем HEVC,
 * поэтому уже ужатый 720p-ролик после конвертации весит примерно столько же
 * или чуть больше. Мы платим этим за то, что видео играет у всех. Реальная
 * экономия приходит с уменьшением разрешения у крупных исходников.
 *
 * Файл всегда заменяется на месте, имя не меняется: URL строится из sha256
 * исходных байт и хранится в БД, а nginx отдаёт /uploads с immutable-кэшем.
 * Тот, у кого старая версия уже в кэше, досмотрит её — она рабочая.
 */

import { spawn } from 'node:child_process';
import { rename, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';

/** Ширина, до которой ужимаем портретное видео (высоту — для ландшафтного). */
export const TARGET_PORTRAIT_WIDTH = 720;
export const TARGET_LANDSCAPE_WIDTH = 1280;

/** Порог тишины: дорожку тише этого считаем пустой и выбрасываем. */
export const SILENCE_DB = -50;

const VIDEO_EXT = new Set(['mp4', 'mov', 'webm', 'ogv']);

/** Похоже ли имя файла на видео, которое мы умеем обрабатывать. */
export function isVideoFile(name) {
  const ext = String(name).split('.').pop()?.toLowerCase();
  return VIDEO_EXT.has(ext);
}

/**
 * Нужна ли перекодировка. Уже нормализованное видео (H.264 в целевом размере)
 * пропускаем — это делает проход по каталогу идемпотентным, так что повторный
 * запуск ничего не портит и почти ничего не стоит.
 */
export function needsTranscode(info) {
  if (!info || !info.width || !info.height) return false;
  if (info.codec !== 'h264') return true;
  const portrait = info.height >= info.width;
  const limit = portrait ? TARGET_PORTRAIT_WIDTH : TARGET_LANDSCAPE_WIDTH;
  return info.width > limit;
}

/**
 * Фильтр масштабирования: ужимаем только вниз и только если исходник больше
 * цели. `-2` держит вторую сторону чётной — иначе libx264 откажется кодировать.
 */
export function scaleFilter() {
  return (
    `scale='if(gt(iw,ih),min(iw,${TARGET_LANDSCAPE_WIDTH}),` +
    `min(iw,${TARGET_PORTRAIT_WIDTH}))':-2:flags=lanczos`
  );
}

/**
 * Аргументы ffmpeg. `-threads 1` и вызов через nice — сознательное
 * самоограничение: на VPS одно ядро, и на нём же живут Express, Postgres и
 * чужие сервисы. Лучше кодировать вдвое дольше, чем придушить сайт.
 */
export function transcodeArgs(src, dst, { keepAudio = false } = {}) {
  return [
    '-hide_banner',
    '-loglevel', 'error',
    '-y',
    '-i', src,
    '-vf', scaleFilter(),
    '-c:v', 'libx264',
    '-profile:v', 'high',
    '-level', '4.0',
    '-preset', 'medium',
    '-crf', '26',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    '-threads', '1',
    ...(keepAudio ? ['-c:a', 'aac', '-b:a', '96k', '-ac', '2'] : ['-an']),
    dst,
  ];
}

/**
 * Кодирование запускается с наименьшим приоритетом: на VPS одно ядро, и на нём
 * же Express, Postgres и чужие сервисы. `nice` не ограничивает ffmpeg по
 * времени, но гарантирует, что запрос к сайту всегда получит процессор первым.
 * Под Windows (локальные прогоны и тесты) nice отсутствует — там вызываем прямо.
 */
function withNice(cmd, args) {
  if (process.platform === 'win32') return [cmd, args];
  return ['nice', ['-n', '19', cmd, ...args]];
}

function run(rawCmd, rawArgs, { timeoutMs = 15 * 60 * 1000 } = {}) {
  const [cmd, args] = withNice(rawCmd, rawArgs);
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`${cmd} timed out`));
    }, timeoutMs);
    child.stdout.on('data', (d) => {
      out += d;
    });
    child.stderr.on('data', (d) => {
      err += d;
    });
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ out, err });
      else reject(new Error(`${cmd} exited ${code}: ${err.slice(0, 300)}`));
    });
  });
}

/**
 * Угол поворота из метаданных: телефон часто пишет кадр «как есть», а рядом
 * кладёт матрицу поворота. ffmpeg при декодировании её применяет, поэтому
 * фильтр масштабирования видит уже развёрнутый кадр — и решение о том, какой
 * кап применять, надо принимать по тем же размерам, иначе портретное видео
 * получит ландшафтный лимит. Значение бывает и в side_data, и в старом теге.
 */
export function rotationOf(stream) {
  const side = stream?.side_data_list?.find((s) => s.rotation !== undefined);
  const raw = side?.rotation ?? stream?.tags?.rotate;
  const deg = Number(raw);
  if (!Number.isFinite(deg)) return 0;
  return ((Math.round(deg) % 360) + 360) % 360;
}

/** Разбор вывода ffprobe в {codec,width,height,hasAudio}. Отдельно от I/O — тестируемо. */
export function parseProbe(json) {
  let data;
  try {
    data = typeof json === 'string' ? JSON.parse(json) : json;
  } catch {
    return null;
  }
  const streams = data?.streams ?? [];
  const v = streams.find((s) => s.codec_type === 'video');
  if (!v) return null;
  const stored = { w: Number(v.width) || 0, h: Number(v.height) || 0 };
  const rotated = rotationOf(v) % 180 === 90;
  return {
    codec: v.codec_name ?? '',
    // Размеры «как покажет браузер» — с учётом поворота.
    width: rotated ? stored.h : stored.w,
    height: rotated ? stored.w : stored.h,
    storedWidth: stored.w,
    storedHeight: stored.h,
    rotation: rotationOf(v),
    hasAudio: streams.some((s) => s.codec_type === 'audio'),
    duration: Number(data?.format?.duration) || 0,
  };
}

export async function probe(path, { ffprobe = 'ffprobe' } = {}) {
  const { out } = await run(ffprobe, [
    '-v', 'error',
    '-show_streams',
    '-show_format',
    '-of', 'json',
    path,
  ]);
  return parseProbe(out);
}

/** Средняя громкость дорожки в дБ, или null если её нет/не измерить. */
export function parseMeanVolume(stderr) {
  const m = /mean_volume:\s*(-?[\d.]+) dB/.exec(String(stderr));
  return m ? Number(m[1]) : null;
}

async function hasAudibleSound(path, ffmpeg) {
  try {
    const { err } = await run(ffmpeg, [
      '-hide_banner', '-nostats',
      '-i', path,
      '-map', 'a:0',
      '-af', 'volumedetect',
      '-f', 'null', '-',
    ]);
    const mean = parseMeanVolume(err);
    return mean !== null && mean > SILENCE_DB;
  } catch {
    return false;
  }
}

/**
 * Перекодировать один файл на месте. Пишем во временный файл рядом и
 * переименовываем поверх только после проверки результата — оборванная
 * кодировка не должна оставить на сайте битый ролик.
 *
 * Возвращает {skipped} либо {before, after, grew} в байтах.
 */
export async function normalizeVideo(path, { ffmpeg = 'ffmpeg', ffprobe = 'ffprobe' } = {}) {
  const info = await probe(path, { ffprobe });
  if (!info) throw new Error('not a video');
  if (!needsTranscode(info)) return { skipped: true, info };

  const before = (await stat(path)).size;
  const tmp = `${path}.tmp-${Date.now()}.mp4`;
  const keepAudio = info.hasAudio ? await hasAudibleSound(path, ffmpeg) : false;

  try {
    await run(ffmpeg, transcodeArgs(path, tmp, { keepAudio }));
    const result = await probe(tmp, { ffprobe });
    if (!result || result.codec !== 'h264' || !result.width) {
      throw new Error('transcode produced an unusable file');
    }
    const after = (await stat(tmp)).size;
    if (after === 0) throw new Error('transcode produced an empty file');
    await rename(tmp, path);
    return { skipped: false, before, after, grew: after > before, info, result };
  } catch (err) {
    await unlink(tmp).catch(() => {});
    throw err;
  }
}

/**
 * Момент, с которого берём постер. Не нулевой кадр: телефон в первые доли
 * секунды ещё доводит экспозицию и ловит фокус, а рука дёргается — нулевой
 * кадр у записи с рук регулярно выходит тёмным или смазанным. Полсекунды
 * визуально всё ещё «начало ролика», но картинка уже чистая.
 */
export const POSTER_OFFSET_SEC = 0.5;

/**
 * `/uploads/abc.mp4` → `/uploads/abc_poster.jpg`.
 *
 * Зеркалит posterFor в src/data/settings.js. Дублируется намеренно: тот модуль
 * подтягивает settings.default.json через `import`, а на сервере такой импорт
 * не проходит — по той же причине server/settings.js читает этот JSON через
 * readFileSync. Правило простое: меняется одна — правится и вторая.
 */
export function posterFor(videoSrc) {
  if (typeof videoSrc !== 'string' || !videoSrc.startsWith('/uploads/')) return '';
  return videoSrc.replace(/\.[^.]+$/, '_poster.jpg');
}

/** Аргументы для извлечения одного кадра в JPEG. */
export function posterArgs(src, dst, { offset = POSTER_OFFSET_SEC } = {}) {
  return [
    '-hide_banner',
    '-loglevel', 'error',
    '-y',
    // -ss до -i: ffmpeg перематывает по ключевым кадрам, не декодируя всё.
    '-ss', String(offset),
    '-i', src,
    '-frames:v', '1',
    '-q:v', '4',
    dst,
  ];
}

/**
 * Постер для видео. Короткий ролик может оказаться короче смещения — тогда
 * ffmpeg не отдаст ни одного кадра, и мы повторяем с нуля.
 */
export async function extractPoster(src, dst, { ffmpeg = 'ffmpeg' } = {}) {
  try {
    await run(ffmpeg, posterArgs(src, dst));
    if ((await stat(dst)).size > 0) return true;
  } catch {
    // падаем в повтор ниже
  }
  await run(ffmpeg, posterArgs(src, dst, { offset: 0 }));
  return (await stat(dst)).size > 0;
}

/**
 * Пройти по всем видео в каталоге и нормализовать те, которым это нужно.
 * Последовательно и по одному — параллелить на одном ядре бессмысленно и
 * опасно. Ошибка на одном файле не останавливает проход.
 */
export async function sweepVideos(dir, files, { ffmpeg, ffprobe, log = console.log } = {}) {
  const summary = { checked: 0, converted: 0, skipped: 0, failed: 0, before: 0, after: 0 };
  for (const name of files) {
    if (!isVideoFile(name)) continue;
    summary.checked += 1;
    const path = join(dir, name);
    try {
      const res = await normalizeVideo(path, { ffmpeg, ffprobe });
      if (res.skipped) {
        summary.skipped += 1;
        continue;
      }
      summary.converted += 1;
      summary.before += res.before;
      summary.after += res.after;
      log(
        `[video] ${name}: ${Math.round(res.before / 1024)}KB → ${Math.round(res.after / 1024)}KB` +
          ` (${res.info.codec} ${res.info.width}×${res.info.height} → h264 ${res.result.width}×${res.result.height})`,
      );
    } catch (err) {
      summary.failed += 1;
      log(`[video] ${name}: FAILED — ${err.message}`);
    }
  }
  return summary;
}
