import type { UIMessage } from "ai";

const mergedMessageCache = new WeakMap<UIMessage, WeakMap<UIMessage, UIMessage>>();
const structuralSignatureCache = new WeakMap<object, string>();
const snapshotLiveListCache = new WeakMap<UIMessage[], WeakMap<UIMessage[], Map<boolean, UIMessage[]>>>();
const snapshotCachedListCache = new WeakMap<UIMessage[], WeakMap<UIMessage[], UIMessage[]>>();

function structuralSignature(value: object) {
  const cached = structuralSignatureCache.get(value);
  if (cached !== undefined) return cached;
  const signature = JSON.stringify(value);
  structuralSignatureCache.set(value, signature);
  return signature;
}

function structurallyEqual(left: object, right: object) {
  return left === right || structuralSignature(left) === structuralSignature(right);
}

function reuseEquivalentParts(parts: UIMessage["parts"], cachedParts: UIMessage["parts"]) {
  const reused = parts.map((part, index) => {
    const cachedPart = cachedParts[index];
    return cachedPart && structurallyEqual(part, cachedPart) ? cachedPart : part;
  });
  if (reused.length === cachedParts.length && reused.every((part, index) => part === cachedParts[index])) {
    return cachedParts;
  }
  return reused;
}

function mergeMessageParts(snapshotMessage: UIMessage, cachedMessage: UIMessage) {
  const parts = snapshotMessage.parts.map((part, index) => {
    const cachedPart = cachedMessage.parts[index];
    if (!cachedPart) return part;

    if (
      (part.type === "text" || part.type === "reasoning") &&
      cachedPart.type === part.type &&
      cachedPart.text.length > part.text.length
    ) {
      const mergedPart = { ...part, text: cachedPart.text };
      return structurallyEqual(mergedPart, cachedPart) ? cachedPart : mergedPart;
    }

    return structurallyEqual(part, cachedPart) ? cachedPart : part;
  });

  if (cachedMessage.parts.length > snapshotMessage.parts.length) {
    parts.push(...cachedMessage.parts.slice(snapshotMessage.parts.length));
  }

  return reuseEquivalentParts(parts, cachedMessage.parts);
}

function mergeSnapshotMessageWithCached(snapshotMessage: UIMessage, cachedMessage: UIMessage): UIMessage {
  const cachedMerges = mergedMessageCache.get(snapshotMessage);
  const cachedMerge = cachedMerges?.get(cachedMessage);
  if (cachedMerge) return cachedMerge;

  const metadata = snapshotMessage.metadata ?? cachedMessage.metadata;
  const merged: UIMessage = {
    ...snapshotMessage,
    ...(metadata === undefined ? {} : { metadata }),
    parts: mergeMessageParts(snapshotMessage, cachedMessage),
  };
  const result = structurallyEqual(merged, cachedMessage) ? cachedMessage : merged;
  if (cachedMerges) {
    cachedMerges.set(cachedMessage, result);
  } else {
    mergedMessageCache.set(snapshotMessage, new WeakMap([[cachedMessage, result]]));
  }
  return result;
}

function messageCreated(message: UIMessage) {
  const metadata = message.metadata;
  if (!metadata || typeof metadata !== "object" || !("opencode" in metadata)) return null;

  const opencode = metadata.opencode;
  if (!opencode || typeof opencode !== "object" || !("created" in opencode)) return null;

  const created = opencode.created;
  return typeof created === "number" ? created : null;
}

function uniqueMessages(messages: UIMessage[]) {
  const ordered: UIMessage[] = [];
  const indexById = new Map<string, number>();
  for (const message of messages) {
    const knownIndex = indexById.get(message.id);
    if (knownIndex === undefined) {
      indexById.set(message.id, ordered.length);
      ordered.push(message);
    } else {
      // Preserve the first source position while accepting the newest payload.
      ordered[knownIndex] = message;
    }
  }
  return { ordered, indexById };
}

function timestampIndex(primary: UIMessage[]) {
  const entries: Array<{ created: number; index: number }> = [];
  for (let index = 0; index < primary.length; index += 1) {
    const message = primary[index];
    if (!message) continue;
    const created = messageCreated(message);
    if (created !== null) entries.push({ created, index });
  }
  entries.sort((left, right) => left.created - right.created || left.index - right.index);

  const minimumIndexes = new Array<number>(entries.length);
  let minimumIndex = Number.POSITIVE_INFINITY;
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (!entry) continue;
    minimumIndex = Math.min(minimumIndex, entry.index);
    minimumIndexes[index] = minimumIndex;
  }

  return (created: number) => {
    let low = 0;
    let high = entries.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      const entry = entries[middle];
      if (entry && entry.created <= created) low = middle + 1;
      else high = middle;
    }
    return minimumIndexes[low];
  };
}

function pushBucket(buckets: Map<number, UIMessage[]>, index: number, message: UIMessage) {
  const bucket = buckets.get(index);
  if (bucket) bucket.push(message);
  else buckets.set(index, [message]);
}

/**
 * Place secondary-only messages in one batched pass. Timestamped messages keep
 * the chronology rule; messages without a usable timestamp keep their source
 * neighbors. This replaces repeated full-list searches and array splices.
 */
