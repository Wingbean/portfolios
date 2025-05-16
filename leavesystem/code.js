// ✅ ดึง HTML ย่อยมาแสดงใน index.html

function doGet() {
  return HtmlService.createTemplateFromFile('index').evaluate();
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ✅ ฟังก์ชันบันทึกข้อมูลวันลา
function saveLeaveData(data) {
  try {
    Logger.log(JSON.stringify(data));
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("LeaveData");
    if (!sheet) { // เพิ่มการตรวจสอบ Sheet
      Logger.log("Sheet 'LeaveData' not found!");
      throw new Error("Sheet 'LeaveData' not found!"); // โยน Error เพื่อให้รู้ว่า Sheet ไม่มี
    }
    const timestamp = new Date(); // สร้าง Timestamp
    sheet.appendRow([timestamp, data.name, data.leaveType, data.startDate, data.endDate, data.note]); // เพิ่ม data.note ในคอลัมน์สุดท้าย
  } catch (error) {
    Logger.log("Error in saveLeaveData: " + error.message);
    throw error; // โยน error ต่อเพื่อให้ client รู้
  }
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
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("LeaveData");
    if (!sheet) {
      Logger.log("Sheet 'LeaveData' not found!");
      return {};
    }

    const data = sheet.getDataRange().getValues();
    const calendarData = {};

    // เริ่มต้นที่แถวที่ 2 เพื่อข้ามหัวตาราง
    for (let i = 1; i < data.length; i++) {
      const startDate = new Date(data[i][3]); // คอลัมน์ "เริ่ม"
      const endDate = new Date(data[i][4]);   // คอลัมน์ "ถึง"
      const name = data[i][1];             // คอลัมน์ "ชื่อ"
      const leaveType = data[i][2];        // คอลัมน์ "ประเภท"

      // วนลูปผ่านวันที่ลา
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        if (currentDate.getMonth() === month) {
          const day = currentDate.getDate();
          if (!calendarData[day]) {
            calendarData[day] = [];
          }
          calendarData[day].push({ name: name, type: leaveType });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    return calendarData;
  } catch (error) {
    Logger.log("Error in getCalendarData: " + error);
    return {};
  }
}

// ✅ ลบข้อมูลวันลา โดยตรวจสอบ Code
function deleteLeaveDataWithCode(timestampToDelete, enteredCode) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("LeaveData");
    if (!sheet) {
      Logger.log("Error: Sheet 'LeaveData' not found!");
      return "error: Sheet not found";
    }

    const data = sheet.getDataRange().getValues();
    let rowToDelete = -1;
    let storedCode = "";

    // ค้นหาแถวที่ต้องการลบโดยเทียบจาก Timestamp (แปลงทั้งสองค่าเป็น ISO String)
    for (let i = 1; i < data.length; i++) {
      const sheetTimestamp = data[i][0] instanceof Date ? data[i][0].toISOString() : String(data[i][0]);
      if (sheetTimestamp === timestampToDelete) {
        rowToDelete = i + 1;
        storedCode = String(data[i][6]).trim(); // ดึง Code จาก Index 6 และแปลงเป็น String พร้อมตัดช่องว่าง
        break;
      }
    }

    if (rowToDelete > 0) {
      if (String(enteredCode).trim() === storedCode) { // แปลง Code ที่ป้อนเป็น String พร้อมตัดช่องว่างก่อนเปรียบเทียบ
        sheet.deleteRow(rowToDelete);
        Logger.log(`ลบแถวที่ ${rowToDelete} ที่มี Timestamp: ${timestampToDelete} และ Code: ${storedCode} แล้ว`);
        return "success";
      } else {
        Logger.log(`Code ไม่ถูกต้องสำหรับการลบแถวที่ Timestamp: ${timestampToDelete}. Code ที่ป้อน: ${enteredCode}, Code ที่ถูกต้อง: ${storedCode}`);
        return "error: Invalid code";
      }
    } else {
      Logger.log(`ไม่พบรายการที่มี Timestamp: ${timestampToDelete}`);
      return "error: Timestamp not found";
    }
  } catch (error) {
    Logger.log(`เกิดข้อผิดพลาดในการลบข้อมูล: ${error}`);
    return "error: " + error.message;
  }
}

/*
//✅ ลบข้อมูลวันลา (ทุกคนสามารถลบได้)
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
    for (let i = 1; i < data.length; i++) {
      const sheetTimestamp = data[i][0] instanceof Date ? data[i][0].toISOString() : String(data[i][0]);
      if (sheetTimestamp === timestampToDelete) {
        rowToDelete = i + 1;
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
    throw error;
  }
}
*/
