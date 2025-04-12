/**
 * Main JavaScript file for Payroll Management System
 */

document.addEventListener('DOMContentLoaded', function() {
  // Format numbers as currency
  const currencyElements = document.querySelectorAll('.currency');
  currencyElements.forEach(element => {
    const value = parseInt(element.textContent, 10);
    if (!isNaN(value)) {
      element.textContent = formatCurrency(value);
    }
  });

  // Handle payroll calculations in admin panel if exists
  const payrollForm = document.getElementById('payroll-calculator');
  if (payrollForm) {
    payrollForm.addEventListener('input', calculatePayroll);
  }
});

/**
 * Format a number as Persian currency
 * @param {number} amount - The amount to format
 * @returns {string} - Formatted amount
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
}

/**
 * Format a date as Persian date
 * @param {string} dateString - The date string to format
 * @returns {string} - Formatted date
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('fa-IR', options);
}

/**
 * Get Persian month name
 * @param {string} monthNumber - Month number (01-12)
 * @returns {string} - Persian month name
 */
function getMonthName(monthNumber) {
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
}

/**
 * Calculate payroll details based on form inputs
 */
function calculatePayroll() {
  const dailySalary = parseFloat(document.getElementById('dailySalary').value) || 0;
  const workingDays = parseFloat(document.getElementById('workingDays').value) || 0;
  const leaveDays = parseFloat(document.getElementById('leaveDays').value) || 0;
  const insuranceRate = parseFloat(document.getElementById('insuranceRate').value) || 0;
  const taxRate = parseFloat(document.getElementById('taxRate').value) || 0;
  
  // Calculate monthly salary
  const monthlySalary = dailySalary * workingDays;
  
  // Calculate deductions
  const insuranceDeduction = monthlySalary * (insuranceRate / 100);
  const taxDeduction = monthlySalary * (taxRate / 100);
  
  // Calculate final salary
  const finalSalary = monthlySalary - insuranceDeduction - taxDeduction;
  
  // Update display elements
  document.getElementById('monthlySalaryDisplay').textContent = formatCurrency(monthlySalary);
  document.getElementById('insuranceDeductionDisplay').textContent = formatCurrency(insuranceDeduction);
  document.getElementById('taxDeductionDisplay').textContent = formatCurrency(taxDeduction);
  document.getElementById('finalSalaryDisplay').textContent = formatCurrency(finalSalary);
  
  // Update hidden fields for form submission
  document.getElementById('monthlySalary').value = monthlySalary;
  document.getElementById('insuranceDeduction').value = insuranceDeduction;
  document.getElementById('taxDeduction').value = taxDeduction;
  document.getElementById('finalSalary').value = finalSalary;
}

/**
 * Handle file upload display
 * @param {HTMLInputElement} input - The file input element 
 * @param {string} displayId - ID of element to display filename
 */
function displayFileName(input, displayId) {
  const fileNameDisplay = document.getElementById(displayId);
  if (fileNameDisplay) {
    fileNameDisplay.textContent = input.files[0] ? input.files[0].name : 'هیچ فایلی انتخاب نشده است';
  }
}