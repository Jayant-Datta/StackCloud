export type Mp4TopLevelBox = {
  type: string;
  start: number;
  headerSize: number;
  bodyStart: number;
  end: number;
  size: number;
};

export type RemoteRangeReadResult = {
  buffer: Buffer;
  status: 200 | 206 | 416;
  rangeSupported: boolean;
  totalSize?: number;
};

export type RemoteMp4SampleResult =
  | {
      kind: "ok";
      buffer: Buffer;
      isTrimmed: boolean;
      originalDurationSeconds?: number;
      trimmedDurationSeconds?: number;
    }
  | {
      kind: "need_full_for_eof_moov";
      totalSize?: number;
    }
  | {
      kind: "unsupported_container";
    };

export type TrimmedMp4Result = {
  buffer: Buffer;
  originalDurationSeconds?: number;
  trimmedDurationSeconds?: number;
};

type RelativeBox = {
  type: string;
  start: number;
  headerSize: number;
  bodyStart: number;
  end: number;
};

const MAX_BOX_SCAN = 200;
const MAX_TOP_LEVEL_REMOTE_HOPS = 64;
const MAX_MOOV_BYTES = 16 * 1024 * 1024;
const PROBE_BYTES = 64 * 1024;

function makeBox(type: string, ...payloads: Buffer[]): Buffer {
  let bodyLen = 0;
  for (const chunk of payloads) {
    bodyLen += chunk.byteLength;
  }
  const header = Buffer.allocUnsafe(8);
  header.writeUInt32BE(8 + bodyLen, 0);
  header.write(type, 4, 4, "latin1");
  return Buffer.concat([header, ...payloads], 8 + bodyLen);
}

function readBoxHeader(
  buffer: Buffer,
  offset: number,
  limit: number,
  absoluteBaseOffset = 0,
  totalContainerSize?: number
): Mp4TopLevelBox | null {
  if (offset + 8 > limit) return null;
  const size32 = buffer.readUInt32BE(offset);
  const type = buffer.toString("latin1", offset + 4, offset + 8);
  let headerSize = 8;
  let size = size32;

  if (size32 === 1) {
    if (offset + 16 > limit) return null;
    const size64 = Number(buffer.readBigUInt64BE(offset + 8));
    if (!Number.isSafeInteger(size64)) return null;
    headerSize = 16;
    size = size64;
  } else if (size32 === 0) {
    if (totalContainerSize !== undefined) {
      size = totalContainerSize - (absoluteBaseOffset + offset);
    } else {
      size = limit - offset;
    }
  }

  if (size < headerSize || !Number.isSafeInteger(size)) return null;

  const absStart = absoluteBaseOffset + offset;
  return {
    type,
    start: absStart,
    headerSize,
    bodyStart: absStart + headerSize,
    end: absStart + size,
    size,
  };
}

function parseChildBoxes(
  buffer: Buffer,
  start: number,
  end: number
): RelativeBox[] {
  const boxes: RelativeBox[] = [];
  let offset = start;

  for (let i = 0; i < MAX_BOX_SCAN && offset + 8 <= end; i++) {
    const parsed = readBoxHeader(buffer, offset, end);
    if (!parsed || parsed.end > end) break;
    boxes.push({
      type: parsed.type,
      start: parsed.start,
      headerSize: parsed.headerSize,
      bodyStart: parsed.bodyStart,
      end: parsed.end,
    });
    offset = parsed.end;
  }

  return boxes;
}

function readTimescaleAndDuration(
  buffer: Buffer,
  fullBox: RelativeBox
): { version: number; timescale: number; duration: number } | null {
  const b = fullBox.bodyStart;
  if (b + 20 > fullBox.end) return null;
  const version = buffer[b];

  if (version === 0) {
    const timescale = buffer.readUInt32BE(b + 12);
    const duration = buffer.readUInt32BE(b + 16);
    return { version, timescale, duration };
  }

  if (version === 1 && b + 32 <= fullBox.end) {
    const timescale = buffer.readUInt32BE(b + 20);
    const duration = Number(buffer.readBigUInt64BE(b + 24));
    if (!Number.isFinite(duration)) return null;
    return { version, timescale, duration };
  }

  return null;
}

function cloneBoxWithUpdatedDuration(
  source: Buffer,
  box: RelativeBox,
  newDuration: number,
  durationOffsetV0: number,
  durationOffsetV1: number
): Buffer {
  const payload = Buffer.from(source.subarray(box.bodyStart, box.end));
  const version = payload[0];
  const clamped = Math.max(0, Math.round(newDuration));

  if (version === 0 && payload.byteLength >= durationOffsetV0 + 4) {
    payload.writeUInt32BE(Math.min(0xffffffff, clamped), durationOffsetV0);
  } else if (version === 1 && payload.byteLength >= durationOffsetV1 + 8) {
    payload.writeBigUInt64BE(BigInt(clamped), durationOffsetV1);
  }

  return makeBox(box.type, payload);
}

