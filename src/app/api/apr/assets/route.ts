import { ok } from '@/lib/api/response';
import { getAssetList } from '@/services/AprService';

export async function GET() {
  const assets = await getAssetList();
  return ok(assets);
}
