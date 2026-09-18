"use server";

import {
  saveArticle as saveArticleImpl,
  ensureCategory as ensureCategoryImpl,
  restoreArticleRevision as restoreArticleRevisionImpl,
} from "@/actions/admin/news";

export async function saveArticle(...args: Parameters<typeof saveArticleImpl>) {
  return saveArticleImpl(...args);
}

export async function ensureCategory(...args: Parameters<typeof ensureCategoryImpl>) {
  return ensureCategoryImpl(...args);
}

export async function restoreArticleRevision(...args: Parameters<typeof restoreArticleRevisionImpl>) {
  return restoreArticleRevisionImpl(...args);
}