function clampElstBox(
  source: Buffer,
  elstBox: RelativeBox,
  newTrackDuration: number
): Buffer {
  const b = elstBox.bodyStart;
  if (b + 8 > elstBox.end) {
    return makeBox("elst", source.subarray(elstBox.bodyStart, elstBox.end));
  }

  const payload = Buffer.from(source.subarray(b, elstBox.end));
  const version = payload[0];
  const entryCount = payload.readUInt32BE(4);
  let remainingDuration = Math.max(0, Math.round(newTrackDuration));

  if (version === 0) {
    for (let i = 0; i < entryCount && 8 + (i + 1) * 12 <= payload.byteLength; i++) {
      const off = 8 + i * 12;
      const segmentDuration = payload.readUInt32BE(off);
      const mediaTime = payload.readInt32BE(off + 4);
      if (mediaTime >= 0) {
        const clamped = Math.min(segmentDuration, remainingDuration);
        payload.writeUInt32BE(clamped, off);
        remainingDuration -= clamped;
      }
    }
  } else if (version === 1) {
    for (let i = 0; i < entryCount && 8 + (i + 1) * 20 <= payload.byteLength; i++) {
      const off = 8 + i * 20;
      const segmentDuration = Number(payload.readBigUInt64BE(off));
      const mediaTime = payload.readBigInt64BE(off + 8);
      if (mediaTime >= BigInt(0) && Number.isFinite(segmentDuration)) {
        const clamped = Math.min(segmentDuration, remainingDuration);
        payload.writeBigUInt64BE(BigInt(clamped), off);
        remainingDuration -= clamped;
      }
    }
  }

  return makeBox("elst", payload);
}

type TrackRebuildPlan = {
  handlerType: string;
  keptSamples: number;
  newTrackDuration: number;
  maxOrigChunkEndOffset: number;
  buildTrakBox: (offsetDelta: number) => Buffer;
};

