const CONFIG = {
  SPREADSHEET_ID: '1S9l6bmPvF5zTQK-wd0LiHLgRAIUfRK5dQCu8xChTEeY',          
  DRIVE_FOLDER_ID: '1ElmbnT89YYDaj5vyhEFv2QfeyeH4r23c',        
  LINE_CHANNEL_ACCESS_TOKEN: 'LghaExfRE+RJDWreOKy0ZsFvN8MTfphQcGiAbpuWXJHmd1w1uBR4aDSlDONzN6uzNn7W1oH97HNhswtHsJw/0p8Mgp8KtN1OU2ySD/WsNXDh30sTsSxJcAbtg6n8EQNRveM/B/K/oZA8amN4KRPRJQdB04t89/1O/w1cDnyilFU=', // LINE Channel Access Token
  LINE_GROUP_ID: 'C5671020e67e4fbba221b1bbaaebb1830',             
  ADMIN_PASSWORD: 'admin1234',                    
  CONCERT_NAME: 'CONCERT 2025',                   
  BANK_ACCOUNT: '123-4-56789-0 ธนาคารกสิกรไทย ชื่อ บัญชี ทดสอบ', 
};

// ========== SHEET NAMES ==========
const SHEETS = {
  BOOKINGS: 'Bookings',
  TABLES: 'Tables',
  SETTINGS: 'Settings',
};

// ============================================================
// MAIN WEB APP HANDLER
// ============================================================
function doGet(e) {
  const page = e.parameter.page || 'booking';
  const token = e.parameter.token || '';

  if (page === 'admin') {
    return HtmlService.createHtmlOutput(getAdminPage())
      .setTitle('Admin - ' + CONFIG.CONCERT_NAME)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  return HtmlService.createHtmlOutput(getBookingPage())
    .setTitle('จองบัตร - ' + CONFIG.CONCERT_NAME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    switch (action) {
      case 'getAvailableTables': return jsonResponse(getAvailableTables());
      case 'createBooking': return jsonResponse(createBooking(data));
      case 'uploadSlip': return jsonResponse(uploadSlip(data));
      case 'adminLogin': return jsonResponse(adminLogin(data));
      case 'getBookings': return jsonResponse(getBookings(data));
      case 'updateBookingStatus': return jsonResponse(updateBookingStatus(data));
      case 'getTables': return jsonResponse(getTables(data));
      case 'addTable': return jsonResponse(addTable(data));
      case 'updateTable': return jsonResponse(updateTable(data));
      case 'deleteTable': return jsonResponse(deleteTable(data));
      case 'getSettings': return jsonResponse(getSettings(data));
      case 'updateSettings': return jsonResponse(updateSettings(data));
      case 'getStats': return jsonResponse(getStats(data));
      case 'sendMessageToCustomer': return jsonResponse(sendMessageToCustomer(data));
      default: return jsonResponse({ success: false, message: 'Unknown action' });
    }
  } catch (err) {
    return jsonResponse({ success: false, message: err.message });
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// SPREADSHEET HELPERS
// ============================================================
function getSpreadsheet() {
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}

function getSheet(name) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    initSheet(sheet, name);
  }
  return sheet;
}

function initSheet(sheet, name) {
  if (name === SHEETS.BOOKINGS) {
    sheet.appendRow([
      'BookingID', 'ชื่อ-สกุล', 'เบอร์โทร', 'LINE ID', 'โต๊ะ/ระดับ', 'จำนวนที่นั่ง',
      'ราคารวม', 'สถานะ', 'วันที่จอง', 'URL สลิป', 'หมายเหตุ', 'LINE User ID'
    ]);
    sheet.getRange(1, 1, 1, 12).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');
  } else if (name === SHEETS.TABLES) {
    sheet.appendRow(['TableID', 'ชื่อโต๊ะ/ระดับ', 'ราคาต่อที่นั่ง', 'จำนวนที่นั่งทั้งหมด', 'ที่นั่งคงเหลือ', 'คำอธิบาย', 'สี', 'แอคทีฟ']);
    sheet.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');
    // ตัวอย่างข้อมูลโต๊ะ
    sheet.appendRow(['T001', 'VIP โต๊ะหน้า', 3500, 10, 10, 'โต๊ะ VIP แถวหน้าสุด ใกล้ Stage', '#FFD700', true]);
    sheet.appendRow(['T002', 'GOLD', 2500, 20, 20, 'โซน Gold บรรยากาศดีเยี่ยม', '#FFA500', true]);
    sheet.appendRow(['T003', 'SILVER', 1500, 30, 30, 'โซน Silver ราคาสบายกระเป๋า', '#C0C0C0', true]);
    sheet.appendRow(['T004', 'GENERAL', 800, 50, 50, 'บัตรยืนทั่วไป', '#4CAF50', true]);
  } else if (name === SHEETS.SETTINGS) {
    sheet.appendRow(['Key', 'Value']);
    sheet.appendRow(['concert_name', CONFIG.CONCERT_NAME]);
    sheet.appendRow(['concert_date', '31 ธันวาคม 2568']);
    sheet.appendRow(['concert_venue', 'กรุณาระบุสถานที่']);
    sheet.appendRow(['bank_account', CONFIG.BANK_ACCOUNT]);
  }
}

// ============================================================
// AUTH
// ============================================================
function adminLogin(data) {
  if (data.password === CONFIG.ADMIN_PASSWORD) {
    return { success: true, token: 'ADMIN_' + Session.getTemporaryActiveUserKey() };
  }
  return { success: false, message: 'รหัสผ่านไม่ถูกต้อง' };
}

function verifyAdmin(data) {
  // Simple check - in production use proper session management
  return data.token && data.token.startsWith('ADMIN_');
}

// ============================================================
// TABLES MANAGEMENT
// ============================================================
function getAvailableTables() {
  const sheet = getSheet(SHEETS.TABLES);
  const rows = sheet.getDataRange().getValues();
  const tables = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][7] === true || rows[i][7] === 'TRUE') {
      tables.push({
        id: rows[i][0],
        name: rows[i][1],
        price: rows[i][2],
        total: rows[i][3],
        available: rows[i][4],
        description: rows[i][5],
        color: rows[i][6],
      });
    }
  }
  return { success: true, tables };
}

