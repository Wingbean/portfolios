// ✅ ดึง HTML ย่อยมาแสดงใน index.html
function doGet() {
  return HtmlService.createTemplateFromFile('index').evaluate();
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ✅ ฟังก์ชันบันทึกข้อมูลวันลา
function saveLeaveData(data) {
  Logger.log(JSON.stringify(data)); // เพิ่มบรรทัดนี้
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("LeaveData");
  sheet.appendRow([new Date(), data.name, data.leaveType, data.startDate, data.endDate]);
}

// ✅ ดึงข้อมูลทั้งหมดเพื่อแสดงในตาราง
function getLeaveData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    Logger.log("Active Spreadsheet Name: " + ss.getName());
    
    // ตรวจสอบและแสดงรายชื่อ sheets ทั้งหมด
    const allSheets = ss.getSheets();
    Logger.log("All sheets in this spreadsheet:");
    allSheets.forEach(s => Logger.log("- " + s.getName()));
    
    const sheet = ss.getSheetByName("LeaveData");
    if (!sheet) {
      Logger.log("Error: Sheet 'LeaveData' not found!");
      return null;
    }
    
    Logger.log("Sheet 'LeaveData' found. Attempting to get data...");
    Logger.log("Sheet dimensions: " + sheet.getMaxRows() + " rows x " + sheet.getMaxColumns() + " columns");
    
    // ตรวจสอบว่า sheet มีข้อมูลหรือไม่
    if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
      Logger.log("Sheet is empty!");
      return [];
    }
    
    // ใช้ getRange แบบชัดเจน
    const dataRange = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn());
    Logger.log("Data Range: " + dataRange.getA1Notation());
    
    const data = dataRange.getValues();
    
    // Log ตัวอย่างข้อมูลแถวแรก (ถ้ามี)
    if (data.length > 0) {
      Logger.log("First row sample: " + JSON.stringify(data[0]));
      Logger.log("Total rows: " + data.length);
    }
    
    return data;
  } catch (error) {
    Logger.log("Error in getLeaveData: " + error.toString());
    return null;
  }
}

// ฟังก์ชันทดสอบสำหรับ client-side
function getLeaveDataForClient() {
  try {
    const data = getLeaveData();
    
    // ตรวจสอบและแปลงวันที่เป็น string ก่อนส่งกลับ
    if (Array.isArray(data)) {
      const processedData = data.map(row => {
        if (Array.isArray(row)) {
          return row.map(cell => {
            // ถ้าเป็น Date แปลงเป็น string ในรูปแบบที่ client เข้าใจได้
            if (cell instanceof Date) {
              return cell.toISOString();
            }
            // ตรวจสอบว่าเป็นข้อมูลที่ส่งกลับได้
            if (cell === null || cell === undefined) {
              return "";
            }
            return cell;
          });
        }
        return row;
      });
      
      return processedData;
    }
    
    return data;
  } catch (error) {
    Logger.log("Error in getLeaveDataForClient: " + error);
    return {error: error.toString()};
  }
}

// ✅ ดึงข้อมูลสำหรับสร้างปฏิทิน
function getCalendarData(month) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("LeaveData");
  const data = sheet.getDataRange().getValues();
  const result = {};

  const year = new Date().getFullYear();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 1; i <= daysInMonth; i++) {
    result[i] = [];
  }

  for (let i = 1; i < data.length; i++) {
    const [timestamp, name, leaveType, startDate, endDate] = data[i];
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start.getMonth() === month || end.getMonth() === month) {
      let current = new Date(start);
      while (current <= end) {
        if (current.getMonth() === month) {
          const day = current.getDate();
          if (!result[day].includes(name)) {
            result[day].push(name);
          }
        }
        current.setDate(current.getDate() + 1);
      }
    }
  }

  return result;
}

// ✅ ลบวันลา
function deleteLeaveData(timestampToDelete) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("LeaveData");
    if (!sheet) {
      Logger.log("Error: Sheet 'LeaveData' not found!");
      return;
    }

    const data = sheet.getDataRange().getValues();
    let rowToDelete = -1;

    // ค้นหาแถวที่ต้องการลบโดยเทียบจาก Timestamp (แปลงทั้งสองค่าเป็น ISO String)
    for (let i = 1; i < data.length; i++) { // เริ่มจากแถวที่ 1 เพื่อข้าม Header
      const sheetTimestamp = data[i][0] instanceof Date ? data[i][0].toISOString() : String(data[i][0]);
      if (sheetTimestamp === timestampToDelete) {
        rowToDelete = i + 1; // Apps Script นับแถวเริ่มจาก 1
        break;
      }
    }

    if (rowToDelete > 0) {
      sheet.deleteRow(rowToDelete);
      Logger.log(`ลบแถวที่ ${rowToDelete} ที่มี Timestamp: ${timestampToDelete} แล้ว`);
    } else {
      Logger.log(`ไม่พบรายการที่มี Timestamp: ${timestampToDelete}`);
    }
  } catch (error) {
    Logger.log(`เกิดข้อผิดพลาดในการลบข้อมูล: ${error}`);
  }
}
