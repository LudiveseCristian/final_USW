import { X } from "lucide-react";
import * as XLSX from "xlsx";
import { useState } from "react";

const ExportModal = ({ show, onClose, data }) => {
  const [selectedFormat, setSelectedFormat] = useState("");

  if (!show) return null;

  const exportData = () => {
    if (!data || data.length === 0) {
      alert("No data to export.");
      return;
    }

    if (selectedFormat === "excel") {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
      XLSX.writeFile(workbook, "orders.xlsx");
    } else if (selectedFormat === "print") {
      const printContent = `
        <html>
          <head>
            <title>Orders Report</title>
            <style>
              body { font-family: sans-serif; margin: 0; padding: 20px; color: #333; }
              h2 { color: #135918; }
              table { border-collapse: collapse; width: 100%; margin-top: 20px; }
              th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
              th { background-color: #f2f2f2; font-weight: 600; }
            </style>
          </head>
          <body>
            <h2>Orders Report</h2>
            <table>
              <thead>
                <tr>${Object.keys(data[0])
                  .map((key) => `<th>${key}</th>`)
                  .join("")}</tr>
              </thead>
              <tbody>
                ${data
                  .map(
                    (row) =>
                      `<tr>${Object.values(row)
                        .map((val) => `<td>${val}</td>`)
                        .join("")}</tr>`
                  )
                  .join("")}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const printWindow = window.open("", "_blank", "height=600,width=800");
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-60 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-md mx-4 shadow-2xl p-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-gray-200 mb-6">
          <h3 className="text-2xl font-bold text-gray-800">Export Your Data</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <p className="text-sm text-gray-600 mb-6">
          Choose your preferred format and click 'Export' to download your data.
        </p>

        <div className="space-y-4 mb-8">
          <div className="flex flex-col space-y-1">
            <label htmlFor="export-format" className="text-sm font-medium text-gray-700">
              Select Export Format
            </label>
            <select
              id="export-format"
              className="w-full bg-white text-gray-800 border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
            >
              <option value="">-- Please Select --</option>
              <option value="excel">Excel (.xlsx)</option>
              <option value="print">Printable Format</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 rounded-xl font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={exportData}
            disabled={!selectedFormat}
            className={`flex-1 px-6 py-3 rounded-xl font-semibold text-white transition-colors
              ${selectedFormat ? "bg-green-600 hover:bg-green-700" : "bg-gray-400 cursor-not-allowed"}
            `}
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;