function planTrackRebuild({
  moovBuffer,
  trakBox,
  mvhdTimescale,
  mdatOrigBodyStart,
  mdatLimitEnd,
}: {
  moovBuffer: Buffer;
  trakBox: RelativeBox;
  mvhdTimescale: number;
  mdatOrigBodyStart: number;
  mdatLimitEnd: number;
}): TrackRebuildPlan | null {
  const trakChildren = parseChildBoxes(moovBuffer, trakBox.bodyStart, trakBox.end);
  const tkhdBox = trakChildren.find((c) => c.type === "tkhd");
  const mdiaBox = trakChildren.find((c) => c.type === "mdia");
  if (!tkhdBox || !mdiaBox) return null;

  const mdiaChildren = parseChildBoxes(moovBuffer, mdiaBox.bodyStart, mdiaBox.end);
  const mdhdBox = mdiaChildren.find((c) => c.type === "mdhd");
  const hdlrBox = mdiaChildren.find((c) => c.type === "hdlr");
  const minfBox = mdiaChildren.find((c) => c.type === "minf");
  if (!mdhdBox || !hdlrBox || !minfBox) return null;

  const mdhdInfo = readTimescaleAndDuration(moovBuffer, mdhdBox);
  if (!mdhdInfo || mdhdInfo.timescale <= 0) return null;

  const handlerType =
    hdlrBox.bodyStart + 12 <= hdlrBox.end
      ? moovBuffer.toString("latin1", hdlrBox.bodyStart + 8, hdlrBox.bodyStart + 12)
      : "unkn";

  const minfChildren = parseChildBoxes(moovBuffer, minfBox.bodyStart, minfBox.end);
  const stblBox = minfChildren.find((c) => c.type === "stbl");
  if (!stblBox) return null;

  const stblChildren = parseChildBoxes(moovBuffer, stblBox.bodyStart, stblBox.end);
  const stcoBox = stblChildren.find((c) => c.type === "stco");
  const co64Box = stblChildren.find((c) => c.type === "co64");
  const stscBox = stblChildren.find((c) => c.type === "stsc");
  const stszBox = stblChildren.find((c) => c.type === "stsz");
  const stz2Box = stblChildren.find((c) => c.type === "stz2");
  const sttsBox = stblChildren.find((c) => c.type === "stts");
  const cttsBox = stblChildren.find((c) => c.type === "ctts");
  const stssBox = stblChildren.find((c) => c.type === "stss");
  const sdtpBox = stblChildren.find((c) => c.type === "sdtp");

  if (stz2Box) return null;
  if ((!stcoBox && !co64Box) || !stscBox || !stszBox || !sttsBox) return null;

  // 1. Parse chunk offsets
  const chunkOffsets: number[] = [];
  const is64BitOffsets = !stcoBox && !!co64Box;
  const offsetBox = stcoBox ?? co64Box!;
  if (offsetBox.bodyStart + 8 > offsetBox.end) return null;
  const chunkCount = moovBuffer.readUInt32BE(offsetBox.bodyStart + 4);
  const entryBytes = is64BitOffsets ? 8 : 4;
  if (offsetBox.bodyStart + 8 + chunkCount * entryBytes > offsetBox.end) {
    return null;
  }
  for (let i = 0; i < chunkCount; i++) {
    const pos = offsetBox.bodyStart + 8 + i * entryBytes;
    const val = is64BitOffsets
      ? Number(moovBuffer.readBigUInt64BE(pos))
      : moovBuffer.readUInt32BE(pos);
    if (!Number.isSafeInteger(val)) return null;
    chunkOffsets.push(val);
  }

  // 2. Parse stsc (sample-to-chunk)
  if (stscBox.bodyStart + 8 > stscBox.end) return null;
  const stscCount = moovBuffer.readUInt32BE(stscBox.bodyStart + 4);
  if (stscBox.bodyStart + 8 + stscCount * 12 > stscBox.end) return null;
  const stscEntries: Array<{
    firstChunk: number;
    samplesPerChunk: number;
    rawEntry: Buffer;
  }> = [];
  for (let i = 0; i < stscCount; i++) {
    const pos = stscBox.bodyStart + 8 + i * 12;
    stscEntries.push({
      firstChunk: moovBuffer.readUInt32BE(pos),
      samplesPerChunk: moovBuffer.readUInt32BE(pos + 4),
      rawEntry: moovBuffer.subarray(pos, pos + 12),
    });
  }

  // 3. Parse stsz (sample sizes)
  if (stszBox.bodyStart + 12 > stszBox.end) return null;
  const constantSampleSize = moovBuffer.readUInt32BE(stszBox.bodyStart + 4);
  const totalSampleCount = moovBuffer.readUInt32BE(stszBox.bodyStart + 8);
  if (
    constantSampleSize === 0 &&
    stszBox.bodyStart + 12 + totalSampleCount * 4 > stszBox.end
  ) {
    return null;
  }

  // 4. Determine kept chunks & kept samples cleanly inside [mdatOrigBodyStart, mdatLimitEnd]
  let keptChunks = 0;
  let keptSamples = 0;
  let maxOrigChunkEndOffset = mdatOrigBodyStart;
  let stscIdx = 0;

  for (let chunkIdx = 0; chunkIdx < chunkOffsets.length; chunkIdx++) {
    const chunkNum1 = chunkIdx + 1;
    while (
      stscIdx + 1 < stscEntries.length &&
      stscEntries[stscIdx + 1].firstChunk <= chunkNum1
    ) {
      stscIdx++;
    }

    const samplesInChunk = stscEntries[stscIdx]?.samplesPerChunk ?? 0;
    const origOffset = chunkOffsets[chunkIdx];
    if (origOffset < mdatOrigBodyStart) break;
    if (keptSamples + samplesInChunk > totalSampleCount) break;

    let chunkByteSize = 0;
    if (constantSampleSize > 0) {
      chunkByteSize = samplesInChunk * constantSampleSize;
    } else {
      for (let s = 0; s < samplesInChunk; s++) {
        const samplePos = stszBox.bodyStart + 12 + (keptSamples + s) * 4;
        chunkByteSize += moovBuffer.readUInt32BE(samplePos);
      }
    }

    if (origOffset + chunkByteSize > mdatLimitEnd) {
      break;
    }

    keptChunks++;
    keptSamples += samplesInChunk;
    if (origOffset + chunkByteSize > maxOrigChunkEndOffset) {
      maxOrigChunkEndOffset = origOffset + chunkByteSize;
    }
  }

  // 5. Parse and trim stts -> compute kept media duration
  if (sttsBox.bodyStart + 8 > sttsBox.end) return null;
  const sttsCount = moovBuffer.readUInt32BE(sttsBox.bodyStart + 4);
  if (sttsBox.bodyStart + 8 + sttsCount * 8 > sttsBox.end) return null;

  let sttsRemaining = keptSamples;
  let keptMediaDuration = 0;
  const keptSttsEntries: Array<{ count: number; delta: number }> = [];

  for (let i = 0; i < sttsCount && sttsRemaining > 0; i++) {
    const pos = sttsBox.bodyStart + 8 + i * 8;
    const count = moovBuffer.readUInt32BE(pos);
    const delta = moovBuffer.readUInt32BE(pos + 4);
    const take = Math.min(count, sttsRemaining);
    if (take > 0) {
      keptSttsEntries.push({ count: take, delta });
      keptMediaDuration += take * delta;
      sttsRemaining -= take;
    }
  }

  const newTrackDuration =
    mvhdTimescale > 0
      ? Math.round((keptMediaDuration * mvhdTimescale) / mdhdInfo.timescale)
      : 0;

  const keptOrigOffsets = chunkOffsets.slice(0, keptChunks);

  const buildStcoOrCo64Box = (offsetDelta: number): Buffer => {
    const versionFlags = moovBuffer.subarray(
      offsetBox.bodyStart,
      offsetBox.bodyStart + 4
    );
    const countBuf = Buffer.allocUnsafe(4);
    countBuf.writeUInt32BE(keptChunks, 0);
    const payloadBuf = Buffer.allocUnsafe(keptChunks * entryBytes);
    for (let i = 0; i < keptOrigOffsets.length; i++) {
      const patched = keptOrigOffsets[i] + offsetDelta;
      if (is64BitOffsets) {
        payloadBuf.writeBigUInt64BE(BigInt(patched), i * 8);
      } else {
        payloadBuf.writeUInt32BE(patched >>> 0, i * 4);
      }
    }
    return makeBox(offsetBox.type, versionFlags, countBuf, payloadBuf);
  };

  const buildStscBox = (): Buffer => {
    const versionFlags = moovBuffer.subarray(
      stscBox.bodyStart,
      stscBox.bodyStart + 4
    );
    const keptRuns = stscEntries.filter((e) => e.firstChunk <= keptChunks);
    const countBuf = Buffer.allocUnsafe(4);
    countBuf.writeUInt32BE(keptRuns.length, 0);
    return makeBox(
      "stsc",
      versionFlags,
      countBuf,
      ...keptRuns.map((e) => e.rawEntry)
    );
  };

  const buildStszBox = (): Buffer => {
    const header = Buffer.from(
      moovBuffer.subarray(stszBox.bodyStart, stszBox.bodyStart + 12)
    );
    header.writeUInt32BE(keptSamples, 8);
    if (constantSampleSize > 0) {
      return makeBox("stsz", header);
    }
    const entries = moovBuffer.subarray(
      stszBox.bodyStart + 12,
      stszBox.bodyStart + 12 + keptSamples * 4
    );
    return makeBox("stsz", header, entries);
  };

  const buildSttsBox = (): Buffer => {
    const versionFlags = moovBuffer.subarray(
      sttsBox.bodyStart,
      sttsBox.bodyStart + 4
    );
    const out = Buffer.allocUnsafe(4 + keptSttsEntries.length * 8);
    out.writeUInt32BE(keptSttsEntries.length, 0);
    for (let i = 0; i < keptSttsEntries.length; i++) {
      out.writeUInt32BE(keptSttsEntries[i].count, 4 + i * 8);
      out.writeUInt32BE(keptSttsEntries[i].delta, 8 + i * 8);
    }
    return makeBox("stts", versionFlags, out);
  };

  const buildCttsBox = (): Buffer | null => {
    if (!cttsBox || cttsBox.bodyStart + 8 > cttsBox.end) return null;
    const versionFlags = moovBuffer.subarray(
      cttsBox.bodyStart,
      cttsBox.bodyStart + 4
    );
    const count = moovBuffer.readUInt32BE(cttsBox.bodyStart + 4);
    let remaining = keptSamples;
    const entries: Array<{ count: number; offsetBytes: Buffer }> = [];

    for (
      let i = 0;
      i < count &&
      remaining > 0 &&
      cttsBox.bodyStart + 8 + (i + 1) * 8 <= cttsBox.end;
      i++
    ) {
      const pos = cttsBox.bodyStart + 8 + i * 8;
      const sampleCount = moovBuffer.readUInt32BE(pos);
      const take = Math.min(sampleCount, remaining);
      if (take > 0) {
        entries.push({
          count: take,
          offsetBytes: moovBuffer.subarray(pos + 4, pos + 8),
        });
        remaining -= take;
      }
    }

    const hdr = Buffer.allocUnsafe(4);
    hdr.writeUInt32BE(entries.length, 0);
    const entryBufs = entries.map((e) => {
      const buf = Buffer.allocUnsafe(8);
      buf.writeUInt32BE(e.count, 0);
      e.offsetBytes.copy(buf, 4);
      return buf;
    });
    return makeBox("ctts", versionFlags, hdr, ...entryBufs);
  };

  const buildStssBox = (): Buffer | null => {
    if (!stssBox || stssBox.bodyStart + 8 > stssBox.end) return null;
    const versionFlags = moovBuffer.subarray(
      stssBox.bodyStart,
      stssBox.bodyStart + 4
    );
    const count = moovBuffer.readUInt32BE(stssBox.bodyStart + 4);
    const keptSync: number[] = [];
    for (
      let i = 0;
      i < count && stssBox.bodyStart + 8 + (i + 1) * 4 <= stssBox.end;
      i++
    ) {
      const sampleNum = moovBuffer.readUInt32BE(stssBox.bodyStart + 8 + i * 4);
      if (sampleNum > keptSamples) break;
      keptSync.push(sampleNum);
    }
    if (keptSync.length === 0) return null;
    const buf = Buffer.allocUnsafe(4 + keptSync.length * 4);
    buf.writeUInt32BE(keptSync.length, 0);
    for (let i = 0; i < keptSync.length; i++) {
      buf.writeUInt32BE(keptSync[i], 4 + i * 4);
    }
    return makeBox("stss", versionFlags, buf);
  };

  const buildSdtpBox = (): Buffer | null => {
    if (!sdtpBox || sdtpBox.bodyStart + 4 > sdtpBox.end) return null;
    const available = Math.min(
      keptSamples,
      sdtpBox.end - (sdtpBox.bodyStart + 4)
    );
    return makeBox(
      "sdtp",
      moovBuffer.subarray(sdtpBox.bodyStart, sdtpBox.bodyStart + 4 + available)
    );
  };

  const buildTrakBox = (offsetDelta: number): Buffer => {
    const newStblChildren: Buffer[] = [];
    for (const child of stblChildren) {
      switch (child.type) {
        case "stts":
          newStblChildren.push(buildSttsBox());
          break;
        case "ctts": {
          const built = buildCttsBox();
          if (built) newStblChildren.push(built);
          break;
        }
        case "stss": {
          const built = buildStssBox();
          if (built) newStblChildren.push(built);
          break;
        }
        case "stsc":
          newStblChildren.push(buildStscBox());
          break;
        case "stsz":
          newStblChildren.push(buildStszBox());
          break;
        case "stco":
        case "co64":
          newStblChildren.push(buildStcoOrCo64Box(offsetDelta));
          break;
        case "sdtp": {
          const built = buildSdtpBox();
          if (built) newStblChildren.push(built);
          break;
        }
        case "sbgp":
        case "sgpd":
        case "cslg":
          // Optional sample grouping / timeline shift hints — omit so trimmed stbl has no stale sample counts
          break;
        default:
          newStblChildren.push(
            moovBuffer.subarray(child.start, child.end)
          );
          break;
      }
    }

    const newStbl = makeBox("stbl", ...newStblChildren);

    const newMinfChildren = minfChildren.map((c) =>
      c.type === "stbl" ? newStbl : moovBuffer.subarray(c.start, c.end)
    );
    const newMinf = makeBox("minf", ...newMinfChildren);

    const newMdiaChildren = mdiaChildren.map((c) => {
      if (c.type === "mdhd") {
        return cloneBoxWithUpdatedDuration(
          moovBuffer,
          c,
          keptMediaDuration,
          16,
          24
        );
      }
      if (c.type === "minf") return newMinf;
      return moovBuffer.subarray(c.start, c.end);
    });
    const newMdia = makeBox("mdia", ...newMdiaChildren);

    const newTrakChildren = trakChildren.map((c) => {
      if (c.type === "tkhd") {
        return cloneBoxWithUpdatedDuration(
          moovBuffer,
          c,
          newTrackDuration,
          20,
          28
        );
      }
      if (c.type === "edts") {
        const edtsChildren = parseChildBoxes(moovBuffer, c.bodyStart, c.end);
        const newEdtsChildren = edtsChildren.map((ec) =>
          ec.type === "elst"
            ? clampElstBox(moovBuffer, ec, newTrackDuration)
            : moovBuffer.subarray(ec.start, ec.end)
        );
        return makeBox("edts", ...newEdtsChildren);
      }
      if (c.type === "mdia") return newMdia;
      return moovBuffer.subarray(c.start, c.end);
    });

    return makeBox("trak", ...newTrakChildren);
  };

  return {
    handlerType,
    keptSamples,
    newTrackDuration,
    maxOrigChunkEndOffset,
    buildTrakBox,
  };
}

