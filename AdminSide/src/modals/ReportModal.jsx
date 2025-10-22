import { X } from "lucide-react";
import * as XLSX from "xlsx";
import { useState } from "react";

const ReportModal = ({ show, onClose, data }) => {
  const [reportType, setReportType] = useState("Monthly Sales Report");
  const [includeCharts, setIncludeCharts] = useState(false);
  const [exportFormat, setExportFormat] = useState("");

  if (!show) return null;

  // Generate Excel report
  const generateExcelReport = () => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    const fileName = `${reportType.replace(/\s+/g, "_")}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Print report
  const printReport = () => {
    const printContent = `
      <html>
        <head>
          <title>${reportType}</title>
          <style>
            body { font-family: sans-serif; }
            h2 { color: #135918; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h2>${reportType}</h2>
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

    const printWindow = window.open("", "", "height=600,width=800");
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const handleGenerate = () => {
    if (exportFormat === "excel") {
      generateExcelReport();
    } else if (exportFormat === "print") {
      printReport();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#f5f5dc] rounded-lg p-6 w-96 max-w-md mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[#135918]">
            Generate Report
          </h3>
          <button
            onClick={onClose}
            className="text-[#135918] hover:text-[#0a380c] transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Customize and generate a report from your data.
        </p>

        <div className="space-y-4 mb-6">
          {/* Report Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Type
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#135918]"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option>Monthly Sales Report</option>
              <option>Quarterly Performance</option>
              <option>Annual Summary</option>
              <option>Custom Period</option>
            </select>
          </div>

          {/* Export Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export Format
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#135918]"
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
            >
              <option value="">-- Select Format --</option>
              <option value="excel">Excel (.xlsx)</option>
              <option value="print">Printable format</option>
            </select>
          </div>

          {/* Charts */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                className="mr-2 rounded text-[#135918] focus:ring-[#135918]"
                checked={includeCharts}
                onChange={(e) => setIncludeCharts(e.target.checked)}
              />
              Include Charts
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={!exportFormat}
            className={`flex-1 px-4 py-2 rounded-lg text-white font-semibold transition-colors
              ${exportFormat ? "bg-[#135918] hover:bg-[#0a380c]" : "bg-gray-400 cursor-not-allowed"}
            `}
          >
            Generate Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;