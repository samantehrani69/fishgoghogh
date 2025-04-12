const express = require('express');
const session = require('express-session');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');
const bcrypt = require('bcrypt');
const multer = require('multer');
const xlsx = require('xlsx');

// بارگذاری متغیرهای محیطی از فایل .env
dotenv.config();

// تنظیمات اصلی اپلیکیشن
const app = express();
const PORT = process.env.PORT || 3000;

// تنظیمات موتور قالب EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// میدلورها
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// تنظیمات جلسه (session)
app.use(session({
  secret: process.env.SESSION_SECRET || 'payroll-system-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 ساعت
  }
}));

// تنظیمات آپلود فایل
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads'))
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});
const upload = multer({ storage: storage });

// ایجاد دایرکتوری آپلودها اگر وجود نداشته باشد
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// توابع کمکی
const helpers = {
  getMonthName: function(monthNumber) {
    const months = {
      '01': 'فروردین',
      '02': 'اردیبهشت',
      '03': 'خرداد',
      '04': 'تیر',
      '05': 'مرداد',
      '06': 'شهریور',
      '07': 'مهر',
      '08': 'آبان',
      '09': 'آذر',
      '10': 'دی',
      '11': 'بهمن',
      '12': 'اسفند'
    };
    return months[monthNumber] || monthNumber;
  },
  formatDate: function(dateString) {
    const date = new Date(dateString);
    // به دلیل نبود کتابخانه پشتیبانی از تاریخ شمسی، فرمت ساده‌تری را استفاده می‌کنیم
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  },
  formatCurrency: function(amount) {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
};

// داده‌های موقت در حافظه (به جای اتصال به MongoDB)
const inMemoryDB = {
  users: [
    {
      _id: '1',
      username: 'admin',
      // رمز: admin123 - بدون رمزنگاری برای تست مستقیم
      password: 'admin123', 
      fullName: 'مدیر سیستم',
      role: 'admin',
      employeeId: 'ADMIN001'
    },
    {
      _id: '2',
      username: 'employee1',
      // رمز: admin123 - بدون رمزنگاری برای تست مستقیم
      password: 'admin123',
      fullName: 'کارمند نمونه',
      role: 'employee',
      employeeId: 'EMP001'
    }
  ],
  payrolls: [
    {
      _id: '1',
      employeeId: 'EMP001',
      firstName: 'کارمند',
      lastName: 'نمونه',
      dailySalary: 1000000,
      workingDays: 22,
      monthlySalary: 22000000,
      leaveDays: 2,
      insuranceDeduction: 2000000,
      taxDeduction: 1000000,
      finalSalary: 19000000,
      month: '04',
      year: '1404',
      payrollDate: new Date()
    }
  ]
};

// میدلور برای ارسال داده‌های موقت به روت‌ها
app.use((req, res, next) => {
  req.db = inMemoryDB;
  next();
});

// تنظیم روت‌های اصلی
app.get('/', (req, res) => {
  res.redirect('/auth/login');
});

// روت ورود کاربر
app.get('/auth/login', (req, res) => {
  // اگر کاربر قبلاً وارد شده باشد، به داشبورد مربوطه هدایت می‌شود
  if (req.session.user) {
    if (req.session.user.role === 'admin') {
      return res.redirect('/admin/dashboard');
    } else {
      return res.redirect('/employee/dashboard');
    }
  }
  
  res.render('login', { message: req.query.error ? 'نام کاربری یا رمز عبور اشتباه است' : null });
});

// روت پردازش فرم لاگین - ساده‌سازی شده
app.post('/auth/login', (req, res) => {
  console.log('اطلاعات ارسال شده:', req.body); // نمایش اطلاعات دریافتی برای دیباگ
  
  const { username, password } = req.body;
  
  // یافتن کاربر با نام کاربری مشخص شده
  const user = inMemoryDB.users.find(u => u.username === username);
  
  console.log('کاربر یافت شده:', user ? `${user.username} (${user.role})` : 'کاربر یافت نشد');
  
  // بررسی وجود کاربر و صحت رمز عبور
  if (!user || password !== user.password) {
    console.log('خطا: نام کاربری یا رمز عبور اشتباه است');
    return res.redirect('/auth/login?error=1');
  }
  
  // تنظیم اطلاعات جلسه کاربر
  req.session.user = {
    id: user._id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    employeeId: user.employeeId
  };
  
  console.log('ورود موفق. انتقال به داشبورد...');
  
  // هدایت کاربر بر اساس نقش
  if (user.role === 'admin') {
    return res.redirect('/admin/dashboard');
  } else {
    return res.redirect('/employee/dashboard');
  }
});

// روت خروج کاربر
app.get('/auth/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/auth/login');
});

