import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { ArrowUpDown, Download, Search, Columns3 } from "lucide-react";
import { Button } from "./ui/button";
import { csvExport } from "../engine";
import { download } from "../storage";
export function DataTable<T extends { id: string }>({
  data,
  columns,
  name,
  onBulkDelete,
}: {
  data: T[];
  columns: ColumnDef<T, any>[];
  name: string;
  onBulkDelete?: (ids: string[]) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([]),
    [search, setSearch] = useState(""),
    [visibility, setVisibility] = useState<VisibilityState>({}),
    [selection, setSelection] = useState({}),
    [showColumns, setShowColumns] = useState(false),
    [saved, setSaved] = useState<string>("");
  const table = useReactTable({
    data,
    columns: [
      {
        id: "select",
        size: 40,
        header: ({ table }) => (
          <input
            aria-label="Select all rows"
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            aria-label="Select row"
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
      },
      ...columns,
    ],
    state: {
      sorting,
      globalFilter: search,
      columnVisibility: visibility,
      rowSelection: selection,
    },
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onGlobalFilterChange: setSearch,
    onColumnVisibilityChange: setVisibility,
    onRowSelectionChange: setSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    columnResizeMode: "onChange",
  });
  return (
    <div className="table-card">
      <div className="table-tools">
        <label className="search-input">
          <Search size={16} />
          <input
            placeholder={`Search ${name.toLowerCase()}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={`Search ${name}`}
          />
        </label>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowColumns(!showColumns)}
        >
          <Columns3 size={15} />
          Columns
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            download(
              name + ".csv",
              csvExport(
                table
                  .getFilteredRowModel()
                  .rows.map((r) => r.original) as unknown as Record<
                  string,
                  unknown
                >[],
              ),
              "text/csv",
            );
          }}
        >
          <Download size={15} />
          Export
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            setSaved(JSON.stringify({ sorting, search, visibility }))
          }
        >
          Save view
        </Button>
        {saved && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const v = JSON.parse(saved);
              setSorting(v.sorting);
              setSearch(v.search);
              setVisibility(v.visibility);
            }}
          >
            Restore view
          </Button>
        )}
        {onBulkDelete && table.getSelectedRowModel().rows.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              onBulkDelete(
                table.getSelectedRowModel().rows.map((r) => r.original.id),
              );
              setSelection({});
            }}
          >
            Delete selected ({table.getSelectedRowModel().rows.length})
          </Button>
        )}
      </div>
      {showColumns && (
        <div className="column-options">
          {table
            .getAllLeafColumns()
            .filter((c) => c.id !== "select")
            .map((c) => (
              <label key={c.id}>
                <input
                  type="checkbox"
                  checked={c.getIsVisible()}
                  onChange={c.getToggleVisibilityHandler()}
                />
                {c.id}
              </label>
            ))}
        </div>
      )}
      <div className="table-scroll">
        <table style={{ minWidth: Math.min(table.getTotalSize(), 1300) }}>
          <thead>
            {table.getHeaderGroups().map((g) => (
              <tr key={g.id}>
                {g.headers.map((h) => (
                  <th
                    key={h.id}
                    style={{ width: h.getSize(), position: "relative" }}
                  >
                    <button
                      className="sort-button"
                      onClick={h.column.getToggleSortingHandler()}
                      disabled={!h.column.getCanSort()}
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {h.column.getCanSort() && <ArrowUpDown size={12} />}
                    </button>
                    <div
                      role="separator"
                      aria-label={`Resize ${h.column.id}`}
                      className="column-resizer"
                      onMouseDown={h.getResizeHandler()}
                      onTouchStart={h.getResizeHandler()}
                    />
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((r) => (
              <tr key={r.id}>
                {r.getVisibleCells().map((c) => (
                  <td key={c.id}>
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!table.getRowModel().rows.length && (
          <div className="empty">
            No records yet. Add your own evidence-backed records to begin.
          </div>
        )}
      </div>
      <div className="pagination">
        <span>
          {table.getFilteredRowModel().rows.length} records ·{" "}
          {table.getSelectedRowModel().rows.length} selected
        </span>
        <Button
          variant="ghost"
          size="sm"
          disabled={!table.getCanPreviousPage()}
          onClick={() => table.previousPage()}
        >
          Previous
        </Button>
        <span>Page {table.getState().pagination.pageIndex + 1}</span>
        <Button
          variant="ghost"
          size="sm"
          disabled={!table.getCanNextPage()}
          onClick={() => table.nextPage()}
        >
          Next
        </Button>
        <select
          aria-label="Rows per page"
          value={table.getState().pagination.pageSize}
          onChange={(e) => table.setPageSize(Number(e.target.value))}
        >
          {[10, 25, 50].map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
