import { appwriteConfig } from "./appwriteConfig";

export class AppwritePartialFetchError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AppwritePartialFetchError";
    this.status = status;
  }
}

export type PartialByteRangeResult = {
  buffer: Buffer;
  status: 200 | 206 | 416;
  rangeSupported: boolean;
  totalSize?: number;
  truncatedStream: boolean;
};

function parseContentRangeTotal(header: string | null): number | undefined {
  if (!header) return undefined;
  const match = /^bytes\s+(?:\d+-\d+|\*)\/(\d+|\*)$/i.exec(header.trim());
  if (!match || match[1] === "*") return undefined;
  const total = Number(match[1]);
  return Number.isSafeInteger(total) && total >= 0 ? total : undefined;
}

function parseContentLength(header: string | null): number | undefined {
  if (!header) return undefined;
  const total = Number(header.trim());
  return Number.isSafeInteger(total) && total >= 0 ? total : undefined;
}

function buildDownloadUrl(bucketFileId: string): string {
  const endpoint = appwriteConfig.endpointUrl.replace(/\/$/, "");
  return `${endpoint}/storage/buckets/${encodeURIComponent(
    appwriteConfig.bucketId
  )}/files/${encodeURIComponent(bucketFileId)}/download`;
}

async function readStreamCapped(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number
): Promise<{ buffer: Buffer; exceededCap: boolean }> {
  if (!body || maxBytes <= 0) {
    if (body) {
      await body.cancel().catch(() => {});
    }
    return { buffer: Buffer.alloc(0), exceededCap: false };
  }

  const reader = body.getReader();
  const chunks: Buffer[] = [];
  let totalRead = 0;
  let exceededCap = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;

      const remaining = maxBytes - totalRead;
      if (value.byteLength >= remaining) {
        if (remaining > 0) {
          chunks.push(Buffer.from(value.buffer, value.byteOffset, remaining));
          totalRead += remaining;
        }
        // Peek one more check? If value exceeded remaining, definitely truncated;
        // if exact match, cancel cleanly without reading rest of huge stream.
        if (value.byteLength > remaining) {
          exceededCap = true;
        }
        await reader.cancel().catch(() => {});
        break;
      }

      chunks.push(Buffer.from(value.buffer, value.byteOffset, value.byteLength));
      totalRead += value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }

  return {
    buffer: chunks.length === 1 ? chunks[0] : Buffer.concat(chunks, totalRead),
    exceededCap,
  };
}

export async function fetchAppwriteByteRange({
  bucketFileId,
  start,
  endInclusive,
  signal,
  allowUnranged200ForStartZero = true,
}: {
  bucketFileId: string;
  start: number;
  endInclusive: number;
  signal?: AbortSignal;
  allowUnranged200ForStartZero?: boolean;
}): Promise<PartialByteRangeResult> {
  if (endInclusive < start) {
    return {
      buffer: Buffer.alloc(0),
      status: 206,
      rangeSupported: true,
      truncatedStream: false,
    };
  }

  const expectedMaxBytes = endInclusive - start + 1;
  const response = await fetch(buildDownloadUrl(bucketFileId), {
    method: "GET",
    headers: {
      "X-Appwrite-Project": appwriteConfig.projectId,
      "X-Appwrite-Key": appwriteConfig.secretKey,
      Accept: "*/*",
      Range: `bytes=${start}-${endInclusive}`,
    },
    signal,
    cache: "no-store",
  });

  if (response.status === 416) {
    const totalSize = parseContentRangeTotal(response.headers.get("content-range"));
    await response.body?.cancel().catch(() => {});
    return {
      buffer: Buffer.alloc(0),
      status: 416,
      rangeSupported: true,
      totalSize,
      truncatedStream: false,
    };
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new AppwritePartialFetchError(
      errorText || `Appwrite storage download failed (${response.status})`,
      response.status
    );
  }

  if (response.status === 206) {
    const totalSize = parseContentRangeTotal(response.headers.get("content-range"));
    const { buffer, exceededCap } = await readStreamCapped(
      response.body,
      expectedMaxBytes
    );
    return {
      buffer,
      status: 206,
      rangeSupported: true,
      totalSize,
      truncatedStream:
        exceededCap ||
        (totalSize !== undefined && start + buffer.byteLength < totalSize),
    };
  }

  // Server ignored Range and returned 200 OK
  const totalSize = parseContentLength(response.headers.get("content-length"));
  if (start > 0 || !allowUnranged200ForStartZero) {
    await response.body?.cancel().catch(() => {});
    return {
      buffer: Buffer.alloc(0),
      status: 200,
      rangeSupported: false,
      totalSize,
      truncatedStream: true,
    };
  }

  const { buffer, exceededCap } = await readStreamCapped(
    response.body,
    expectedMaxBytes
  );
  return {
    buffer,
    status: 200,
    rangeSupported: false,
    totalSize,
    truncatedStream:
      exceededCap ||
      (totalSize !== undefined && buffer.byteLength < totalSize) ||
      buffer.byteLength >= expectedMaxBytes,
  };
}

export async function fetchAppwritePrefix({
  bucketFileId,
  maxBytes,
  signal,
}: {
  bucketFileId: string;
  maxBytes: number;
  signal?: AbortSignal;
}): Promise<{
  buffer: Buffer;
  totalSize?: number;
  isPartial: boolean;
  rangeSupported: boolean;
}> {
  const res = await fetchAppwriteByteRange({
    bucketFileId,
    start: 0,
    endInclusive: Math.max(0, maxBytes - 1),
    signal,
    allowUnranged200ForStartZero: true,
  });

  const isPartial =
    res.totalSize !== undefined
      ? res.buffer.byteLength < res.totalSize
      : res.truncatedStream || res.buffer.byteLength >= maxBytes;

  return {
    buffer: res.buffer,
    totalSize: res.totalSize,
    isPartial,
    rangeSupported: res.rangeSupported,
  };
}

