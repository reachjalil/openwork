import type { UIMessage } from "ai";

const mergedMessageCache = new WeakMap<UIMessage, WeakMap<UIMessage, UIMessage>>();
const messageSignatureCache = new WeakMap<UIMessage, string>();

function messageSignature(message: UIMessage) {
  const cached = messageSignatureCache.get(message);
  if (cached) return cached;
  const signature = JSON.stringify(message);
  messageSignatureCache.set(message, signature);
  return signature;
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
      return { ...part, text: cachedPart.text };
    }

    return part;
  });

  if (cachedMessage.parts.length > snapshotMessage.parts.length) {
    parts.push(...cachedMessage.parts.slice(snapshotMessage.parts.length));
  }

  return parts;
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
  const result = messageSignature(merged) === messageSignature(cachedMessage)
    ? cachedMessage
    : merged;
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

function insertMessageByChronology(messages: UIMessage[], message: UIMessage, sourceOrder: UIMessage[]) {
  const created = messageCreated(message);
  if (created !== null) {
    const timestampIndex = messages.findIndex((existing) => {
      const existingCreated = messageCreated(existing);
      return existingCreated !== null && existingCreated > created;
    });
    if (timestampIndex !== -1) {
      messages.splice(timestampIndex, 0, message);
      return;
    }
  }

  const sourceIndex = sourceOrder.findIndex((item) => item.id === message.id);
  if (sourceIndex !== -1) {
    for (let index = sourceIndex + 1; index < sourceOrder.length; index += 1) {
      const nextIndex = messages.findIndex((item) => item.id === sourceOrder[index]?.id);
      if (nextIndex !== -1) {
        messages.splice(nextIndex, 0, message);
        return;
      }
    }

    for (let index = sourceIndex - 1; index >= 0; index -= 1) {
      const previousIndex = messages.findIndex((item) => item.id === sourceOrder[index]?.id);
      if (previousIndex !== -1) {
        messages.splice(previousIndex + 1, 0, message);
        return;
      }
    }
  }

  messages.push(message);
}

function sortFullyTimestampedMessages(messages: UIMessage[]) {
  const withCreated = messages.map((message, index) => ({ message, index, created: messageCreated(message) }));
  if (withCreated.some((item) => item.created === null)) return messages;

  const sorted = withCreated
    .sort((a, b) => (a.created ?? 0) - (b.created ?? 0) || a.index - b.index)
    .map((item) => item.message);
  return sorted.every((message, index) => message === messages[index]) ? messages : sorted;
}

function appendMessagesByChronology(messages: UIMessage[], additions: UIMessage[], sourceOrder: UIMessage[]) {
  if (additions.length === 0) return sortFullyTimestampedMessages(messages);

  const combined = [...messages, ...additions];
  const created = combined.map(messageCreated);
  if (
    created.every((value) => value !== null) &&
    new Set(created).size === created.length
  ) {
    // Current OpenCode messages normally carry a creation time. Batch the tail
    // merge and sort once instead of repeatedly scanning and splicing a
    // growing transcript for every cached-only message.
    return sortFullyTimestampedMessages(combined);
  }

  // Older OpenCode shapes can omit timestamps, and millisecond timestamps can
  // collide. Keep the source-order fallback for ambiguous snapshots so
  // reconnect remains lossless across engine versions.
  const merged = messages.slice();
  for (const addition of additions) insertMessageByChronology(merged, addition, sourceOrder);
  return sortFullyTimestampedMessages(merged);
}

function reuseMatchingMessageList(messages: UIMessage[], candidates: UIMessage[][]) {
  for (const candidate of candidates) {
    if (
      candidate.length === messages.length &&
      candidate.every((message, index) => message === messages[index])
    ) {
      return candidate;
    }
  }
  return messages;
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

  const liveById = new Map(liveMessages.map((message) => [message.id, message]));
  const snapshotIds = new Set(snapshotMessages.map((message) => message.id));
  const merged = snapshotMessages.map((snapshotMessage) => {
    const liveMessage = liveById.get(snapshotMessage.id);
    return liveMessage ? mergeSnapshotMessageWithCached(snapshotMessage, liveMessage) : snapshotMessage;
  });

  let ordered = merged;
  if (options.appendLiveOnlyMessages) {
    const liveOnly = liveMessages.filter((message) => !snapshotIds.has(message.id));
    ordered = appendMessagesByChronology(merged, liveOnly, liveMessages);
  } else {
    ordered = sortFullyTimestampedMessages(merged);
  }

  return reuseMatchingMessageList(ordered, [liveMessages, snapshotMessages]);
}

export function mergeSnapshotIntoCachedMessages(snapshotMessages: UIMessage[], cachedMessages: UIMessage[]) {
  if (snapshotMessages.length === 0) return cachedMessages;
  if (cachedMessages.length === 0) return snapshotMessages;

  const cachedById = new Map(cachedMessages.map((message) => [message.id, message]));
  const seen = new Set<string>();
  const merged = snapshotMessages.map((message) => {
    seen.add(message.id);
    const cachedMessage = cachedById.get(message.id);
    return cachedMessage
      ? mergeSnapshotMessageWithCached(message, cachedMessage)
      : message;
  });

  const cachedOnly = cachedMessages.filter((message) => !seen.has(message.id));
  const ordered = appendMessagesByChronology(merged, cachedOnly, cachedMessages);

  // Returning the canonical array on an unchanged rehydrate prevents a
  // no-op React Query cache write from notifying every transcript observer.
  return reuseMatchingMessageList(ordered, [cachedMessages, snapshotMessages]);
}
