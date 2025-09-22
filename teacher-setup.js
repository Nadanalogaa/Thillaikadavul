// Quick script to populate teacher data for testing
// Run this in browser console while logged in as admin

const sampleCourseExpertise = ['Bharatanatyam', 'Vocal'];

const sampleTimingPreferences = [
    {
        id: '1',
        courseId: 'bharatanatyam-1',
        courseName: 'Bharatanatyam',
        day: 'Monday',
        timeSlot: '10:00 AM - 11:00 AM',
        utcTime: '2024-01-01T04:30:00.000Z',
        localTime: '10:00 AM - 11:00 AM',
        istTime: '10:00 AM - 11:00 AM IST',
        timezone: 'Asia/Kolkata'
    },
    {
        id: '2', 
        courseId: 'bharatanatyam-2',
        courseName: 'Bharatanatyam',
        day: 'Wednesday',
        timeSlot: '6:00 PM - 7:00 PM',
        utcTime: '2024-01-01T12:30:00.000Z',
        localTime: '6:00 PM - 7:00 PM',
        istTime: '6:00 PM - 7:00 PM IST',
        timezone: 'Asia/Kolkata'
    },
    {
        id: '3',
        courseId: 'vocal-1', 
        courseName: 'Vocal',
        day: 'Tuesday',
        timeSlot: '4:00 PM - 5:00 PM',
        utcTime: '2024-01-01T10:30:00.000Z',
        localTime: '4:00 PM - 5:00 PM',
        istTime: '4:00 PM - 5:00 PM IST',
        timezone: 'Asia/Kolkata'
    },
    {
        id: '4',
        courseId: 'vocal-2',
        courseName: 'Vocal', 
        day: 'Friday',
        timeSlot: '11:00 AM - 12:00 PM',
        utcTime: '2024-01-01T05:30:00.000Z',
        localTime: '11:00 AM - 12:00 PM',
        istTime: '11:00 AM - 12:00 PM IST',
        timezone: 'Asia/Kolkata'
    }
];

// SQL to run directly in Supabase SQL editor:
console.log(`
-- Update teacher Ayyappan with course expertise and timing preferences
UPDATE users 
SET 
    course_expertise = '${JSON.stringify(sampleCourseExpertise)}',
    available_time_slots = '${JSON.stringify(sampleTimingPreferences)}',
    educational_qualifications = 'Master of Fine Arts in Classical Dance',
    employment_type = 'Full-time',
    years_of_experience = 10,
    updated_at = NOW()
WHERE email = 'ayyappan@ayyappan.com' AND role = 'Teacher';
`);

// Alternative: If you want to use the admin panel, use this data:
console.log('Sample data for admin panel:');
console.log('Course Expertise:', sampleCourseExpertise);
console.log('Available Time Slots:', sampleTimingPreferences);