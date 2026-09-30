import { useFrappeGetDocList } from 'frappe-react-sdk';

interface Warehouse {
  name: string;
  warehouse_name: string;
}

/**
 * Returns all leaf (non-group) enabled warehouses.
 * Used to populate warehouse dropdowns in the Work Order creation modal.
 */
export function useWarehouses() {
  const { data, isLoading, error } = useFrappeGetDocList<Warehouse>('Warehouse', {
    fields: ['name', 'warehouse_name'],
    filters: [
      ['is_group', '=', 0],
      ['disabled', '=', 0],
    ],
    limit: 200,
    orderBy: { field: 'name', order: 'asc' },
  });

  return { data: data ?? [], isLoading, error };
}

/**
 * Check if a specific warehouse name exists in the list.
 */
export function findWarehouse(
  warehouses: Warehouse[],
  preferred: string,
): string {
  const found = warehouses.find(
    (w) => w.name === preferred || w.warehouse_name === preferred,
  );
  return found?.name ?? '';
}
