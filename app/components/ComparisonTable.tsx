import React from "react";
import type { ComparisonTableData } from "../types";

interface ComparisonTableProps {
  tableData: ComparisonTableData;
}

const ComparisonTable: React.FC<ComparisonTableProps> = ({ tableData }) => {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-stone-200 bg-white">
      <table className="min-w-full">
        <thead className="bg-stone-50">
          <tr>
            {tableData.headers.map((header, index) => (
              <th
                key={index}
                className="px-4 py-3 text-left text-sm font-semibold text-stone-600 tracking-wider border-b border-stone-200"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-200">
          {tableData.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={`px-4 py-3 text-sm ${
                    cellIndex === 0
                      ? "font-medium text-stone-800"
                      : "text-stone-600"
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