function mergeSecondaryOnlyMessages(
  primary: UIMessage[],
  secondary: UIMessage[],
  primaryIndexById: Map<string, number>,
) {
  const extras = secondary.filter((message) => !primaryIndexById.has(message.id));
  if (extras.length === 0) return primary;

  const nextPrimaryIndex = new Array<number | undefined>(secondary.length);
  let nextIndex: number | undefined;
  for (let index = secondary.length - 1; index >= 0; index -= 1) {
    const message = secondary[index];
    const primaryIndex = message ? primaryIndexById.get(message.id) : undefined;
    if (primaryIndex !== undefined) nextIndex = primaryIndex;
    nextPrimaryIndex[index] = nextIndex;
  }

  const firstAfterTimestamp = timestampIndex(primary);
  const before = new Map<number, UIMessage[]>();
  const after = new Map<number, UIMessage[]>();
  const tail: UIMessage[] = [];
  let previousPrimaryIndex: number | undefined;

  for (let index = 0; index < secondary.length; index += 1) {
    const message = secondary[index];
    if (!message) continue;
    const primaryIndex = primaryIndexById.get(message.id);
    if (primaryIndex !== undefined) {
      previousPrimaryIndex = primaryIndex;
      continue;
    }

    const created = messageCreated(message);
    const chronologicalIndex = created === null ? undefined : firstAfterTimestamp(created);
    const followingPrimaryIndex = nextPrimaryIndex[index];
    if (chronologicalIndex !== undefined) pushBucket(before, chronologicalIndex, message);
    else if (followingPrimaryIndex !== undefined) pushBucket(before, followingPrimaryIndex, message);
    else if (previousPrimaryIndex !== undefined) pushBucket(after, previousPrimaryIndex, message);
    else tail.push(message);
  }

  const merged: UIMessage[] = [];
  for (let index = 0; index < primary.length; index += 1) {
    const message = primary[index];
    if (!message) continue;
    const beforeMessages = before.get(index);
    if (beforeMessages) merged.push(...beforeMessages);
    merged.push(message);
    const afterMessages = after.get(index);
    if (afterMessages) merged.push(...afterMessages);
  }
  merged.push(...tail);
  return merged;
}

function sortFullyTimestampedMessages(messages: UIMessage[]) {
  const created = messages.map(messageCreated);
  if (created.some((value) => value === null)) return messages;

  let ordered = true;
  for (let index = 1; index < created.length; index += 1) {
    const previous = created[index - 1];
    const current = created[index];
    if (previous !== null && current !== null && previous > current) {
      ordered = false;
      break;
    }
  }
  if (ordered) return messages;

  return messages
    .map((message, index) => ({ message, index, created: created[index] ?? 0 }))
    .sort((left, right) => left.created - right.created || left.index - right.index)
    .map((item) => item.message);
}

function reuseArray(candidate: UIMessage[], preferred: UIMessage[]) {
  return candidate.length === preferred.length && candidate.every((message, index) => message === preferred[index])
    ? preferred
    : candidate;
}

export function messageListContainsAll(container: UIMessage[], required: UIMessage[]) {
  if (required.length === 0) return true;
  const ids = new Set(container.map((message) => message.id));
  return required.every((message) => ids.has(message.id));
}

export function mergeSnapshotAndLiveMessages(
  snapshotMessages: UIMessage[],
  liveMessages: UIMessage[],
  options: { appendLiveOnlyMessages?: boolean } = {},
) {
  if (snapshotMessages.length === 0) return liveMessages;
  if (liveMessages.length === 0) return snapshotMessages;

  const appendLiveOnlyMessages = options.appendLiveOnlyMessages === true;
  const cached = snapshotLiveListCache.get(snapshotMessages)?.get(liveMessages)?.get(appendLiveOnlyMessages);
  if (cached) return cached;

  const snapshot = uniqueMessages(snapshotMessages);
  const live = uniqueMessages(liveMessages);
  const merged = snapshot.ordered.map((snapshotMessage) => {
    const liveIndex = live.indexById.get(snapshotMessage.id);
    const liveMessage = liveIndex === undefined ? undefined : live.ordered[liveIndex];
    return liveMessage ? mergeSnapshotMessageWithCached(snapshotMessage, liveMessage) : snapshotMessage;
  });
  const combined = appendLiveOnlyMessages
    ? mergeSecondaryOnlyMessages(merged, live.ordered, snapshot.indexById)
    : merged;
  const result = reuseArray(sortFullyTimestampedMessages(combined), liveMessages);

  let byLive = snapshotLiveListCache.get(snapshotMessages);
  if (!byLive) {
    byLive = new WeakMap();
    snapshotLiveListCache.set(snapshotMessages, byLive);
  }
  let byOption = byLive.get(liveMessages);
  if (!byOption) {
    byOption = new Map();
    byLive.set(liveMessages, byOption);
  }
  byOption.set(appendLiveOnlyMessages, result);
  return result;
}

export function mergeSnapshotIntoCachedMessages(snapshotMessages: UIMessage[], cachedMessages: UIMessage[]) {
  if (snapshotMessages.length === 0) return cachedMessages;
  if (cachedMessages.length === 0) return snapshotMessages;

  const cachedResult = snapshotCachedListCache.get(snapshotMessages)?.get(cachedMessages);
  if (cachedResult) return cachedResult;

  const snapshot = uniqueMessages(snapshotMessages);
  const cached = uniqueMessages(cachedMessages);
  const merged = snapshot.ordered.map((snapshotMessage) => {
    const cachedIndex = cached.indexById.get(snapshotMessage.id);
    const cachedMessage = cachedIndex === undefined ? undefined : cached.ordered[cachedIndex];
    return cachedMessage ? mergeSnapshotMessageWithCached(snapshotMessage, cachedMessage) : snapshotMessage;
  });
  const combined = mergeSecondaryOnlyMessages(merged, cached.ordered, snapshot.indexById);
  const result = reuseArray(sortFullyTimestampedMessages(combined), cachedMessages);

  let byCached = snapshotCachedListCache.get(snapshotMessages);
  if (!byCached) {
    byCached = new WeakMap();
    snapshotCachedListCache.set(snapshotMessages, byCached);
  }
  byCached.set(cachedMessages, result);
  return result;
}
