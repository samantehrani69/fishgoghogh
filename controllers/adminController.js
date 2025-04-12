const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const cryptoJS = require('crypto-js');
const fs = require('fs');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Payroll = require('../models/Payroll');

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create uploads directory if it doesn't exist
    const dir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  res.redirect('/auth/login');
};

// Admin dashboard
router.get('/dashboard', isAdmin, async (req, res) => {
  try {
    const employees = await User.find({ role: 'employee' });
    const users = await User.find({});
    res.render('admin/dashboard', { 
      user: req.session.user,
      currentUser: req.session.user,
      employees,
      users,
      message: req.session.message || null
    });
    // Clear flash message after use
    delete req.session.message;
  } catch (error) {
    console.error('Error fetching data:', error);
    res.render('admin/dashboard', { 
      user: req.session.user,
      currentUser: req.session.user,
      employees: [],
      users: [],
      message: { type: 'error', text: 'خطا در بازیابی اطلاعات' }
    });
  }
});

// Upload employees Excel file
router.post('/upload/employees', isAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) {
    req.session.message = { type: 'error', text: 'فایلی آپلود نشده است' };
    return res.redirect('/admin/dashboard');
  }

  try {
    const filePath = req.file.path;
    
    // Read Excel file
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    // Process each row in Excel file
    for (const row of data) {
      // Check if user already exists
      const existingUser = await User.findOne({ username: row.username });
      
      if (existingUser) {
        // Update existing user
        existingUser.fullName = row.fullName;
        existingUser.employeeId = row.employeeId;
        // Only update password if provided
        if (row.password) {
          existingUser.password = row.password;
        }
        await existingUser.save();
      } else {
        // Create new user
        const newUser = new User({
          username: row.username,
          password: row.password,
          fullName: row.fullName,
          role: 'employee',
          employeeId: row.employeeId
        });
        await newUser.save();
      }
    }
    
    // Delete temporary file
    fs.unlinkSync(filePath);
    
    req.session.message = { type: 'success', text: 'اطلاعات کارمندان با موفقیت بارگذاری شد' };
    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Error processing employees file:', error);
    req.session.message = { type: 'error', text: 'خطا در پردازش فایل: ' + error.message };
    res.redirect('/admin/dashboard');
  }
});

// Upload payrolls Excel file
router.post('/upload/payrolls', isAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) {
    req.session.message = { type: 'error', text: 'فایلی آپلود نشده است' };
    return res.redirect('/admin/dashboard');
  }

  try {
    const filePath = req.file.path;
    
    // Read Excel file
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    // Process each row in Excel file
    for (const row of data) {
      // Find user by employeeId
      const user = await User.findOne({ employeeId: row.employeeId });
      
      if (!user) {
        continue; // Skip if user not found
      }
      
      const dailySalary = row.dailySalary || 0;
      const workingDays = row.workingDays || 0;
      const leaveDays = row.leaveDays || 0;
      
      // Calculate salary based on working days and daily salary
      const monthlySalary = dailySalary * workingDays;
      
      // Create or update payroll record
      await Payroll.findOneAndUpdate(
        { employeeId: row.employeeId, month: row.month, year: row.year },
        {
          employeeId: row.employeeId,
          fullName: user.fullName,
          dailySalary: dailySalary,
          workingDays: workingDays,
          leaveDays: leaveDays,
          monthlySalary: monthlySalary,
          month: row.month,
          year: row.year
        },
        { upsert: true, new: true }
      );
    }
    
    // Delete temporary file
    fs.unlinkSync(filePath);
    
    req.session.message = { type: 'success', text: 'اطلاعات فیش‌های حقوقی با موفقیت بارگذاری شد' };
    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Error processing payrolls file:', error);
    req.session.message = { type: 'error', text: 'خطا در پردازش فایل: ' + error.message };
    res.redirect('/admin/dashboard');
  }
});