export function trimMp4FromParts({
  ftypBuffer,
  moovBuffer,
  mdatOrigBodyStart,
  mdatPayloadBuffer,
  maxOutputBytes,
}: {
  ftypBuffer: Buffer;
  moovBuffer: Buffer;
  mdatOrigBodyStart: number;
  mdatPayloadBuffer: Buffer;
  maxOutputBytes: number;
}): TrimmedMp4Result | null {
  const moovHeader = readBoxHeader(moovBuffer, 0, moovBuffer.byteLength);
  if (!moovHeader || moovHeader.type !== "moov") return null;

  const moovChildren = parseChildBoxes(
    moovBuffer,
    moovHeader.headerSize,
    moovHeader.size
  );

  // Fragmented MP4 should use fragmented box trimmer rather than sample-table trimming
  if (moovChildren.some((c) => c.type === "mvex")) {
    return null;
  }

  const mvhdBox = moovChildren.find((c) => c.type === "mvhd");
  if (!mvhdBox) return null;
  const mvhdInfo = readTimescaleAndDuration(moovBuffer, mvhdBox);
  if (!mvhdInfo || mvhdInfo.timescale <= 0) return null;

  const originalDurationSeconds =
    mvhdInfo.duration > 0 ? mvhdInfo.duration / mvhdInfo.timescale : undefined;

  // Leave room for ftyp + new moov (which can never exceed moovBuffer.byteLength) + 8-byte mdat header
  const headroom = moovBuffer.byteLength + 64;
  const availableMdatPayloadLimit = Math.min(
    mdatPayloadBuffer.byteLength,
    Math.max(0, maxOutputBytes - ftypBuffer.byteLength - headroom - 8)
  );
  if (availableMdatPayloadLimit <= 0) return null;

  const mdatLimitEnd = mdatOrigBodyStart + availableMdatPayloadLimit;
  const trackPlans = new Map<RelativeBox, TrackRebuildPlan>();

  for (const child of moovChildren) {
    if (child.type !== "trak") continue;
    const plan = planTrackRebuild({
      moovBuffer,
      trakBox: child,
      mvhdTimescale: mvhdInfo.timescale,
      mdatOrigBodyStart,
      mdatLimitEnd,
    });
    if (!plan) return null;
    trackPlans.set(child, plan);
  }

  const keptPlans = Array.from(trackPlans.values()).filter((p) => {
    const isMedia = p.handlerType === "vide" || p.handlerType === "soun";
    return isMedia ? p.keptSamples > 0 : p.keptSamples > 0;
  });

  if (keptPlans.length === 0) return null;

  const hasMediaSamples = keptPlans.some(
    (p) =>
      (p.handlerType === "vide" || p.handlerType === "soun") && p.keptSamples > 0
  );
  if (!hasMediaSamples) return null;

  let newMvhdDuration = 0;
  let maxOrigChunkEnd = mdatOrigBodyStart;
  for (const plan of keptPlans) {
    if (plan.newTrackDuration > newMvhdDuration) {
      newMvhdDuration = plan.newTrackDuration;
    }
    if (plan.maxOrigChunkEndOffset > maxOrigChunkEnd) {
      maxOrigChunkEnd = plan.maxOrigChunkEndOffset;
    }
  }

  const mdatKeepLen = Math.min(
    mdatPayloadBuffer.byteLength,
    Math.max(0, maxOrigChunkEnd - mdatOrigBodyStart)
  );
  if (mdatKeepLen <= 0) return null;

  const buildMoovChildren = (offsetDelta: number): Buffer[] => {
    const children: Buffer[] = [];
    for (const child of moovChildren) {
      if (child.type === "mvhd") {
        children.push(
          cloneBoxWithUpdatedDuration(
            moovBuffer,
            child,
            newMvhdDuration,
            16,
            24
          )
        );
        continue;
      }
      if (child.type === "trak") {
        const plan = trackPlans.get(child);
        if (!plan || plan.keptSamples === 0) continue;
        children.push(plan.buildTrakBox(offsetDelta));
        continue;
      }
      children.push(moovBuffer.subarray(child.start, child.end));
    }
    return children;
  };

  const measuredChildren = buildMoovChildren(0);
  let newMoovBodyLen = 0;
  for (const buf of measuredChildren) {
    newMoovBodyLen += buf.byteLength;
  }
  const newMoovTotalLen = 8 + newMoovBodyLen;
  const newMdatBodyStart = ftypBuffer.byteLength + newMoovTotalLen + 8;
  const offsetDelta = newMdatBodyStart - mdatOrigBodyStart;

  const newMoovChildBuffers =
    offsetDelta === 0 ? measuredChildren : buildMoovChildren(offsetDelta);

  const newMoov = makeBox("moov", ...newMoovChildBuffers);
  const mdatHeader = Buffer.allocUnsafe(8);
  mdatHeader.writeUInt32BE(8 + mdatKeepLen, 0);
  mdatHeader.write("mdat", 4, 4, "latin1");

  const finalBuffer = Buffer.concat(
    [ftypBuffer, newMoov, mdatHeader, mdatPayloadBuffer.subarray(0, mdatKeepLen)],
    ftypBuffer.byteLength + newMoov.byteLength + 8 + mdatKeepLen
  );

  const trimmedDurationSeconds =
    newMvhdDuration > 0 ? newMvhdDuration / mvhdInfo.timescale : undefined;

  return {
    buffer: finalBuffer,
    originalDurationSeconds,
    trimmedDurationSeconds,
  };
}

