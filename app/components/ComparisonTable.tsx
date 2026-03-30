import React from "react";
import type { ComparisonTableData } from "../types";

interface ComparisonTableProps {
  tableData?: ComparisonTableData | null;
}

const ComparisonTable: React.FC<ComparisonTableProps> = ({ tableData }) => {
  if (
    !tableData ||
    !Array.isArray(tableData.headers) ||
    !Array.isArray(tableData.rows)
  ) {
    return null;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-brand-sand/40">
            {tableData.headers.map((header, i) => (
              <th
                key={i}
                className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-brand-stone/60 bg-brand-parchment/50"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableData.rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="border-b border-brand-sand/20 last:border-0 hover:bg-brand-parchment/30 transition-colors"
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={`px-5 py-3 text-sm ${
                    cellIndex === 0
                      ? "font-medium text-brand-charcoal"
                      : "text-brand-stone"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ComparisonTable;
