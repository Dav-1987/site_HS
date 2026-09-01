import { describe, expect, it } from 'vitest';
import {
  isVideoFile,
  needsTranscode,
  parseMeanVolume,
  parseProbe,
  scaleFilter,
  transcodeArgs,
  TARGET_PORTRAIT_WIDTH,
} from './video.js';

describe('isVideoFile', () => {
  it('accepts the container formats /api/upload allows', () => {
    for (const name of ['a.mp4', 'B.MOV', 'c.webm', 'd.ogv']) {
      expect(isVideoFile(name)).toBe(true);
    }
  });

  it('rejects images so a sweep never feeds a photo to ffmpeg', () => {
    for (const name of ['a.jpg', 'b.webp', 'c.png', 'd_800.webp', 'noextension']) {
      expect(isVideoFile(name)).toBe(false);
    }
  });
});

describe('needsTranscode', () => {
  it('converts HEVC even when the size is already fine — that is the whole point', () => {
    expect(needsTranscode({ codec: 'hevc', width: 720, height: 1080 })).toBe(true);
  });

  it('leaves an already normalised H.264 file alone, so a repeat sweep is a no-op', () => {
    expect(needsTranscode({ codec: 'h264', width: 720, height: 1280 })).toBe(false);
  });

  it('downscales an oversized H.264 portrait video', () => {
    expect(needsTranscode({ codec: 'h264', width: 1440, height: 2560 })).toBe(true);
  });

  it('allows a landscape video to stay wider than the portrait cap', () => {
    expect(needsTranscode({ codec: 'h264', width: 1280, height: 720 })).toBe(false);
    expect(needsTranscode({ codec: 'h264', width: 1920, height: 1080 })).toBe(true);
  });

  it('treats a square video as portrait', () => {
    expect(needsTranscode({ codec: 'h264', width: 1080, height: 1080 })).toBe(true);
    expect(needsTranscode({ codec: 'h264', width: TARGET_PORTRAIT_WIDTH, height: 720 })).toBe(false);
  });

  it('does not act on an unparseable probe', () => {
    expect(needsTranscode(null)).toBe(false);
    expect(needsTranscode({ codec: 'h264', width: 0, height: 0 })).toBe(false);
  });
});

describe('transcodeArgs', () => {
  it('keeps the even-dimension guard so libx264 never refuses the scale', () => {
    expect(scaleFilter()).toContain(':-2');
  });

  it('drops the audio track when it is silent', () => {
    const args = transcodeArgs('in.mp4', 'out.mp4', { keepAudio: false });
    expect(args).toContain('-an');
    expect(args).not.toContain('aac');
  });

  it('re-encodes audio when the clip actually has sound', () => {
    const args = transcodeArgs('in.mp4', 'out.mp4', { keepAudio: true });
    expect(args).not.toContain('-an');
    expect(args.join(' ')).toContain('-c:a aac');
  });

  it('caps itself to one thread — the VPS has a single core shared with the site', () => {
    expect(transcodeArgs('in.mp4', 'out.mp4').join(' ')).toContain('-threads 1');
  });

  it('writes a progressive-download file so playback starts before the full load', () => {
    expect(transcodeArgs('in.mp4', 'out.mp4').join(' ')).toContain('-movflags +faststart');
  });

  it('targets H.264 in a browser-safe pixel format', () => {
    const args = transcodeArgs('in.mp4', 'out.mp4').join(' ');
    expect(args).toContain('-c:v libx264');
    expect(args).toContain('-pix_fmt yuv420p');
  });
});

describe('parseProbe', () => {
  const sample = JSON.stringify({
    streams: [
      { codec_type: 'video', codec_name: 'hevc', width: 1440, height: 2560 },
      { codec_type: 'audio', codec_name: 'aac' },
    ],
    format: { duration: '11.733333' },
  });

  it('reads codec, size, duration and the presence of audio', () => {
    expect(parseProbe(sample)).toMatchObject({
      codec: 'hevc',
      width: 1440,
      height: 2560,
      hasAudio: true,
      duration: 11.733333,
    });
  });

  // Настоящий файл с прода: в контейнере 3840×2160, но с поворотом на 90°,
  // то есть на экране это портрет 2160×3840. ffmpeg разворачивает кадр сам,
  // и наш выбор лимита должен опираться на то же, что видит его фильтр.
  it('reports the on-screen size for a rotated recording, not the stored one', () => {
    const probe = parseProbe(
      JSON.stringify({
        streams: [
          {
            codec_type: 'video',
            codec_name: 'hevc',
            width: 3840,
            height: 2160,
            side_data_list: [{ rotation: -90 }],
          },
        ],
      }),
    );
    expect(probe).toMatchObject({ width: 2160, height: 3840, storedWidth: 3840, rotation: 270 });
    expect(needsTranscode(probe)).toBe(true);
  });

  it('reads the legacy rotate tag too', () => {
    const probe = parseProbe(
      JSON.stringify({
        streams: [
          { codec_type: 'video', codec_name: 'h264', width: 1280, height: 720, tags: { rotate: '90' } },
        ],
      }),
    );
    expect(probe).toMatchObject({ width: 720, height: 1280 });
    // На экране это портрет шириной 720 — уже в целевом размере, трогать нечего.
    expect(needsTranscode(probe)).toBe(false);
  });

  it('leaves unrotated video untouched', () => {
    const probe = parseProbe(
      JSON.stringify({
        streams: [{ codec_type: 'video', codec_name: 'h264', width: 1280, height: 720 }],
      }),
    );
    expect(probe).toMatchObject({ width: 1280, height: 720, rotation: 0 });
  });

  it('reports no audio when the file carries only a video stream', () => {
    const probe = parseProbe(
      JSON.stringify({ streams: [{ codec_type: 'video', codec_name: 'h264', width: 720, height: 1280 }] }),
    );
    expect(probe.hasAudio).toBe(false);
    expect(probe.duration).toBe(0);
  });

  it('returns null on junk rather than throwing mid-sweep', () => {
    expect(parseProbe('not json')).toBe(null);
    expect(parseProbe(JSON.stringify({ streams: [{ codec_type: 'audio' }] }))).toBe(null);
  });
});

describe('parseMeanVolume', () => {
  it('extracts the mean volume ffmpeg prints on stderr', () => {
    expect(parseMeanVolume('[Parsed_volumedetect_0 @ 0x1] mean_volume: -23.4 dB')).toBe(-23.4);
  });

  it('returns null when volumedetect printed nothing usable', () => {
    expect(parseMeanVolume('')).toBe(null);
    expect(parseMeanVolume('max_volume: -0.1 dB')).toBe(null);
  });
});
