const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Login page route
router.get('/login', (req, res) => {
  res.render('login', { message: null });
});

// Handle login submission
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // Find user by username
    const user = await User.findOne({ username });
    
    if (!user) {
      return res.render('login', { 
        message: 'نام کاربری یا رمز عبور اشتباه است' 
      });
    }
    
    // Check password
    const isValidPassword = await user.isValidPassword(password);
    
    if (!isValidPassword) {
      return res.render('login', { 
        message: 'نام کاربری یا رمز عبور اشتباه است' 
      });
    }
    
    // Set session data
    req.session.user = {
      id: user._id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      employeeId: user.employeeId
    };
    
    // Redirect based on role
    if (user.role === 'admin') {
      return res.redirect('/admin/dashboard');
    } else {
      return res.redirect('/employee/dashboard');
    }
    
  } catch (error) {
    console.error('Login error:', error);
    res.render('login', { message: 'خطا در ورود به سیستم' });
  }
});

// Logout route
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;