function trimFragmentedMp4Buffer(buffer: Buffer): TrimmedMp4Result | null {
  let offset = 0;
  let lastValidEnd = 0;
  let seenFtyp = false;
  let seenMoov = false;
  let seenCompleteFragment = false;
  let pendingMoofStart: number | null = null;

  for (let i = 0; i < MAX_BOX_SCAN * 4 && offset + 8 <= buffer.byteLength; i++) {
    const box = readBoxHeader(buffer, offset, buffer.byteLength);
    if (!box || box.end > buffer.byteLength) break;

    if (box.type === "ftyp") {
      seenFtyp = true;
      lastValidEnd = box.end;
    } else if (box.type === "moov") {
      seenMoov = true;
      lastValidEnd = box.end;
    } else if (box.type === "moof") {
      pendingMoofStart = box.start;
    } else if (box.type === "mdat" && pendingMoofStart !== null) {
      pendingMoofStart = null;
      seenCompleteFragment = true;
      lastValidEnd = box.end;
    } else if (pendingMoofStart === null) {
      lastValidEnd = box.end;
    }

    offset = box.end;
  }

  if (!seenFtyp || !seenMoov || !seenCompleteFragment || lastValidEnd <= 0) {
    return null;
  }

  return {
    buffer:
      lastValidEnd === buffer.byteLength
        ? buffer
        : buffer.subarray(0, lastValidEnd),
  };
}

