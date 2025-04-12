const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    ref: 'User'
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  dailySalary: {
    type: Number,
    required: true
  },
  workingDays: {
    type: Number,
    required: true
  },
  monthlySalary: {
    type: Number,
    required: true
  },
  leaveDays: {
    type: Number,
    default: 0
  },
  insuranceDeduction: {
    type: Number,
    default: 0
  },
  taxDeduction: {
    type: Number,
    default: 0
  },
  finalSalary: {
    type: Number,
    required: true
  },
  month: {
    type: String,
    required: true
  },
  year: {
    type: String,
    required: true
  },
  payrollDate: {
    type: Date,
    default: Date.now
  }
});

const Payroll = mongoose.model('Payroll', payrollSchema);

module.exports = Payroll;