function getTables(data) {
  if (!verifyAdmin(data)) return { success: false, message: 'Unauthorized' };
  const sheet = getSheet(SHEETS.TABLES);
  const rows = sheet.getDataRange().getValues();
  const tables = [];
  for (let i = 1; i < rows.length; i++) {
    tables.push({
      row: i + 1,
      id: rows[i][0], name: rows[i][1], price: rows[i][2],
      total: rows[i][3], available: rows[i][4], description: rows[i][5],
      color: rows[i][6], active: rows[i][7],
    });
  }
  return { success: true, tables };
}

function addTable(data) {
  if (!verifyAdmin(data)) return { success: false, message: 'Unauthorized' };
  const sheet = getSheet(SHEETS.TABLES);
  const id = 'T' + String(Date.now()).slice(-6);
  sheet.appendRow([id, data.name, data.price, data.total, data.total, data.description, data.color || '#4CAF50', true]);
  return { success: true, message: 'เพิ่มโต๊ะ/ระดับสำเร็จ', id };
}

function updateTable(data) {
  if (!verifyAdmin(data)) return { success: false, message: 'Unauthorized' };
  const sheet = getSheet(SHEETS.TABLES);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) {
      const row = i + 1;
      sheet.getRange(row, 2).setValue(data.name);
      sheet.getRange(row, 3).setValue(data.price);
      sheet.getRange(row, 4).setValue(data.total);
      sheet.getRange(row, 6).setValue(data.description);
      sheet.getRange(row, 7).setValue(data.color);
      sheet.getRange(row, 8).setValue(data.active);
      return { success: true, message: 'อัปเดตสำเร็จ' };
    }
  }
  return { success: false, message: 'ไม่พบโต๊ะ' };
}

function deleteTable(data) {
  if (!verifyAdmin(data)) return { success: false, message: 'Unauthorized' };
  const sheet = getSheet(SHEETS.TABLES);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'ลบสำเร็จ' };
    }
  }
  return { success: false, message: 'ไม่พบโต๊ะ' };
}

