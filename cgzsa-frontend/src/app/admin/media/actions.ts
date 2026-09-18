"use server";

import {
  softDeleteAsset as softDeleteAssetImpl,
  restoreAsset as restoreAssetImpl,
  purgeAsset as purgeAssetImpl,
  purgeExpiredAssets as purgeExpiredAssetsImpl,
} from "@/actions/admin/media";

export async function softDeleteAsset(...args: Parameters<typeof softDeleteAssetImpl>) {
  return softDeleteAssetImpl(...args);
}

export async function restoreAsset(...args: Parameters<typeof restoreAssetImpl>) {
  return restoreAssetImpl(...args);
}

export async function purgeAsset(...args: Parameters<typeof purgeAssetImpl>) {
  return purgeAssetImpl(...args);
}

export async function purgeExpiredAssets(...args: Parameters<typeof purgeExpiredAssetsImpl>) {
  return purgeExpiredAssetsImpl(...args);
}
