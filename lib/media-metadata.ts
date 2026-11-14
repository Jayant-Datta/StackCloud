export type ExtractedMediaInfo = {
  mediaType: string;
  durationSeconds?: number;
  title?: string;
  artist?: string;
  album?: string;
};

const MAX_TAG_LENGTH = 120;
const MAX_ID3_SCAN_BYTES = 512 * 1024;
const MAX_BOX_ITERATIONS = 500;

function cleanTagText(value: string): string | undefined {
  const cleaned = value
    .replace(/\u0000+$/g, "")
    .replace(/\u0000+/g, ", ")
    .replace(/[\u0001-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return undefined;
  return cleaned.length > MAX_TAG_LENGTH
    ? cleaned.slice(0, MAX_TAG_LENGTH).trim()
    : cleaned;
}

function cleanNullTerminatedId3v1(value: string): string | undefined {
  const nullIdx = value.indexOf("\u0000");
  const sliced = nullIdx === -1 ? value : value.slice(0, nullIdx);
  return cleanTagText(sliced);
}

function readSynchsafeInt(buffer: Buffer, offset: number): number {
  return (
    ((buffer[offset] & 0x7f) << 21) |
    ((buffer[offset + 1] & 0x7f) << 14) |
    ((buffer[offset + 2] & 0x7f) << 7) |
    (buffer[offset + 3] & 0x7f)
  );
}

function decodeUtf16Be(slice: Buffer): string {
  const evenLen = slice.length - (slice.length % 2);
  if (evenLen <= 0) return "";
  const swapped = Buffer.allocUnsafe(evenLen);
  for (let i = 0; i < evenLen; i += 2) {
    swapped[i] = slice[i + 1];
    swapped[i + 1] = slice[i];
  }
  return swapped.toString("utf16le");
}

function decodeId3TextPayload(payload: Buffer): string | undefined {
  if (payload.length === 0) return undefined;
  const encoding = payload[0];
  const textSlice = payload.subarray(1);
  if (textSlice.length === 0) return undefined;

  let decoded: string;
  switch (encoding) {
    case 0:
      decoded = textSlice.toString("latin1");
      break;
    case 1: {
      if (textSlice.length >= 2) {
        if (textSlice[0] === 0xfe && textSlice[1] === 0xff) {
          decoded = decodeUtf16Be(textSlice.subarray(2));
          break;
        }
        if (textSlice[0] === 0xff && textSlice[1] === 0xfe) {
          decoded = textSlice.subarray(2).toString("utf16le");
          break;
        }
      }
      decoded = textSlice.toString("utf16le");
      break;
    }
    case 2:
      decoded = decodeUtf16Be(textSlice);
      break;
    case 3:
    default:
      decoded = textSlice.toString("utf8");
      break;
  }

  return cleanTagText(decoded);
}

export function detectAudioVideoMediaType(
  buffer: Buffer,
  extension: string
): string {
  let sniff = buffer;

  if (
    buffer.byteLength >= 10 &&
    buffer[0] === 0x49 &&
    buffer[1] === 0x44 &&
    buffer[2] === 0x33
  ) {
    const id3Size = readSynchsafeInt(buffer, 6);
    const audioStart = 10 + id3Size;
    if (audioStart < buffer.byteLength) {
      sniff = buffer.subarray(audioStart);
    } else {
      return "audio/mpeg";
    }
  }

  if (
    sniff.byteLength >= 12 &&
    sniff.toString("ascii", 0, 4) === "RIFF" &&
    sniff.toString("ascii", 8, 12) === "WAVE"
  ) {
    return "audio/wav";
  }

  if (sniff.byteLength >= 4 && sniff.toString("ascii", 0, 4) === "OggS") {
    return "audio/ogg";
  }

  if (sniff.byteLength >= 4 && sniff.toString("ascii", 0, 4) === "fLaC") {
    return "audio/flac";
  }

  if (sniff.byteLength >= 8 && sniff.toString("ascii", 4, 8) === "ftyp") {
    const majorBrand =
      sniff.byteLength >= 12 ? sniff.toString("ascii", 8, 12) : "";
    if (majorBrand === "M4A " || majorBrand === "M4B " || extension === "mp3") {
      return "audio/mp4";
    }
    return "video/mp4";
  }

  if (
    sniff.byteLength >= 4 &&
    sniff[0] === 0x1a &&
    sniff[1] === 0x45 &&
    sniff[2] === 0xdf &&
    sniff[3] === 0xa3
  ) {
    return extension === "mp3" ? "audio/webm" : "video/webm";
  }

  if (
    extension === "mp3" &&
    sniff.byteLength >= 2 &&
    sniff[0] === 0xff &&
    (sniff[1] & 0xe0) === 0xe0
  ) {
    return (sniff[1] & 0x06) === 0x00 ? "audio/aac" : "audio/mpeg";
  }

  return extension === "mp3" ? "audio/mpeg" : "video/mp4";
}

function extractMp3Metadata(
  buffer: Buffer,
  allowEofId3v1 = true
): {
  title?: string;
  artist?: string;
  album?: string;
} {
  let title: string | undefined;
  let artist: string | undefined;
  let album: string | undefined;

  // ID3v2 at start of file
  if (
    buffer.byteLength >= 10 &&
    buffer[0] === 0x49 &&
    buffer[1] === 0x44 &&
    buffer[2] === 0x33
  ) {
    const majorVersion = buffer[3];
    const flags = buffer[5];
    const tagSize = readSynchsafeInt(buffer, 6);
    const end = Math.min(
      buffer.byteLength,
      10 + tagSize,
      MAX_ID3_SCAN_BYTES
    );

    let offset = 10;

    // Skip optional extended header in ID3v2.3 / ID3v2.4
    if ((flags & 0x40) !== 0 && offset + 4 <= end) {
      if (majorVersion === 4) {
        const extSize = readSynchsafeInt(buffer, offset);
        if (extSize >= 6 && offset + extSize <= end) {
          offset += extSize;
        }
      } else if (majorVersion === 3) {
        const extSize = buffer.readUInt32BE(offset);
        if (extSize >= 0 && offset + 4 + extSize <= end) {
          offset += 4 + extSize;
        }
      }
    }

    if (majorVersion === 3 || majorVersion === 4) {
      for (let i = 0; i < MAX_BOX_ITERATIONS && offset + 10 <= end; i++) {
        if (buffer[offset] === 0) break; // Padding
        const frameId = buffer.toString("ascii", offset, offset + 4);
        const frameSize =
          majorVersion === 4 &&
          (buffer[offset + 4] & 0x80) === 0 &&
          (buffer[offset + 5] & 0x80) === 0 &&
          (buffer[offset + 6] & 0x80) === 0 &&
          (buffer[offset + 7] & 0x80) === 0
            ? readSynchsafeInt(buffer, offset + 4)
            : buffer.readUInt32BE(offset + 4);

        if (frameSize <= 0 || offset + 10 + frameSize > end) break;

        const payload = buffer.subarray(offset + 10, offset + 10 + frameSize);
        if (frameId === "TIT2" && !title) {
          title = decodeId3TextPayload(payload);
        } else if (frameId === "TPE1" && !artist) {
          artist = decodeId3TextPayload(payload);
        } else if (frameId === "TALB" && !album) {
          album = decodeId3TextPayload(payload);
        }

        if (title && artist && album) break;
        offset += 10 + frameSize;
      }
    } else if (majorVersion === 2) {
      for (let i = 0; i < MAX_BOX_ITERATIONS && offset + 6 <= end; i++) {
        if (buffer[offset] === 0) break;
        const frameId = buffer.toString("ascii", offset, offset + 3);
        const frameSize =
          (buffer[offset + 3] << 16) |
          (buffer[offset + 4] << 8) |
          buffer[offset + 5];

        if (frameSize <= 0 || offset + 6 + frameSize > end) break;

        const payload = buffer.subarray(offset + 6, offset + 6 + frameSize);
        if (frameId === "TT2" && !title) {
          title = decodeId3TextPayload(payload);
        } else if (frameId === "TP1" && !artist) {
          artist = decodeId3TextPayload(payload);
        } else if (frameId === "TAL" && !album) {
          album = decodeId3TextPayload(payload);
        }

        if (title && artist && album) break;
        offset += 6 + frameSize;
      }
    }
  }

  // Fallback to legacy ID3v1 at end of file
  if (
    allowEofId3v1 &&
    (!title || !artist || !album) &&
    buffer.byteLength >= 128
  ) {
    const id3v1Start = buffer.byteLength - 128;
    if (buffer.toString("ascii", id3v1Start, id3v1Start + 3) === "TAG") {
      if (!title) {
        title = cleanNullTerminatedId3v1(
          buffer.subarray(id3v1Start + 3, id3v1Start + 33).toString("latin1")
        );
      }
      if (!artist) {
        artist = cleanNullTerminatedId3v1(
          buffer.subarray(id3v1Start + 33, id3v1Start + 63).toString("latin1")
        );
      }
      if (!album) {
        album = cleanNullTerminatedId3v1(
          buffer.subarray(id3v1Start + 63, id3v1Start + 93).toString("latin1")
        );
      }
    }
  }

  return { title, artist, album };
}

type Mp4Box = {
  type: string;
  bodyStart: number;
  end: number;
};

function readMp4Box(
  buffer: Buffer,
  offset: number,
  limit: number
): Mp4Box | null {
  if (offset + 8 > limit) return null;
  const size32 = buffer.readUInt32BE(offset);
  const type = buffer.toString("latin1", offset + 4, offset + 8);
  let headerSize = 8;
  let boxSize = size32;

  if (size32 === 1) {
    if (offset + 16 > limit) return null;
    const size64 = Number(buffer.readBigUInt64BE(offset + 8));
    if (!Number.isFinite(size64)) return null;
    headerSize = 16;
    boxSize = size64;
  } else if (size32 === 0) {
    boxSize = limit - offset;
  }

  if (boxSize < headerSize || offset + boxSize > limit) return null;

  return {
    type,
    bodyStart: offset + headerSize,
    end: offset + boxSize,
  };
}

function findMp4ChildBoxes(
  buffer: Buffer,
  start: number,
  end: number
): Mp4Box[] {
  const boxes: Mp4Box[] = [];
  let offset = start;
  for (let i = 0; i < MAX_BOX_ITERATIONS && offset + 8 <= end; i++) {
    const box = readMp4Box(buffer, offset, end);
    if (!box) break;
    boxes.push(box);
    offset = box.end;
  }
  return boxes;
}

function extractIlstTagText(buffer: Buffer, itemBox: Mp4Box): string | undefined {
  const children = findMp4ChildBoxes(buffer, itemBox.bodyStart, itemBox.end);
  for (const child of children) {
    if (child.type !== "data") continue;
    // 'data' atom has 4 bytes type indicator + 4 bytes locale before value
    if (child.bodyStart + 8 >= child.end) continue;
    const dataType = buffer.readUInt32BE(child.bodyStart) & 0x00ffffff;
    const valueSlice = buffer.subarray(child.bodyStart + 8, child.end);
    if (dataType === 1) {
      return cleanTagText(valueSlice.toString("utf8"));
    }
    if (dataType === 2) {
      return cleanTagText(decodeUtf16Be(valueSlice));
    }
  }
  return undefined;
}

function extractMp4Metadata(buffer: Buffer): {
  durationSeconds?: number;
  title?: string;
  artist?: string;
  album?: string;
} {
  let durationSeconds: number | undefined;
  let title: string | undefined;
  let artist: string | undefined;
  let album: string | undefined;

  const topBoxes = findMp4ChildBoxes(buffer, 0, buffer.byteLength);
  const moov = topBoxes.find((box) => box.type === "moov");
  if (!moov) return {};

  const moovChildren = findMp4ChildBoxes(buffer, moov.bodyStart, moov.end);

  const mvhd = moovChildren.find((box) => box.type === "mvhd");
  if (mvhd && mvhd.bodyStart + 20 <= mvhd.end) {
    const version = buffer[mvhd.bodyStart];
    if (version === 0 && mvhd.bodyStart + 20 <= mvhd.end) {
      const timescale = buffer.readUInt32BE(mvhd.bodyStart + 12);
      const duration = buffer.readUInt32BE(mvhd.bodyStart + 16);
      if (timescale > 0 && duration > 0) {
        durationSeconds = duration / timescale;
      }
    } else if (version === 1 && mvhd.bodyStart + 32 <= mvhd.end) {
      const timescale = buffer.readUInt32BE(mvhd.bodyStart + 20);
      const duration = Number(buffer.readBigUInt64BE(mvhd.bodyStart + 24));
      if (timescale > 0 && duration > 0 && Number.isFinite(duration)) {
        durationSeconds = duration / timescale;
      }
    }
  }

  const udta = moovChildren.find((box) => box.type === "udta");
  if (udta) {
    const udtaChildren = findMp4ChildBoxes(buffer, udta.bodyStart, udta.end);
    const meta = udtaChildren.find((box) => box.type === "meta");
    if (meta && meta.bodyStart + 12 <= meta.end) {
      // ISO meta is usually a FullBox (+4 version/flags), though some muxers omit FullBox header
      const metaStartWithFullBox = findMp4ChildBoxes(
        buffer,
        meta.bodyStart + 4,
        meta.end
      );
      const metaChildren =
        metaStartWithFullBox.length > 0
          ? metaStartWithFullBox
          : findMp4ChildBoxes(buffer, meta.bodyStart, meta.end);

      const ilst = metaChildren.find((box) => box.type === "ilst");
      if (ilst) {
        const items = findMp4ChildBoxes(buffer, ilst.bodyStart, ilst.end);
        for (const item of items) {
          if (item.type === "\xa9nam" && !title) {
            title = extractIlstTagText(buffer, item);
          } else if (item.type === "\xa9ART" && !artist) {
            artist = extractIlstTagText(buffer, item);
          } else if (item.type === "\xa9alb" && !album) {
            album = extractIlstTagText(buffer, item);
          }
        }
      }
    }
  }

  return { durationSeconds, title, artist, album };
}

export function extractMediaInfo(
  buffer: Buffer,
  extension: string,
  options?: { allowEofTags?: boolean }
): ExtractedMediaInfo {
  const mediaType = detectAudioVideoMediaType(buffer, extension);

  if (mediaType === "audio/mp4" || mediaType === "video/mp4") {
    return {
      mediaType,
      ...extractMp4Metadata(buffer),
    };
  }

  if (extension === "mp3" || mediaType === "audio/mpeg") {
    return {
      mediaType,
      ...extractMp3Metadata(buffer, options?.allowEofTags ?? true),
    };
  }

  return { mediaType };
}
