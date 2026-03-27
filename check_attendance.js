import Database from 'better-sqlite3';

try {
    const db = new Database('eduai.db');
    const students = db.prepare("SELECT id, name FROM students").all();

    console.log("Attendance Audit Report:");
    console.log("-----------------------");

    students.forEach(s => {
        const attendance = db.prepare("SELECT status, subject_id FROM attendance WHERE student_id = ?").all(s.id);
        const total = attendance.length;
        const present = attendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
        const rate = total > 0 ? (present / total) * 100 : 0;
        
        console.log(`Student: ${s.name} (ID: ${s.id})`);
        console.log(`  Total Records: ${total}`);
        console.log(`  Attended: ${present}`);
        console.log(`  Calculated Rate: ${rate.toFixed(2)}%`);
        
        // Subject-wise breakdown
        const subjectIds = [...new Set(attendance.map(a => a.subject_id))];
        subjectIds.forEach(subId => {
            const subAttendance = attendance.filter(a => a.subject_id === subId);
            const subTotal = subAttendance.length;
            const subPresent = subAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
            const subRate = subTotal > 0 ? (subPresent / subTotal) * 100 : 0;
            console.log(`    Subject ID ${subId}: ${subRate.toFixed(2)}% (${subPresent}/${subTotal})`);
        });
        console.log("-----------------------");
    });

    db.close();
} catch (err) {
    console.error("Audit failed:", err);
    process.exit(1);
}