// Generate employee Excel template
router.get('/generate-employee-template', isAdmin, (req, res) => {
  // Create a sample workbook
  const workbook = xlsx.utils.book_new();
  
  // Sample data
  const sampleData = [
    {
      username: 'employee1',
      password: 'password123',
      fullName: 'نام و نام خانوادگی',
      employeeId: 'EMP001'
    }
  ];
  
  // Create worksheet
  const worksheet = xlsx.utils.json_to_sheet(sampleData);
  
  // Add worksheet to workbook
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Employees');
  
  // Write to buffer
  const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  
  // Set headers for file download
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="employee_template.xlsx"');
  
  // Send buffer
  res.send(buffer);
});

// Generate payroll Excel template
router.get('/generate-payroll-template', isAdmin, (req, res) => {
  // Create a sample workbook
  const workbook = xlsx.utils.book_new();
  
  // Sample data
  const sampleData = [
    {
      employeeId: 'EMP001',
      dailySalary: 5000,
      workingDays: 22,
      leaveDays: 2,
      month: 'فروردین',
      year: '1402'
    }
  ];
  
  // Create worksheet
  const worksheet = xlsx.utils.json_to_sheet(sampleData);
  
  // Add worksheet to workbook
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Payroll');
  
  // Write to buffer
  const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  
  // Set headers for file download
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="payroll_template.xlsx"');
  
  // Send buffer
  res.send(buffer);
});

// Add new user
router.post('/users/add', isAdmin, async (req, res) => {
  try {
    const { username, password, fullName, employeeId, role } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      req.session.message = { type: 'error', text: 'نام کاربری قبلاً وجود دارد' };
      return res.redirect('/admin/dashboard');
    }
    
    // Create new user
    const newUser = new User({
      username,
      password, // Will be hashed by pre-save hook
      fullName,
      employeeId,
      role: role || 'employee'
    });
    
    await newUser.save();
    
    req.session.message = { type: 'success', text: 'کاربر جدید با موفقیت اضافه شد' };
    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Error adding user:', error);
    req.session.message = { type: 'error', text: 'خطا در ثبت کاربر جدید: ' + error.message };
    res.redirect('/admin/dashboard');
  }
});

// Delete user
router.post('/users/delete', isAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    
    // Prevent admin from deleting themselves
    if (userId === req.session.user._id) {
      req.session.message = { type: 'error', text: 'امکان حذف حساب کاربری خود وجود ندارد' };
      return res.redirect('/admin/dashboard');
    }
    
    // Delete user
    await User.findByIdAndDelete(userId);
    
    req.session.message = { type: 'success', text: 'کاربر با موفقیت حذف شد' };
    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Error deleting user:', error);
    req.session.message = { type: 'error', text: 'خطا در حذف کاربر: ' + error.message };
    res.redirect('/admin/dashboard');
  }
});

// Change admin password
router.post('/change-password', isAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    // Check if new passwords match
    if (newPassword !== confirmPassword) {
      req.session.message = { type: 'error', text: 'رمز عبور جدید و تأیید آن مطابقت ندارند' };
      return res.redirect('/admin/dashboard');
    }
    
    // Find user
    const user = await User.findById(req.session.user._id);
    if (!user) {
      req.session.message = { type: 'error', text: 'کاربر یافت نشد' };
      return res.redirect('/admin/dashboard');
    }
    
    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      req.session.message = { type: 'error', text: 'رمز عبور فعلی اشتباه است' };
      return res.redirect('/admin/dashboard');
    }
    
    // Update password
    user.password = newPassword; // Will be hashed by pre-save hook
    await user.save();
    
    req.session.message = { type: 'success', text: 'رمز عبور با موفقیت تغییر کرد' };
    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Error changing password:', error);
    req.session.message = { type: 'error', text: 'خطا در تغییر رمز عبور: ' + error.message };
    res.redirect('/admin/dashboard');
  }
});

module.exports = router;