export function trimMp4BufferToPrefix(
  buffer: Buffer,
  maxOutputBytes: number
): TrimmedMp4Result | null {
  let offset = 0;
  let ftypBox: Mp4TopLevelBox | null = null;
  let moovBox: Mp4TopLevelBox | null = null;
  let firstMdatBox: Mp4TopLevelBox | null = null;
  let hasMoof = false;

  for (let i = 0; i < MAX_BOX_SCAN && offset + 8 <= buffer.byteLength; i++) {
    const box = readBoxHeader(
      buffer,
      offset,
      buffer.byteLength,
      0,
      buffer.byteLength
    );
    if (!box) break;

    if (box.type === "ftyp" && !ftypBox) {
      ftypBox = box;
    } else if (box.type === "moov" && !moovBox) {
      moovBox = box;
    } else if (box.type === "mdat" && !firstMdatBox) {
      firstMdatBox = box;
    } else if (box.type === "moof") {
      hasMoof = true;
    }

    if (box.end > buffer.byteLength) break;
    offset = box.end;
  }

  if (!ftypBox || !moovBox || moovBox.end > buffer.byteLength) {
    return null;
  }

  if (hasMoof) {
    return trimFragmentedMp4Buffer(buffer.subarray(0, maxOutputBytes));
  }

  if (!firstMdatBox || firstMdatBox.bodyStart >= buffer.byteLength) {
    return null;
  }

  const mdatPayloadEnd = Math.min(firstMdatBox.end, buffer.byteLength);
  return trimMp4FromParts({
    ftypBuffer: buffer.subarray(ftypBox.start, ftypBox.end),
    moovBuffer: buffer.subarray(moovBox.start, moovBox.end),
    mdatOrigBodyStart: firstMdatBox.bodyStart,
    mdatPayloadBuffer: buffer.subarray(firstMdatBox.bodyStart, mdatPayloadEnd),
    maxOutputBytes,
  });
}