// روت داشبورد مدیر
app.get('/admin/dashboard', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.redirect('/auth/login');
  }
  
  const employees = inMemoryDB.users.filter(user => user.role === 'employee');
  const users = inMemoryDB.users; // اضافه کردن تمامی کاربران
  
  res.render('admin/dashboard', { 
    user: req.session.user,
    employees,
    users, // ارسال متغیر users به قالب
    currentUser: req.session.user, // ارسال کاربر فعلی برای مقایسه در قالب
    message: null
  });
});

// روت‌های آپلود فایل اکسل کارمندان
app.post('/admin/upload/employees', upload.single('file'), (req, res) => {
  // بررسی اینکه کاربر admin باشد
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.redirect('/auth/login');
  }

  if (!req.file) {
    return res.render('admin/dashboard', {
      user: req.session.user,
      employees: inMemoryDB.users.filter(user => user.role === 'employee'),
      users: inMemoryDB.users, // اضافه کردن users
      currentUser: req.session.user,
      message: {
        type: 'error',
        text: 'لطفاً یک فایل انتخاب کنید.'
      }
    });
  }

  try {
    // خواندن فایل اکسل
    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    // بررسی ستون‌های مورد نیاز
    if (data.length === 0) {
      throw new Error('فایل اکسل خالی است.');
    }

    const requiredColumns = ['username', 'password', 'fullName', 'employeeId'];
    const firstRow = data[0];
    const missingColumns = requiredColumns.filter(col => !(col in firstRow));

    if (missingColumns.length > 0) {
      throw new Error(`ستون‌های ضروری یافت نشد: ${missingColumns.join(', ')}`);
    }

    // پردازش داده‌ها و افزودن به پایگاه داده
    let lastId = Math.max(...inMemoryDB.users.map(user => parseInt(user._id)));
    let addedCount = 0;
    let updatedCount = 0;
    
    // افزودن کارمندان جدید
    data.forEach(row => {
      // بررسی تکراری نبودن نام کاربری و کد پرسنلی
      const existingUser = inMemoryDB.users.find(
        u => u.username === row.username || u.employeeId === row.employeeId
      );
      
      if (!existingUser) {
        // افزودن کارمند جدید
        lastId++;
        inMemoryDB.users.push({
          _id: lastId.toString(),
          username: row.username,
          password: row.password,
          fullName: row.fullName,
          role: 'employee',
          employeeId: row.employeeId
        });
        addedCount++;
      } else {
        // به روزرسانی کارمند موجود
        existingUser.username = row.username;
        existingUser.password = row.password;
        existingUser.fullName = row.fullName;
        existingUser.employeeId = row.employeeId;
        updatedCount++;
      }
    });

    // حذف فایل آپلود شده
    fs.unlinkSync(req.file.path);

    return res.render('admin/dashboard', {
      user: req.session.user,
      employees: inMemoryDB.users.filter(user => user.role === 'employee'),
      users: inMemoryDB.users, // اضافه کردن users
      currentUser: req.session.user,
      message: {
        type: 'success',
        text: `${addedCount} کارمند جدید اضافه شد و ${updatedCount} کارمند به‌روزرسانی شد.`
      }
    });
  } catch (error) {
    console.error('خطا در پردازش فایل اکسل کارمندان:', error);
    
    // حذف فایل در صورت وجود
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    return res.render('admin/dashboard', {
      user: req.session.user,
      employees: inMemoryDB.users.filter(user => user.role === 'employee'),
      users: inMemoryDB.users, // اضافه کردن users
      currentUser: req.session.user,
      message: {
        type: 'error',
        text: `خطا در پردازش فایل: ${error.message}`
      }
    });
  }
});

