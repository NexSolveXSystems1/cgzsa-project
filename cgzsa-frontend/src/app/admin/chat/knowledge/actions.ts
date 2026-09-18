"use server";

import {
  reindex as reindexImpl,
  answerGap as answerGapImpl,
  ignoreGap as ignoreGapImpl,
} from "@/actions/admin/chat/knowledge";

export async function reindex(...args: Parameters<typeof reindexImpl>) {
  return reindexImpl(...args);
}

export async function answerGap(...args: Parameters<typeof answerGapImpl>) {
  return answerGapImpl(...args);
}

export async function ignoreGap(...args: Parameters<typeof ignoreGapImpl>) {
  return ignoreGapImpl(...args);
}
