const express = require('express');
const router = express.Router();
const Payroll = require('../models/Payroll');

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  res.redirect('/auth/login');
};

// Employee dashboard
router.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    // Get all payroll records for the logged-in employee
    const payrolls = await Payroll.find({ employeeId: req.session.user.employeeId })
      .sort({ year: -1, month: -1 });
    
    // Group payrolls by year for better organization
    const payrollsByYear = {};
    payrolls.forEach(payroll => {
      if (!payrollsByYear[payroll.year]) {
        payrollsByYear[payroll.year] = [];
      }
      payrollsByYear[payroll.year].push(payroll);
    });
    
    res.render('employee/dashboard', { 
      user: req.session.user,
      payrollsByYear: payrollsByYear,
      message: null
    });
  } catch (error) {
    console.error('Error fetching payroll data:', error);
    res.render('employee/dashboard', { 
      user: req.session.user,
      payrollsByYear: {},
      message: 'خطا در بازیابی اطلاعات حقوقی'
    });
  }
});

// View specific payslip
router.get('/payslip/:id', isAuthenticated, async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    
    // Check if payroll exists and belongs to the logged-in employee
    if (!payroll || payroll.employeeId !== req.session.user.employeeId) {
      return res.redirect('/employee/dashboard');
    }
    
    res.render('employee/payslip', { 
      user: req.session.user,
      payroll: payroll
    });
  } catch (error) {
    console.error('Error fetching payslip data:', error);
    res.redirect('/employee/dashboard');
  }
});

module.exports = router;