// روت آپلود فایل اکسل فیش‌های حقوقی
app.post('/admin/upload/payrolls', upload.single('file'), (req, res) => {
  // بررسی اینکه کاربر admin باشد
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.redirect('/auth/login');
  }

  if (!req.file) {
    return res.render('admin/dashboard', {
      user: req.session.user,
      employees: inMemoryDB.users.filter(user => user.role === 'employee'),
      users: inMemoryDB.users,
      currentUser: req.session.user,
      message: {
        type: 'error',
        text: 'لطفاً یک فایل انتخاب کنید.'
      }
    });
  }

  try {
    // خواندن فایل اکسل
    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    // بررسی ستون‌های مورد نیاز
    if (data.length === 0) {
      throw new Error('فایل اکسل خالی است.');
    }

    const requiredColumns = ['employeeId', 'dailySalary', 'workingDays', 'leaveDays', 'month', 'year'];
    const firstRow = data[0];
    const missingColumns = requiredColumns.filter(col => !(col in firstRow));

    if (missingColumns.length > 0) {
      throw new Error(`ستون‌های ضروری یافت نشد: ${missingColumns.join(', ')}`);
    }

    // پردازش داده‌ها و افزودن به پایگاه داده
    let lastId = Math.max(...inMemoryDB.payrolls.map(payroll => parseInt(payroll._id)));
    const payrollsAdded = [];
    
    // افزودن فیش‌های حقوقی جدید
    data.forEach(row => {
      // بررسی وجود کارمند
      const employee = inMemoryDB.users.find(u => u.employeeId === row.employeeId);
      
      if (employee) {
        // محاسبه حقوق
        const monthlySalary = row.dailySalary * row.workingDays;
        const insuranceDeduction = Math.round(monthlySalary * 0.07); // 7% بیمه
        const taxDeduction = Math.round(monthlySalary * 0.1); // 10% مالیات
        const finalSalary = monthlySalary - insuranceDeduction - taxDeduction;
        
        // استخراج نام و نام خانوادگی
        const nameParts = employee.fullName.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
        
        lastId++;
        
        // افزودن فیش حقوقی جدید
        const newPayroll = {
          _id: lastId.toString(),
          employeeId: row.employeeId,
          firstName,
          lastName,
          dailySalary: row.dailySalary,
          workingDays: row.workingDays,
          monthlySalary,
          leaveDays: row.leaveDays,
          insuranceDeduction,
          taxDeduction,
          finalSalary,
          month: row.month.toString().padStart(2, '0'),
          year: row.year.toString(),
          payrollDate: new Date()
        };
        
        inMemoryDB.payrolls.push(newPayroll);
        payrollsAdded.push(newPayroll);
      }
    });

    // حذف فایل آپلود شده
    fs.unlinkSync(req.file.path);

    return res.render('admin/dashboard', {
      user: req.session.user,
      employees: inMemoryDB.users.filter(user => user.role === 'employee'),
      users: inMemoryDB.users,
      currentUser: req.session.user,
      message: {
        type: 'success',
        text: `${payrollsAdded.length} فیش حقوقی با موفقیت اضافه شد.`
      }
    });
  } catch (error) {
    console.error('خطا در پردازش فایل اکسل فیش‌های حقوقی:', error);
    
    // حذف فایل در صورت وجود
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    return res.render('admin/dashboard', {
      user: req.session.user,
      employees: inMemoryDB.users.filter(user => user.role === 'employee'),
      users: inMemoryDB.users,
      currentUser: req.session.user,
      message: {
        type: 'error',
        text: `خطا در پردازش فایل: ${error.message}`
      }
    });
  }
});

