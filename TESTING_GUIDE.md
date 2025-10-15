# MediConnect Pro - Manual Testing Guide

This guide provides comprehensive manual testing procedures for MediConnect Pro, covering all features, user workflows, and edge cases.

## Table of Contents

1. [Testing Prerequisites](#testing-prerequisites)
2. [Test Accounts](#test-accounts)
3. [Frontend Testing](#frontend-testing)
4. [User Workflow Testing](#user-workflow-testing)
5. [Cross-Browser Testing](#cross-browser-testing)
6. [Performance Testing](#performance-testing)
7. [Security Testing](#security-testing)
8. [Accessibility Testing](#accessibility-testing)
9. [Issue Reporting Template](#issue-reporting-template)

---

## Testing Prerequisites

### Required Tools
- [ ] Web browser (Chrome, Firefox, Safari, or Edge)
- [ ] Browser DevTools open (F12)
- [ ] Network throttling available (for performance testing)
- [ ] Screenshot tool for documenting issues

### Test Environments
- **Local**: `http://localhost:3000`
- **Production**: `https://mediconnect-pro.onrender.com`

### Before Each Test Session
1. [ ] Clear browser cache and cookies
2. [ ] Open DevTools Console tab
3. [ ] Open DevTools Network tab
4. [ ] Note any console errors/warnings
5. [ ] Check network requests for failures

---

## Test Accounts

### Admin Account
- **Email**: `admin@mediconnect.demo`
- **Password**: `Demo2024!Admin`
- **Access**: Full system access, statistics, all patients

### Doctor Account
- **Email**: `dr.smith@mediconnect.demo`
- **Password**: `Demo2024!Doctor`
- **Access**: Patient records, appointments, prescriptions, AI tools

### Patient Account
- **Email**: `john.doe@mediconnect.demo`
- **Password**: `Demo2024!Patient`
- **Access**: Own records, vitals, appointments, prescriptions, AI assistant

---

## Frontend Testing

### Login Page Tests

#### Test 1.1: Successful Login
- [ ] Navigate to `/login.html`
- [ ] Enter valid credentials (doctor account)
- [ ] Click "Sign In"
- [ ] **Expected**: Redirect to appropriate dashboard
- [ ] **Check**: No console errors
- [ ] **Check**: Session cookie set

#### Test 1.2: Failed Login - Invalid Credentials
- [ ] Navigate to `/login.html`
- [ ] Enter invalid email/password
- [ ] Click "Sign In"
- [ ] **Expected**: Error message displayed
- [ ] **Check**: User remains on login page
- [ ] **Check**: No console errors

#### Test 1.3: Failed Login - Empty Fields
- [ ] Navigate to `/login.html`
- [ ] Leave email/password empty
- [ ] Click "Sign In"
- [ ] **Expected**: HTML5 validation error or custom error
- [ ] **Check**: Form does not submit

#### Test 1.4: UI/UX Elements
- [ ] Logo displays correctly
- [ ] Form fields are properly aligned
- [ ] Password field masks input
- [ ] "Remember me" checkbox works
- [ ] Responsive on mobile (if applicable)

---

### Dashboard Tests - Common Elements

#### Test 2.1: Navigation Bar
- [ ] Logo/branding visible
- [ ] User name displayed
- [ ] Role badge visible (Patient/Doctor/Admin)
- [ ] Logout button present
- [ ] All navigation links functional

#### Test 2.2: Sidebar Navigation
- [ ] All menu items visible
- [ ] Active page highlighted
- [ ] Icons display correctly
- [ ] Mobile menu toggle works (if applicable)

#### Test 2.3: Page Load
- [ ] Dashboard loads within 3 seconds
- [ ] No JavaScript errors in console
- [ ] All images/icons load
- [ ] Loading states display correctly

---

### Patient Dashboard Tests

#### Test 3.1: Dashboard Overview
- [ ] Navigate to patient dashboard
- [ ] **Check**: Vital signs widget displays
- [ ] **Check**: Upcoming appointments visible
- [ ] **Check**: Recent prescriptions visible
- [ ] **Check**: Quick action buttons present

#### Test 3.2: Vital Signs Display
- [ ] Vital signs chart renders
- [ ] Latest readings displayed
- [ ] Units shown correctly (bpm, mmHg, °C, %)
- [ ] Historical data visible
- [ ] Refresh button works
- [ ] **Expected**: Heart rate, blood pressure, temperature, oxygen saturation

#### Test 3.3: Appointments Section
- [ ] Appointments list displays
- [ ] Date/time formatted correctly
- [ ] Doctor name shown
- [ ] Status indicator visible
- [ ] "Book Appointment" button works
- [ ] Empty state displays if no appointments

#### Test 3.4: Prescriptions Section
- [ ] Prescriptions list displays
- [ ] Medication names visible
- [ ] Dosage and frequency shown
- [ ] Pharmacy information present
- [ ] Status indicator (active/pending)
- [ ] "Request Prescription" button works

#### Test 3.5: AI Assistant Access
- [ ] AI Assistant button visible
- [ ] Click button opens modal
- [ ] Form fields present
- [ ] Submit button functional
- [ ] Close button works

---

### Doctor Dashboard Tests

#### Test 4.1: Dashboard Overview
- [ ] Navigate to doctor dashboard
- [ ] **Check**: Patient list displays
- [ ] **Check**: Today's appointments visible
- [ ] **Check**: Recent prescriptions visible
- [ ] **Check**: Statistics/metrics shown

#### Test 4.2: Patients List
- [ ] All patients displayed
- [ ] Patient names visible
- [ ] Medical information shown (conditions, allergies)
- [ ] Search/filter functionality works
- [ ] Click patient opens details

#### Test 4.3: Patient Details View
- [ ] Patient information complete
- [ ] Vitals history displays
- [ ] Chart/graph renders correctly
- [ ] Medical history visible
- [ ] Action buttons present (prescribe, schedule)

#### Test 4.4: Appointments Management
- [ ] Today's appointments highlighted
- [ ] Upcoming appointments listed
- [ ] Past appointments accessible
- [ ] Schedule new appointment works
- [ ] Appointment details complete

#### Test 4.5: Prescription Management
- [ ] Create prescription form works
- [ ] All fields available (medication, dosage, frequency, pharmacy)
- [ ] Form validation works
- [ ] Submission successful
- [ ] Prescription appears in list

#### Test 4.6: AI Tools Access
- [ ] AI Assistant available
- [ ] Transcription tool accessible
- [ ] Note generation works
- [ ] Report generation functions
- [ ] Triage assessment available

---

### Admin Dashboard Tests

#### Test 5.1: Dashboard Overview
- [ ] Navigate to admin dashboard
- [ ] **Check**: System statistics displayed
- [ ] **Check**: User metrics visible
- [ ] **Check**: Activity charts render
- [ ] **Check**: All KPIs present

#### Test 5.2: Statistics Display
- [ ] Total users count
- [ ] Total patients count
- [ ] Total doctors count
- [ ] Total appointments count
- [ ] System health status
- [ ] Database status

#### Test 5.3: User Management
- [ ] User list displays
- [ ] Filter by role works
- [ ] User details accessible
- [ ] Search functionality works

#### Test 5.4: System Monitoring
- [ ] Health check status
- [ ] API status indicators
- [ ] AI services status
- [ ] Database connection status

---

### AI Assistant Feature Tests

#### Test 6.1: Opening AI Assistant
- [ ] Click "AI Assistant" button
- [ ] **Expected**: Modal opens smoothly
- [ ] **Check**: Form visible
- [ ] **Check**: Close button works
- [ ] **Check**: Background overlay present

#### Test 6.2: Symptom Triage
- [ ] Enter symptoms in textarea
- [ ] Example: "headache, fever, and sore throat for 2 days"
- [ ] Click "Analyze Symptoms"
- [ ] **Expected**: Loading indicator appears
- [ ] **Expected**: Results display within 10 seconds
- [ ] **Check**: Urgency level shown
- [ ] **Check**: Recommendations provided
- [ ] **Check**: Differential diagnosis listed

#### Test 6.3: AI Assistant - Edge Cases
- [ ] Submit empty form
- [ ] **Expected**: Validation error
- [ ] Submit very long text (>1000 characters)
- [ ] **Expected**: Handles gracefully
- [ ] Submit special characters
- [ ] **Expected**: No errors

#### Test 6.4: AI Assistant - Demo Mode
- [ ] Test when API keys not configured
- [ ] **Expected**: Demo mode message
- [ ] **Expected**: Mock results displayed
- [ ] **Expected**: No real API calls

---

### Vitals Monitoring Tests

#### Test 7.1: Real-Time Vitals Display
- [ ] Navigate to vitals monitoring section
- [ ] **Expected**: Live data displays
- [ ] **Check**: Auto-refresh works (every 5-10 seconds)
- [ ] **Check**: Charts update smoothly
- [ ] **Check**: No flickering

#### Test 7.2: Vitals Chart Rendering
- [ ] Heart rate chart displays
- [ ] Blood pressure chart displays
- [ ] Temperature chart displays
- [ ] Oxygen saturation chart displays
- [ ] **Check**: X-axis (time) labeled correctly
- [ ] **Check**: Y-axis (values) labeled correctly
- [ ] **Check**: Legends visible

#### Test 7.3: Anomaly Detection
- [ ] Check for alert indicators
- [ ] High values highlighted in red
- [ ] Low values highlighted in yellow
- [ ] Normal values in green
- [ ] Alert messages display

#### Test 7.4: Historical Data
- [ ] Select date range
- [ ] **Expected**: Data filters correctly
- [ ] **Check**: Charts update
- [ ] **Check**: Statistics recalculate
- [ ] Export functionality works (if available)

---

## User Workflow Testing

### Workflow 1: Patient Books Appointment

**Scenario**: Patient John Doe wants to book a checkup with Dr. Smith

1. [ ] Login as patient
2. [ ] Navigate to "Appointments" section
3. [ ] Click "Book Appointment"
4. [ ] **Check**: Form opens
5. [ ] Select doctor (Dr. Smith)
6. [ ] Select date (tomorrow or later)
7. [ ] Select time slot
8. [ ] Enter reason: "Annual checkup"
9. [ ] Click "Submit"
10. [ ] **Expected**: Success message
11. [ ] **Expected**: Appointment appears in list
12. [ ] **Check**: Status is "scheduled"
13. [ ] Logout
14. [ ] Login as doctor
15. [ ] **Check**: Appointment visible in doctor's dashboard

**Pass/Fail**: ___________

**Notes**: _______________________________

---

### Workflow 2: Doctor Prescribes Medication

**Scenario**: Dr. Smith prescribes medication for patient John Doe

1. [ ] Login as doctor
2. [ ] Navigate to "Patients" section
3. [ ] Find and click on "John Doe"
4. [ ] **Check**: Patient details display
5. [ ] Click "Prescribe Medication"
6. [ ] **Check**: Form opens
7. [ ] Enter medication: "Amoxicillin"
8. [ ] Enter dosage: "500mg"
9. [ ] Enter frequency: "Three times daily"
10. [ ] Enter pharmacy: "Main Street Pharmacy"
11. [ ] Click "Submit"
12. [ ] **Expected**: Success message
13. [ ] **Expected**: Prescription appears in list
14. [ ] Logout
15. [ ] Login as patient
16. [ ] Navigate to "Prescriptions"
17. [ ] **Check**: New prescription visible
18. [ ] **Check**: Status is "pending" or "active"

**Pass/Fail**: ___________

**Notes**: _______________________________

---

### Workflow 3: Patient Uses AI Assistant

**Scenario**: Patient uses AI triage for symptoms

1. [ ] Login as patient
2. [ ] Click "AI Assistant" button
3. [ ] **Check**: Modal opens
4. [ ] Enter symptoms: "persistent cough, mild fever, fatigue for 3 days"
5. [ ] Click "Analyze Symptoms"
6. [ ] **Expected**: Loading indicator
7. [ ] **Expected**: Results within 10 seconds
8. [ ] **Check**: Urgency level displayed (Low/Medium/High)
9. [ ] **Check**: Possible conditions listed
10. [ ] **Check**: Recommendations provided
11. [ ] **Check**: "Seek immediate care" flag if appropriate
12. [ ] Click "Close" or "Book Appointment"
13. [ ] **Check**: Modal closes properly

**Pass/Fail**: ___________

**Notes**: _______________________________

---

### Workflow 4: Admin Views Statistics

**Scenario**: Admin checks system health and user statistics

1. [ ] Login as admin
2. [ ] Navigate to admin dashboard
3. [ ] **Check**: Total users count displays
4. [ ] **Check**: Patient count displays
5. [ ] **Check**: Doctor count displays
6. [ ] **Check**: Appointment statistics visible
7. [ ] **Check**: System health indicator shows "healthy"
8. [ ] Navigate to "Users" section (if available)
9. [ ] **Check**: All users listed
10. [ ] Filter by role: "doctor"
11. [ ] **Expected**: Only doctors shown
12. [ ] **Check**: Export functionality (if available)

**Pass/Fail**: ___________

**Notes**: _______________________________

---

### Workflow 5: Doctor Monitors Patient Vitals

**Scenario**: Dr. Smith checks real-time vitals for a patient

1. [ ] Login as doctor
2. [ ] Navigate to "Patients" section
3. [ ] Select patient "John Doe"
4. [ ] Navigate to "Vitals" tab
5. [ ] **Check**: Latest vitals display
6. [ ] **Check**: Charts render correctly
7. [ ] **Check**: Auto-refresh works
8. [ ] Look for any alerts/warnings
9. [ ] **Check**: Historical data available
10. [ ] Select date range filter
11. [ ] **Expected**: Chart updates
12. [ ] Hover over data points
13. [ ] **Expected**: Tooltip shows exact values

**Pass/Fail**: ___________

**Notes**: _______________________________

---

## Cross-Browser Testing

Test the application on multiple browsers and document results:

### Desktop Browsers

#### Google Chrome (Latest)
- [ ] Login page loads correctly
- [ ] Dashboards display properly
- [ ] Charts/graphs render
- [ ] Forms submit successfully
- [ ] AI Assistant works
- [ ] No console errors
- [ ] Performance acceptable

**Issues Found**: _______________________________

---

#### Mozilla Firefox (Latest)
- [ ] Login page loads correctly
- [ ] Dashboards display properly
- [ ] Charts/graphs render
- [ ] Forms submit successfully
- [ ] AI Assistant works
- [ ] No console errors
- [ ] Performance acceptable

**Issues Found**: _______________________________

---

#### Microsoft Edge (Latest)
- [ ] Login page loads correctly
- [ ] Dashboards display properly
- [ ] Charts/graphs render
- [ ] Forms submit successfully
- [ ] AI Assistant works
- [ ] No console errors
- [ ] Performance acceptable

**Issues Found**: _______________________________

---

#### Safari (Latest - macOS)
- [ ] Login page loads correctly
- [ ] Dashboards display properly
- [ ] Charts/graphs render
- [ ] Forms submit successfully
- [ ] AI Assistant works
- [ ] No console errors
- [ ] Performance acceptable

**Issues Found**: _______________________________

---

### Mobile Browsers

#### Mobile Chrome (Android)
- [ ] Responsive layout works
- [ ] Touch interactions smooth
- [ ] Forms usable on mobile
- [ ] Navigation accessible
- [ ] Performance acceptable

**Issues Found**: _______________________________

---

#### Mobile Safari (iOS)
- [ ] Responsive layout works
- [ ] Touch interactions smooth
- [ ] Forms usable on mobile
- [ ] Navigation accessible
- [ ] Performance acceptable

**Issues Found**: _______________________________

---

## Performance Testing

### Page Load Time Tests

#### Test Environment: Fast 3G (Throttled)
1. [ ] Open DevTools
2. [ ] Go to Network tab
3. [ ] Enable throttling: "Fast 3G"
4. [ ] Clear cache
5. [ ] Navigate to login page
6. [ ] **Measure**: Time to interactive
7. [ ] **Expected**: < 5 seconds
8. [ ] Login and measure dashboard load
9. [ ] **Expected**: < 3 seconds

**Results**:
- Login page: _______ seconds
- Dashboard: _______ seconds

---

#### Test Environment: Regular 4G (Throttled)
1. [ ] Enable throttling: "Regular 4G"
2. [ ] Repeat above steps
3. [ ] **Expected**: < 3 seconds for all pages

**Results**:
- Login page: _______ seconds
- Dashboard: _______ seconds

---

### API Response Time Tests

1. [ ] Open Network tab
2. [ ] Login as doctor
3. [ ] Navigate to patients list
4. [ ] **Measure**: `/api/patients` response time
5. [ ] **Expected**: < 500ms
6. [ ] Navigate to appointments
7. [ ] **Measure**: `/api/appointments` response time
8. [ ] **Expected**: < 500ms

**Results**:
- `/api/patients`: _______ ms
- `/api/appointments`: _______ ms
- `/api/vitals`: _______ ms
- `/api/ai/status`: _______ ms

---

### Resource Loading Tests

1. [ ] Check total page size
2. [ ] **Expected**: < 2MB for dashboard
3. [ ] Count HTTP requests
4. [ ] **Expected**: < 50 requests
5. [ ] Check for unused resources
6. [ ] Check for duplicate requests

**Results**:
- Total page size: _______ MB
- Total requests: _______
- Unused resources: _______

---

### Memory Leak Tests

1. [ ] Open Performance tab
2. [ ] Take heap snapshot
3. [ ] Perform actions (navigate, open modals, etc.)
4. [ ] Take another heap snapshot
5. [ ] Compare snapshots
6. [ ] **Check**: Memory usage doesn't grow excessively

**Results**: Pass / Fail

**Notes**: _______________________________

---

## Security Testing

### Authentication Tests

#### Test S1: Session Persistence
- [ ] Login successfully
- [ ] Note session cookie
- [ ] Close browser
- [ ] Reopen browser
- [ ] Navigate to dashboard
- [ ] **Expected**: Session persists (or requires re-login depending on settings)

#### Test S2: Logout Security
- [ ] Login successfully
- [ ] Copy current URL
- [ ] Logout
- [ ] Paste URL in new tab
- [ ] **Expected**: Redirect to login page
- [ ] Try accessing `/api/patients` directly
- [ ] **Expected**: 401 Unauthorized

#### Test S3: Session Timeout
- [ ] Login successfully
- [ ] Wait for session timeout (24 hours or configured time)
- [ ] Attempt to access protected resource
- [ ] **Expected**: Session expired, redirect to login

#### Test S4: Multiple Sessions
- [ ] Login in Browser A
- [ ] Login in Browser B with same account
- [ ] Perform action in Browser A
- [ ] Perform action in Browser B
- [ ] **Check**: No conflicts or errors

---

### Authorization Tests

#### Test S5: Role-Based Access Control
- [ ] Login as patient
- [ ] Try accessing `/api/stats` (admin only)
- [ ] **Expected**: 403 Forbidden
- [ ] Try accessing `/api/patients` (doctor/admin only)
- [ ] **Expected**: 403 Forbidden

#### Test S6: Data Isolation
- [ ] Login as patient A
- [ ] Try accessing patient B's data via API
- [ ] **Expected**: 403 Forbidden or 404 Not Found
- [ ] Verify patient can only see own data

---

### Input Validation Tests

#### Test S7: XSS Prevention
- [ ] Login as patient
- [ ] Try entering `<script>alert('XSS')</script>` in symptom field
- [ ] **Expected**: Escaped or sanitized, no alert appears

#### Test S8: SQL Injection (if applicable)
- [ ] Try entering `' OR '1'='1` in email field
- [ ] **Expected**: Treated as literal string, no SQL execution

#### Test S9: CSRF Protection
- [ ] Check if forms have CSRF tokens (if implemented)
- [ ] Verify POST requests include proper headers

---

### Data Security Tests

#### Test S10: Password Security
- [ ] Inspect network traffic during login
- [ ] **Check**: Password sent over HTTPS
- [ ] **Check**: Password not visible in logs
- [ ] Check database (if accessible)
- [ ] **Check**: Passwords are hashed (bcrypt)

#### Test S11: Sensitive Data Exposure
- [ ] Inspect API responses
- [ ] **Check**: No passwords in responses
- [ ] **Check**: No sensitive tokens exposed
- [ ] Check browser storage (localStorage, sessionStorage)
- [ ] **Check**: No sensitive data stored unencrypted

---

## Accessibility Testing

### Keyboard Navigation Tests

#### Test A1: Tab Navigation
- [ ] Navigate site using Tab key only
- [ ] **Check**: All interactive elements reachable
- [ ] **Check**: Focus indicators visible
- [ ] **Check**: Logical tab order

#### Test A2: Keyboard Shortcuts
- [ ] Enter key submits forms
- [ ] Escape key closes modals
- [ ] Arrow keys navigate lists (if applicable)

---

### Screen Reader Tests

#### Test A3: Screen Reader Compatibility
- [ ] Use NVDA (Windows) or VoiceOver (Mac)
- [ ] Navigate login page
- [ ] **Check**: All labels read correctly
- [ ] **Check**: Buttons have descriptive names
- [ ] Navigate dashboard
- [ ] **Check**: Content structure logical
- [ ] **Check**: Charts have alt text or ARIA labels

---

### Visual Accessibility Tests

#### Test A4: Color Contrast
- [ ] Use browser extension (e.g., WAVE, axe DevTools)
- [ ] Check color contrast ratios
- [ ] **Expected**: WCAG AA compliant (4.5:1 for text)
- [ ] Check for color-only indicators
- [ ] **Check**: Information not conveyed by color alone

#### Test A5: Font Size & Zoom
- [ ] Zoom browser to 200%
- [ ] **Check**: Layout doesn't break
- [ ] **Check**: Text remains readable
- [ ] **Check**: No horizontal scrolling

---

### Semantic HTML Tests

#### Test A6: HTML Structure
- [ ] Inspect HTML with DevTools
- [ ] **Check**: Proper heading hierarchy (h1, h2, h3)
- [ ] **Check**: Form labels associated with inputs
- [ ] **Check**: ARIA roles used appropriately
- [ ] **Check**: Landmark regions (nav, main, footer)

---

## Issue Reporting Template

Use this template when reporting issues:

```markdown
### Issue Title: [Brief description]

**Severity**: Critical / High / Medium / Low

**Environment**:
- URL: [localhost or production]
- Browser: [Chrome 120, Firefox 115, etc.]
- OS: [Windows 11, macOS 14, etc.]
- Screen Size: [1920x1080, mobile, etc.]

**User Role**: Admin / Doctor / Patient

**Steps to Reproduce**:
1. [First step]
2. [Second step]
3. [...]

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happened]

**Console Errors** (if any):
```
[Paste console errors here]
```

**Network Errors** (if any):
[API endpoint, status code, response]

**Screenshots**:
[Attach screenshots]

**Additional Notes**:
[Any other relevant information]
```

---

## Testing Checklist Summary

### Critical Path Tests (Must Pass)
- [ ] Login/Logout works for all roles
- [ ] Patient can view own data
- [ ] Doctor can view patient list
- [ ] Admin can view statistics
- [ ] Appointments can be created
- [ ] Prescriptions can be created
- [ ] AI Assistant opens and submits
- [ ] Vitals display correctly
- [ ] No critical console errors
- [ ] No failed API requests

### High Priority Tests (Should Pass)
- [ ] Charts render correctly
- [ ] Forms validate properly
- [ ] Error messages display
- [ ] Loading states show
- [ ] Role-based access enforced
- [ ] Session persists correctly
- [ ] Mobile responsive
- [ ] Cross-browser compatible

### Medium Priority Tests (Nice to Have)
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Performance acceptable
- [ ] No memory leaks
- [ ] Accessibility compliant
- [ ] SEO optimized

---

## Test Execution Notes

**Tester Name**: _______________________________

**Test Date**: _______________________________

**Environment**: Local / Production

**Overall Status**: Pass / Fail / Needs Review

**Critical Issues Found**: _______

**High Priority Issues**: _______

**Medium Priority Issues**: _______

**Low Priority Issues**: _______

**Recommendations**:
________________________________________________
________________________________________________
________________________________________________

**Sign-off**: _______________________________