// ============================================================
// BOOKINGS
// ============================================================
function createBooking(data) {
  const sheet = getSheet(SHEETS.BOOKINGS);
  const tableSheet = getSheet(SHEETS.TABLES);
  const bookingId = 'BK' + new Date().getFullYear() + String(Date.now()).slice(-6);

  // Check availability
  const tableRows = tableSheet.getDataRange().getValues();
  let tableRow = -1;
  let tableName = '';
  let tablePrice = 0;
  let tableAvailable = 0;

  for (let i = 1; i < tableRows.length; i++) {
    if (tableRows[i][0] === data.tableId) {
      tableRow = i + 1;
      tableName = tableRows[i][1];
      tablePrice = tableRows[i][2];
      tableAvailable = tableRows[i][4];
      break;
    }
  }

  if (tableRow === -1) return { success: false, message: 'ไม่พบโต๊ะที่เลือก' };
  if (tableAvailable < data.seats) return { success: false, message: `ที่นั่งไม่เพียงพอ เหลือ ${tableAvailable} ที่นั่ง` };

  const totalPrice = tablePrice * data.seats;
  const now = new Date();

  // Add booking row
  sheet.appendRow([
    bookingId, data.name, data.phone, data.lineId || '-',
    tableName, data.seats, totalPrice, 'รอชำระเงิน',
    now.toLocaleString('th-TH'), '', data.note || '', data.lineUserId || '',
  ]);

  // Deduct seat count
  tableSheet.getRange(tableRow, 5).setValue(tableAvailable - data.seats);

  // Get settings for bank info
  const settings = getSettingsMap();

  // Notify LINE group
  sendLineGroupMessage(
    `🎫 *การจองใหม่!*\n` +
    `━━━━━━━━━━━━━━━\n` +
    `📋 รหัสจอง: ${bookingId}\n` +
    `👤 ชื่อ: ${data.name}\n` +
    `📱 โทร: ${data.phone}\n` +
    `🪑 ระดับ: ${tableName}\n` +
    `🔢 จำนวน: ${data.seats} ที่นั่ง\n` +
    `💰 ราคารวม: ${totalPrice.toLocaleString('th-TH')} บาท\n` +
    `━━━━━━━━━━━━━━━\n` +
    `⏳ สถานะ: รอชำระเงิน`
  );

  return {
    success: true,
    bookingId,
    totalPrice,
    bankAccount: settings.bank_account || CONFIG.BANK_ACCOUNT,
    message: 'จองสำเร็จแล้ว! กรุณาชำระเงินและอัปโหลดสลิป'
  };
}

function getBookings(data) {
  if (!verifyAdmin(data)) return { success: false, message: 'Unauthorized' };
  const sheet = getSheet(SHEETS.BOOKINGS);
  const rows = sheet.getDataRange().getValues();
  const bookings = [];
  for (let i = 1; i < rows.length; i++) {
    bookings.push({
      row: i + 1,
      id: rows[i][0], name: rows[i][1], phone: rows[i][2], lineId: rows[i][3],
      table: rows[i][4], seats: rows[i][5], total: rows[i][6], status: rows[i][7],
      date: rows[i][8], slipUrl: rows[i][9], note: rows[i][10], lineUserId: rows[i][11],
    });
  }
  return { success: true, bookings: bookings.reverse() };
}

function updateBookingStatus(data) {
  if (!verifyAdmin(data)) return { success: false, message: 'Unauthorized' };
  const sheet = getSheet(SHEETS.BOOKINGS);
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.bookingId) {
      sheet.getRange(i + 1, 8).setValue(data.status);
      if (data.note) sheet.getRange(i + 1, 11).setValue(data.note);

      const customerName = rows[i][1];
      const tableLevel = rows[i][4];
      const seats = rows[i][5];
      const total = rows[i][6];

      // Notify LINE group
      const statusEmoji = {
        'อนุมัติแล้ว': '✅', 'รอชำระเงิน': '⏳', 'รอตรวจสลิป': '🔍',
        'ยกเลิก': '❌', 'ยืนยันแล้ว': '🎉'
      };
      const emoji = statusEmoji[data.status] || '📋';

      sendLineGroupMessage(
        `${emoji} *อัปเดตสถานะการจอง*\n` +
        `━━━━━━━━━━━━━━━\n` +
        `📋 รหัสจอง: ${data.bookingId}\n` +
        `👤 ชื่อ: ${customerName}\n` +
        `🪑 ระดับ: ${tableLevel} (${seats} ที่นั่ง)\n` +
        `💰 ราคา: ${Number(total).toLocaleString('th-TH')} บาท\n` +
        `📊 สถานะ: ${data.status}\n` +
        (data.note ? `📝 หมายเหตุ: ${data.note}` : '')
      );

      return { success: true, message: 'อัปเดตสถานะสำเร็จ' };
    }
  }
  return { success: false, message: 'ไม่พบการจอง' };
}

// ============================================================
// SLIP UPLOAD TO GOOGLE DRIVE
// ============================================================
function uploadSlip(data) {
  try {
    const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
    const blob = Utilities.newBlob(
      Utilities.base64Decode(data.base64.split(',')[1]),
      data.mimeType,
      `slip_${data.bookingId}_${Date.now()}.${data.ext || 'jpg'}`
    );
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const fileUrl = `https://drive.google.com/file/d/${file.getId()}/view`;

    // Update booking row with slip URL
    const sheet = getSheet(SHEETS.BOOKINGS);
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.bookingId) {
        sheet.getRange(i + 1, 10).setValue(fileUrl);
        sheet.getRange(i + 1, 8).setValue('รอตรวจสลิป');

        // Notify LINE group
        sendLineGroupMessage(
          `🔍 *มีสลิปใหม่รอตรวจสอบ!*\n` +
          `━━━━━━━━━━━━━━━\n` +
          `📋 รหัสจอง: ${data.bookingId}\n` +
          `👤 ชื่อ: ${rows[i][1]}\n` +
          `💰 ยอด: ${Number(rows[i][6]).toLocaleString('th-TH')} บาท\n` +
          `🖼️ ดูสลิป: ${fileUrl}\n` +
          `━━━━━━━━━━━━━━━\n` +
          `👆 กรุณาตรวจสอบและอนุมัติในระบบแอดมิน`
        );
        break;
      }
    }

    return { success: true, fileUrl, message: 'อัปโหลดสลิปสำเร็จ' };
  } catch (err) {
    return { success: false, message: 'อัปโหลดสลิปไม่สำเร็จ: ' + err.message };
  }
}

