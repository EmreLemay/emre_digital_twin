-- CreateTable
CREATE TABLE "excel_files" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT
);

-- CreateTable
CREATE TABLE "worksheets" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "excelFileId" INTEGER NOT NULL,
    "sheetName" TEXT NOT NULL,
    "sheetIndex" INTEGER NOT NULL,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "columnCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "worksheets_excelFileId_fkey" FOREIGN KEY ("excelFileId") REFERENCES "excel_files" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "excel_rows" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "worksheetId" INTEGER NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "excel_rows_worksheetId_fkey" FOREIGN KEY ("worksheetId") REFERENCES "worksheets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "excel_data" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fileId" INTEGER NOT NULL,
    "sheetName" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "columnName" TEXT NOT NULL,
    "columnIndex" INTEGER NOT NULL,
    "value" TEXT,
    "dataType" TEXT NOT NULL DEFAULT 'TEXT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "excel_data_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "excel_files" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "excel_data_fileId_sheetName_idx" ON "excel_data"("fileId", "sheetName");

-- CreateIndex
CREATE INDEX "excel_data_fileId_rowIndex_idx" ON "excel_data"("fileId", "rowIndex");