export async function prepareRemoteMp4Sample({
  knownFileSize,
  targetMaxBytes,
  readRange,
}: {
  knownFileSize?: number;
  targetMaxBytes: number;
  readRange: (start: number, endInclusive: number) => Promise<RemoteRangeReadResult>;
}): Promise<RemoteMp4SampleResult> {
  const probeEnd =
    knownFileSize && knownFileSize > 0
      ? Math.min(knownFileSize - 1, PROBE_BYTES - 1)
      : PROBE_BYTES - 1;

  const probe0 = await readRange(0, probeEnd);
  const totalSize = knownFileSize && knownFileSize > 0 ? knownFileSize : probe0.totalSize;

  if (probe0.buffer.byteLength === 0) {
    return { kind: "unsupported_container" };
  }

  // Already have the complete file in the probe response
  if (totalSize !== undefined && totalSize <= probe0.buffer.byteLength) {
    return { kind: "ok", buffer: probe0.buffer, isTrimmed: false };
  }

  // Entire file already fits cleanly under targetMaxBytes — download intact without trimming
  if (totalSize !== undefined && totalSize <= targetMaxBytes) {
    if (probe0.rangeSupported) {
      const rest = await readRange(probe0.buffer.byteLength, totalSize - 1);
      if (rest.buffer.byteLength > 0) {
        return {
          kind: "ok",
          buffer: Buffer.concat([probe0.buffer, rest.buffer]),
          isTrimmed: false,
        };
      }
    }
    const full = await readRange(0, totalSize - 1);
    return {
      kind: "ok",
      buffer: full.buffer,
      isTrimmed: false,
    };
  }

  // Walk top-level boxes to locate ftyp, moov, mdat / moof
  let ftypBox: Mp4TopLevelBox | null = null;
  let moovBox: Mp4TopLevelBox | null = null;
  let firstMdatBox: Mp4TopLevelBox | null = null;
  let hasMoof = false;

  let offset = 0;
  for (let i = 0; i < MAX_TOP_LEVEL_REMOTE_HOPS; i++) {
    let headerBuf: Buffer;
    let absOffset = 0;

    const inProbe0 =
      offset + 8 <= probe0.buffer.byteLength &&
      (probe0.buffer.readUInt32BE(offset) !== 1 ||
        offset + 16 <= probe0.buffer.byteLength);

    if (inProbe0) {
      headerBuf = probe0.buffer;
      absOffset = 0;
    } else if (probe0.rangeSupported && (totalSize === undefined || offset + 8 <= totalSize)) {
      const hopEnd = totalSize !== undefined ? Math.min(totalSize - 1, offset + 15) : offset + 15;
      const hop = await readRange(offset, hopEnd);
      if (!hop.rangeSupported || hop.buffer.byteLength < 8) break;
      headerBuf = hop.buffer;
      absOffset = offset;
    } else {
      break;
    }

    const localOffset = offset - absOffset;
    const box = readBoxHeader(
      headerBuf,
      localOffset,
      headerBuf.byteLength,
      absOffset,
      totalSize
    );
    if (!box) break;

    if (box.type === "ftyp" && !ftypBox) {
      ftypBox = box;
    } else if (box.type === "moov" && !moovBox) {
      moovBox = box;
    } else if (box.type === "mdat" && !firstMdatBox) {
      firstMdatBox = box;
    } else if (box.type === "moof") {
      hasMoof = true;
    }

    if (moovBox && (firstMdatBox || hasMoof)) {
      break;
    }

    offset = box.end;
    if (totalSize !== undefined && offset >= totalSize) {
      break;
    }
  }

  if (!ftypBox || !moovBox) {
    if (!probe0.rangeSupported) {
      return { kind: "need_full_for_eof_moov", totalSize };
    }
    return { kind: "unsupported_container" };
  }

  // Case 1: Fragmented MP4 or faststart MP4 whose moov fits cleanly at the front
  const likelyFaststartWithoutMdatProbe =
    !probe0.rangeSupported &&
    !hasMoof &&
    !firstMdatBox &&
    moovBox.end <= Math.floor(targetMaxBytes * 0.5);

  if (
    hasMoof ||
    (moovBox.end <= targetMaxBytes &&
      firstMdatBox &&
      firstMdatBox.bodyStart < targetMaxBytes) ||
    likelyFaststartWithoutMdatProbe
  ) {
    const fetchEnd =
      totalSize !== undefined
        ? Math.min(totalSize - 1, targetMaxBytes - 1)
        : targetMaxBytes - 1;
    const prefix = await readRange(0, fetchEnd);
    const trimmed = trimMp4BufferToPrefix(prefix.buffer, targetMaxBytes);
    if (trimmed) {
      return {
        kind: "ok",
        buffer: trimmed.buffer,
        isTrimmed: true,
        originalDurationSeconds: trimmed.originalDurationSeconds,
        trimmedDurationSeconds: trimmed.trimmedDurationSeconds,
      };
    }
    if (!probe0.rangeSupported) {
      return { kind: "need_full_for_eof_moov", totalSize };
    }
    return { kind: "unsupported_container" };
  }

  // Case 2: moov is past targetMaxBytes (typically at EOF after a giant mdat)
  if (!probe0.rangeSupported) {
    return { kind: "need_full_for_eof_moov", totalSize };
  }

  if (!firstMdatBox || moovBox.size > MAX_MOOV_BYTES) {
    return { kind: "unsupported_container" };
  }

  const maxReasonableMoovEstimate = Math.min(
    moovBox.size,
    Math.floor(targetMaxBytes * 0.45)
  );
  const mdatPrefixBudget = Math.max(
    1024,
    targetMaxBytes - maxReasonableMoovEstimate - ftypBox.size - 64
  );
  const mdatFetchEnd = Math.min(
    firstMdatBox.end - 1,
    firstMdatBox.bodyStart + mdatPrefixBudget - 1
  );

  const sliceFromProbe0 = (start: number, endInclusive: number): Buffer | null =>
    endInclusive < probe0.buffer.byteLength
      ? probe0.buffer.subarray(start, endInclusive + 1)
      : null;

  const [moovResult, mdatSliceResult, ftypResult] = await Promise.all([
    sliceFromProbe0(moovBox.start, moovBox.end - 1)
      ? Promise.resolve({
          buffer: sliceFromProbe0(moovBox.start, moovBox.end - 1)!,
        })
      : readRange(moovBox.start, moovBox.end - 1),
    sliceFromProbe0(firstMdatBox.bodyStart, mdatFetchEnd)
      ? Promise.resolve({
          buffer: sliceFromProbe0(firstMdatBox.bodyStart, mdatFetchEnd)!,
        })
      : readRange(firstMdatBox.bodyStart, mdatFetchEnd),
    sliceFromProbe0(ftypBox.start, ftypBox.end - 1)
      ? Promise.resolve({
          buffer: sliceFromProbe0(ftypBox.start, ftypBox.end - 1)!,
        })
      : readRange(ftypBox.start, ftypBox.end - 1),
  ]);

  if (
    moovResult.buffer.byteLength < moovBox.size ||
    mdatSliceResult.buffer.byteLength === 0 ||
    ftypResult.buffer.byteLength < ftypBox.size
  ) {
    return { kind: "unsupported_container" };
  }

  const trimmed = trimMp4FromParts({
    ftypBuffer: ftypResult.buffer,
    moovBuffer: moovResult.buffer,
    mdatOrigBodyStart: firstMdatBox.bodyStart,
    mdatPayloadBuffer: mdatSliceResult.buffer,
    maxOutputBytes: targetMaxBytes,
  });

  if (!trimmed) {
    return { kind: "unsupported_container" };
  }

  return {
    kind: "ok",
    buffer: trimmed.buffer,
    isTrimmed: true,
    originalDurationSeconds: trimmed.originalDurationSeconds,
    trimmedDurationSeconds: trimmed.trimmedDurationSeconds,
  };
}