// روت دانلود قالب اکسل برای کارمندان
app.get('/admin/generate-employee-template', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.redirect('/auth/login');
  }

  try {
    // ایجاد یک فایل اکسل نمونه
    const workbook = xlsx.utils.book_new();
    const data = [
      { username: 'employee1', password: 'password1', fullName: 'کارمند نمونه 1', employeeId: 'EMP001' },
      { username: 'employee2', password: 'password2', fullName: 'کارمند نمونه 2', employeeId: 'EMP002' }
    ];
    
    const worksheet = xlsx.utils.json_to_sheet(data);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Employees');
    
    // ذخیره فایل در مسیر موقت
    const tempFilePath = path.join(__dirname, 'uploads', 'employee-template.xlsx');
    xlsx.writeFile(workbook, tempFilePath);
    
    // ارسال فایل به کاربر
    res.download(tempFilePath, 'employee-template.xlsx', err => {
      if (err) {
        console.error('خطا در دانلود فایل قالب کارمندان:', err);
      }
      // حذف فایل موقت
      fs.unlinkSync(tempFilePath);
    });
  } catch (error) {
    console.error('خطا در ایجاد فایل قالب کارمندان:', error);
    res.status(500).render('error', { 
      title: 'خطای سرور',
      message: 'خطا در ایجاد فایل قالب',
      user: req.session.user || null
    });
  }
});

// روت دانلود قالب اکسل برای فیش‌های حقوقی
app.get('/admin/generate-payroll-template', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.redirect('/auth/login');
  }

  try {
    // ایجاد یک فایل اکسل نمونه
    const workbook = xlsx.utils.book_new();
    const data = [
      { 
        employeeId: 'EMP001',
        dailySalary: 1200000,
        workingDays: 22,
        leaveDays: 1,
        month: '04',
        year: '1404'
      },
      { 
        employeeId: 'EMP002',
        dailySalary: 1100000,
        workingDays: 20,
        leaveDays: 2,
        month: '04',
        year: '1404'
      }
    ];
    
    const worksheet = xlsx.utils.json_to_sheet(data);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Payrolls');
    
    // ذخیره فایل در مسیر موقت
    const tempFilePath = path.join(__dirname, 'uploads', 'payroll-template.xlsx');
    xlsx.writeFile(workbook, tempFilePath);
    
    // ارسال فایل به کاربر
    res.download(tempFilePath, 'payroll-template.xlsx', err => {
      if (err) {
        console.error('خطا در دانلود فایل قالب فیش حقوقی:', err);
      }
      // حذف فایل موقت
      fs.unlinkSync(tempFilePath);
    });
  } catch (error) {
    console.error('خطا در ایجاد فایل قالب فیش حقوقی:', error);
    res.status(500).render('error', { 
      title: 'خطای سرور',
      message: 'خطا در ایجاد فایل قالب',
      user: req.session.user || null
    });
  }
});

// روت داشبورد کارمند
app.get('/employee/dashboard', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }
  
  // گرفتن فیش‌های حقوقی کارمند
  const payrolls = inMemoryDB.payrolls.filter(
    p => p.employeeId === req.session.user.employeeId
  );
  
  // گروه‌بندی فیش‌ها بر اساس سال
  const payrollsByYear = {};
  payrolls.forEach(payroll => {
    if (!payrollsByYear[payroll.year]) {
      payrollsByYear[payroll.year] = [];
    }
    payrollsByYear[payroll.year].push(payroll);
  });
  
  res.render('employee/dashboard', { 
    user: req.session.user,
    payrollsByYear,
    message: null,
    getMonthName: helpers.getMonthName
  });
});

// روت مشاهده فیش حقوقی
app.get('/employee/payslip/:id', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }
  
  const payroll = inMemoryDB.payrolls.find(p => p._id === req.params.id);
  
  // بررسی وجود فیش و تعلق آن به کارمند
  if (!payroll || payroll.employeeId !== req.session.user.employeeId) {
    return res.redirect('/employee/dashboard');
  }
  
  res.render('employee/payslip', { 
    user: req.session.user,
    payroll,
    getMonthName: helpers.getMonthName,
    formatDate: helpers.formatDate,
    formatCurrency: helpers.formatCurrency
  });
});

