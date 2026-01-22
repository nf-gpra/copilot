import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Check file type - only support Excel files for now
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "text/csv", // .csv
    ];

    if (
      !allowedTypes.includes(file.type) &&
      !file.name.match(/\.(xlsx|xls|csv)$/i)
    ) {
      return NextResponse.json(
        { error: "Only Excel files (.xlsx, .xls) and CSV files are supported" },
        { status: 400 }
      );
    }

    // Read file buffer
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });

    // Process all sheets
    const sheetsData: Record<string, unknown[]> = {};
    let totalRows = 0;

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      sheetsData[sheetName] = jsonData;
      totalRows += jsonData.length;
    }

    // Generate a summary for the LLM
    const summary = generateExcelSummary(file.name, sheetsData);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      sheets: Object.keys(sheetsData),
      totalRows,
      data: sheetsData,
      summary,
    });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: "Failed to process file" },
      { status: 500 }
    );
  }
}

function generateExcelSummary(
  fileName: string,
  sheetsData: Record<string, unknown[]>
): string {
  const sheetNames = Object.keys(sheetsData);
  let summary = `## File Attachment: ${fileName}\n\n`;
  summary += `**Sheets:** ${sheetNames.length}\n\n`;

  for (const [sheetName, rows] of Object.entries(sheetsData)) {
    const data = rows as Record<string, unknown>[];
    summary += `### Sheet: ${sheetName}\n`;
    summary += `- **Rows:** ${data.length}\n`;

    if (data.length > 0) {
      const columns = Object.keys(data[0]);
      summary += `- **Columns:** ${columns.join(", ")}\n`;

      // Show first few rows as markdown table
      const maxPreviewRows = Math.min(5, data.length);
      summary += `\n**Preview (first ${maxPreviewRows} rows):**\n\n`;

      // Table header
      summary += `| ${columns.join(" | ")} |\n`;
      summary += `| ${columns.map(() => "---").join(" | ")} |\n`;

      // Table rows
      for (let i = 0; i < maxPreviewRows; i++) {
        const row = data[i];
        const values = columns.map((col) => {
          const val = row[col];
          // Truncate long values
          const strVal = String(val ?? "");
          return strVal.length > 50 ? strVal.substring(0, 47) + "..." : strVal;
        });
        summary += `| ${values.join(" | ")} |\n`;
      }

      if (data.length > maxPreviewRows) {
        summary += `\n*... and ${data.length - maxPreviewRows} more rows*\n`;
      }
    }
    summary += "\n";
  }

  return summary;
}
