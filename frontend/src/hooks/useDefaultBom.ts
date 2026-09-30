import { useFrappeGetDocList } from 'frappe-react-sdk';

interface BOMRecord {
  name: string;
  item: string;
  is_default: number;
  is_active: number;
  docstatus: number;
}

/**
 * Given a production_item, returns the default BOM and the list of all
 * active submitted BOMs for that item (for the override dropdown).
 */
export function useDefaultBom(itemCode: string | undefined) {
  const { data, isLoading, error } = useFrappeGetDocList<BOMRecord>('BOM', {
    fields: ['name', 'item', 'is_default'],
    filters: [
      ['item', '=', itemCode ?? ''],
      ['docstatus', '=', 1],
      ['is_active', '=', 1],
    ],
    limit: 50,
    orderBy: { field: 'is_default', order: 'desc' },
    // Only run when itemCode is set
  });

  const defaultBom = data?.find((b) => b.is_default === 1)?.name ?? data?.[0]?.name ?? '';

  return { data: data ?? [], defaultBom, isLoading, error };
}
