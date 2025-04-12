const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

// تابع تولید کارمندان نمونه
function generateEmployees() {
  // لیست نام‌های ایرانی
  const firstNames = ['علی', 'محمد', 'حسین', 'رضا', 'مهدی', 'فاطمه', 'زهرا', 'مریم', 'سارا', 'نرگس'];
  const lastNames = ['محمدی', 'رضایی', 'احمدی', 'حسینی', 'کریمی', 'موسوی', 'جعفری', 'نوری', 'صادقی', 'حیدری'];
  
  const employees = [];
  
  // ایجاد 10 کارمند با اطلاعات مختلف
  for (let i = 0; i < 10; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[i % lastNames.length];
    
    employees.push({
      username: `employee${i + 1}`,
      password: `password${i + 1}`,
      fullName: `${firstName} ${lastName}`,
      employeeId: `EMP${String(i + 1).padStart(3, '0')}`
    });
  }
  
  return employees;
}

// تابع تولید فیش‌های حقوقی نمونه
function generatePayrolls() {
  const payrolls = [];
  const months = ['01', '02', '03', '04']; // فروردین تا تیر
  const year = '1404'; // سال جاری به شمسی
  
  // حقوق پایه برای کارمندان مختلف (مقادیر به ریال)
  const baseSalaries = {
    'EMP001': 1200000,
    'EMP002': 1100000,
    'EMP003': 1300000,
    'EMP004': 1250000,
    'EMP005': 1180000,
    'EMP006': 1220000,
    'EMP007': 1350000,
    'EMP008': 1150000,
    'EMP009': 1280000,
    'EMP010': 1190000
  };
  
  // ایجاد فیش حقوقی برای هر کارمند و هر ماه
  Object.keys(baseSalaries).forEach(employeeId => {
    months.forEach(month => {
      const dailySalary = baseSalaries[employeeId];
      
      // ایجاد مقادیر متفاوت برای ماه‌های مختلف
      const workingDays = Math.floor(Math.random() * 4) + 22; // بین 22 تا 25 روز
      const leaveDays = Math.floor(Math.random() * 3); // بین 0 تا 2 روز
      
      payrolls.push({
        employeeId,
        dailySalary,
        workingDays,
        leaveDays,
        month,
        year
      });
    });
  });
  
  return payrolls;
}

// ذخیره داده‌ها در فایل اکسل
function createExcelFile(data, fileName, sheetName) {
  // ایجاد Workbook
  const wb = xlsx.utils.book_new();
  
  // ایجاد Worksheet
  const ws = xlsx.utils.json_to_sheet(data);
  
  // افزودن Worksheet به Workbook
  xlsx.utils.book_append_sheet(wb, ws, sheetName);
  
  // ذخیره فایل
  const filePath = path.join(__dirname, 'uploads', fileName);
  xlsx.writeFile(wb, filePath);
  
  return filePath;
}

// اطمینان از وجود دایرکتوری uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// تولید و ذخیره فایل‌های اکسل
const employees = generateEmployees();
const employeesFilePath = createExcelFile(employees, 'sample-employees.xlsx', 'Employees');
console.log(`فایل کارمندان در مسیر ${employeesFilePath} ذخیره شد.`);

const payrolls = generatePayrolls();
const payrollsFilePath = createExcelFile(payrolls, 'sample-payrolls.xlsx', 'Payrolls');
console.log(`فایل فیش‌های حقوقی در مسیر ${payrollsFilePath} ذخیره شد.`);

console.log('\n-- راهنمای استفاده --');
console.log('1. با نام کاربری admin و رمز عبور admin123 وارد سیستم شوید.');
console.log('2. فایل‌های اکسل تولید شده را از پوشه uploads به سیستم آپلود کنید.');
console.log('3. سپس می‌توانید با نام کاربری و رمز عبور کارمندان (مثلاً employee1/password1) وارد شوید و فیش‌های حقوقی را مشاهده کنید.');