// روت اضافه کردن کاربر جدید
app.post('/admin/users/add', (req, res) => {
  // بررسی اینکه کاربر admin باشد
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.redirect('/auth/login');
  }
  
  const { username, password, fullName, employeeId, role } = req.body;
  
  // بررسی تکراری نبودن نام کاربری و کد پرسنلی
  const usernameExists = inMemoryDB.users.some(u => u.username === username);
  const employeeIdExists = inMemoryDB.users.some(u => u.employeeId === employeeId);
  
  if (usernameExists || employeeIdExists) {
    return res.render('admin/dashboard', {
      user: req.session.user,
      employees: inMemoryDB.users.filter(user => user.role === 'employee'),
      users: inMemoryDB.users,
      currentUser: req.session.user,
      message: {
        type: 'error',
        text: 'نام کاربری یا کد پرسنلی تکراری است.'
      }
    });
  }
  
  // افزودن کاربر جدید
  const lastId = Math.max(...inMemoryDB.users.map(user => parseInt(user._id)));
  
  inMemoryDB.users.push({
    _id: (lastId + 1).toString(),
    username,
    password,
    fullName,
    role: role || 'employee',
    employeeId
  });
  
  return res.render('admin/dashboard', {
    user: req.session.user,
    employees: inMemoryDB.users.filter(user => user.role === 'employee'),
    users: inMemoryDB.users,
    currentUser: req.session.user,
    message: {
      type: 'success',
      text: 'کاربر جدید با موفقیت اضافه شد.'
    }
  });
});

// روت حذف کاربر
app.post('/admin/users/delete', (req, res) => {
  // بررسی اینکه کاربر admin باشد
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.redirect('/auth/login');
  }
  
  const { userId } = req.body;
  
  // جلوگیری از حذف خود کاربر
  if (userId === req.session.user.id) {
    return res.render('admin/dashboard', {
      user: req.session.user,
      employees: inMemoryDB.users.filter(user => user.role === 'employee'),
      users: inMemoryDB.users,
      currentUser: req.session.user,
      message: {
        type: 'error',
        text: 'شما نمی‌توانید حساب کاربری خود را حذف کنید.'
      }
    });
  }
  
  // حذف کاربر
  const userIndex = inMemoryDB.users.findIndex(u => u._id === userId);
  
  if (userIndex !== -1) {
    inMemoryDB.users.splice(userIndex, 1);
  }
  
  return res.render('admin/dashboard', {
    user: req.session.user,
    employees: inMemoryDB.users.filter(user => user.role === 'employee'),
    users: inMemoryDB.users,
    currentUser: req.session.user,
    message: {
      type: 'success',
      text: 'کاربر با موفقیت حذف شد.'
    }
  });
});

// مدیریت صفحات 404 (صفحه‌ای که پیدا نشد)
app.use((req, res) => {
  res.status(404).render('404', { 
    title: 'صفحه مورد نظر پیدا نشد',
    user: req.session.user || null
  });
});

// مدیریت خطاها
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    title: 'خطای سرور',
    message: process.env.NODE_ENV === 'development' ? err.message : 'خطایی رخ داده است.',
    user: req.session.user || null
  });
});

// راه‌اندازی سرور
app.listen(PORT, '0.0.0.0', () => {
  console.log(`سرور با موفقیت در پورت ${PORT} راه‌اندازی شد.`);
  console.log(`برای مشاهده برنامه به آدرس http://localhost:${PORT} مراجعه کنید.`);
  console.log('اطلاعات کاربران تعریف شده:');
  console.log('- نام کاربری: admin، رمز عبور: admin123، نقش: admin');
  console.log('- نام کاربری: employee1، رمز عبور: admin123، نقش: employee');
});