function sendLineGroupMessage(message) {
  try {
    const url = 'https://api.line.me/v2/bot/message/push';
    const payload = {
      to: CONFIG.LINE_GROUP_ID,
      messages: [{ type: 'text', text: message }]
    };
    UrlFetchApp.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + CONFIG.LINE_CHANNEL_ACCESS_TOKEN,
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
  } catch (e) {
    Logger.log('LINE Error: ' + e.message);
  }
}

function sendMessageToCustomer(data) {
  if (!verifyAdmin(data)) return { success: false, message: 'Unauthorized' };
  try {
    // Send via LINE Messaging API to specific user
    const url = 'https://api.line.me/v2/bot/message/push';
    const payload = {
      to: data.lineUserId,
      messages: [{ type: 'text', text: data.message }]
    };
    const response = UrlFetchApp.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + CONFIG.LINE_CHANNEL_ACCESS_TOKEN,
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    const result = JSON.parse(response.getContentText());
    if (response.getResponseCode() === 200) {
      return { success: true, message: 'ส่งข้อความสำเร็จ' };
    }
    return { success: false, message: JSON.stringify(result) };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function getSettingsMap() {
  const sheet = getSheet(SHEETS.SETTINGS);
  const rows = sheet.getDataRange().getValues();
  const map = {};
  for (let i = 1; i < rows.length; i++) {
    map[rows[i][0]] = rows[i][1];
  }
  return map;
}

function getSettings(data) {
  if (!verifyAdmin(data)) return { success: false, message: 'Unauthorized' };
  return { success: true, settings: getSettingsMap() };
}

function updateSettings(data) {
  if (!verifyAdmin(data)) return { success: false, message: 'Unauthorized' };
  const sheet = getSheet(SHEETS.SETTINGS);
  const rows = sheet.getDataRange().getValues();
  for (const key in data.settings) {
    let found = false;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === key) {
        sheet.getRange(i + 1, 2).setValue(data.settings[key]);
        found = true;
        break;
      }
    }
    if (!found) sheet.appendRow([key, data.settings[key]]);
  }
  return { success: true, message: 'บันทึกการตั้งค่าสำเร็จ' };
}

function getStats(data) {
  if (!verifyAdmin(data)) return { success: false, message: 'Unauthorized' };
  const sheet = getSheet(SHEETS.BOOKINGS);
  const rows = sheet.getDataRange().getValues();
  const stats = { total: 0, pending: 0, approved: 0, cancelled: 0, revenue: 0, pendingSlip: 0 };
  for (let i = 1; i < rows.length; i++) {
    stats.total++;
    const status = rows[i][7];
    const amount = Number(rows[i][6]) || 0;
    if (status === 'รอชำระเงิน') stats.pending++;
    else if (status === 'อนุมัติแล้ว' || status === 'ยืนยันแล้ว') { stats.approved++; stats.revenue += amount; }
    else if (status === 'ยกเลิก') stats.cancelled++;
    else if (status === 'รอตรวจสลิป') stats.pendingSlip++;
  }
  return { success: true, stats };
}

function setupSheets() {
  getSheet(SHEETS.BOOKINGS);
  getSheet(SHEETS.TABLES);
  getSheet(SHEETS.SETTINGS);
  Logger.log('✅ Setup complete!');
}
function getBookingPage() {
  return HtmlService.createHtmlOutputFromFile('BookingPage').getContent();
}

function getAdminPage() {
  return HtmlService.createHtmlOutputFromFile('AdminPage').getContent();
}
function testConnection() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    Logger.log('✅ Sheets OK: ' + ss.getName());
    const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
    Logger.log('✅ Drive OK: ' + folder.getName());
  } catch(e) {
    Logger.log('❌ Error: ' + e.message);
  }
}
function doGet(e) {
  const page = e.parameter.page || 'booking';

  if (page === 'test') {
    return ContentService.createTextOutput(JSON.stringify(getAvailableTables()))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (page === 'admin') {
    return HtmlService.createHtmlOutput(getAdminPage())
      .setTitle('Admin - ' + CONFIG.CONCERT_NAME)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  return HtmlService.createHtmlOutput(getBookingPage())
    .setTitle('จองบัตร - ' + CONFIG.CONCERT_NAME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
