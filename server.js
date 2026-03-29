import express from "express";
import bodyParser from "body-parser";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import sqlite3 from "better-sqlite3";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const { execSync, spawn } = require("child_process");
const pdf = require("pdf-parse"); // ✅ works with CommonJS

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "eduai-secret-key-2026";

// Database Setup
// Database Setup
const db = new sqlite3("eduai.db");
db.pragma("foreign_keys = ON");

// Initialize Base Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    username TEXT UNIQUE,
    password TEXT
  );

  CREATE TABLE IF NOT EXISTS teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    username TEXT UNIQUE,
    password TEXT,
    department TEXT,
    isClassTeacher BOOLEAN DEFAULT 0,
    assignedClass TEXT,
    assignedSemester INTEGER
  );

  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    username TEXT UNIQUE,
    password TEXT,
    class TEXT,
    semester INTEGER,
    points INTEGER DEFAULT 0,
    stars INTEGER DEFAULT 0,
    tenthMarks REAL,
    twelfthMarks REAL,
    fatherName TEXT,
    motherName TEXT,
    fatherNumber TEXT,
    motherNumber TEXT,
    problemSubjects TEXT, -- JSON
    problemTopics TEXT    -- JSON
  );

  CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    semester INTEGER,
    class TEXT,
    year INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS teacher_subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER,
    subject_id INTEGER,
    FOREIGN KEY(teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS marks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    subject_id INTEGER,
    semester INTEGER,
    marks INTEGER,
    teacher_id INTEGER,
    detailed_data TEXT,
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY(teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    subject_id INTEGER,
    date TEXT,
    time TEXT,
    status TEXT,
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER,
    student_id INTEGER,
    subject_id INTEGER,
    title TEXT,
    marks INTEGER,
    score INTEGER,
    feedback TEXT,
    priority INTEGER DEFAULT 0,
    due_date TEXT,
    is_completed BOOLEAN DEFAULT 0,
    file_url TEXT,
    FOREIGN KEY(teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS flashcards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER,
    subject_id INTEGER,
    student_id INTEGER,
    question TEXT,
    answer TEXT,
    level TEXT DEFAULT 'Beginner',
    FOREIGN KEY(teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER,
    subject_id INTEGER,
    student_id INTEGER,
    title TEXT,
    questions TEXT, -- JSON string
    level TEXT DEFAULT 'Beginner',
    FOREIGN KEY(teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS quiz_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    quiz_id INTEGER,
    score INTEGER,
    total INTEGER,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY(quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    title TEXT,
    description TEXT,
    points INTEGER,
    is_completed BOOLEAN DEFAULT 0,
    type TEXT, -- 'improvement', 'revision', 'quiz', 'flashcard'
    priority INTEGER DEFAULT 0,
    due_date TEXT,
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    title TEXT,
    description TEXT,
    icon TEXT,
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS timetable (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class TEXT,
    semester INTEGER,
    subject TEXT,
    teacher TEXT,
    day TEXT,
    time TEXT
  );

  CREATE TABLE IF NOT EXISTS cgpa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    semester INTEGER,
    cgpa REAL,
    UNIQUE(student_id, semester),
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS verification_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    field TEXT,
    old_value TEXT,
    new_value TEXT,
    status TEXT DEFAULT 'pending',
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    role TEXT,
    message TEXT,
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const migrations = {
  teachers: [
    { name: "department", type: "TEXT" },
    { name: "isClassTeacher", type: "BOOLEAN DEFAULT 0" },
    { name: "assignedClass", type: "TEXT" },
    { name: "assignedSemester", type: "INTEGER" }
  ],
  students: [
    { name: "tenthMarks", type: "REAL" },
    { name: "twelfthMarks", type: "REAL" },
    { name: "fatherName", type: "TEXT" },
    { name: "motherName", type: "TEXT" },
    { name: "fatherNumber", type: "TEXT" },
    { name: "motherNumber", type: "TEXT" },
    { name: "problemSubjects", type: "TEXT" },
    { name: "problemTopics", type: "TEXT" }
  ],
  attendance: [
    { name: "time", type: "TEXT" }
  ],
  marks: [
    { name: "detailed_data", type: "TEXT" }
  ],
  flashcards: [
    { name: "subject_id", type: "INTEGER" },
    { name: "student_id", type: "INTEGER" },
    { name: "level", type: "TEXT DEFAULT 'Beginner'" }
  ],
  quizzes: [
    { name: "subject_id", type: "INTEGER" },
    { name: "student_id", type: "INTEGER" },
    { name: "level", type: "TEXT DEFAULT 'Beginner'" }
  ],
  assignments: [
    { name: "file_url", type: "TEXT" }
  ],
  achievements: [
    { name: "description", type: "TEXT" }
  ],
  subjects: [
    { name: "year", type: "INTEGER DEFAULT 1" }
  ]
};

// ── Database Migration System (Robust Schema Evolution) ────────────────────────
Object.entries(migrations).forEach(([table, columns]) => {
  try {
    const tableInfo = db.prepare(`PRAGMA table_info(${table})`).all();
    const currentColumns = tableInfo.map(c => c.name);
    
    columns.forEach(col => {
      if (!currentColumns.includes(col.name)) {
        try {
          db.exec(`ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.type}`);
          console.log(`Migration: Added ${col.name} to ${table} table.`);
        } catch (err) {
          console.error(`Migration error for ${table}.${col.name}:`, err.message);
        }
      }
    });
  } catch (err) {
    console.error(`Failed to check schema for table ${table}:`, err.message);
  }
});

// Seed Admin if not exists
const adminExists = db
  .prepare("SELECT * FROM admins WHERE username = ?")
  .get("admin");
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync("admin", 10);
  db.prepare(
    "INSERT INTO admins (name, username, password) VALUES (?, ?, ?)",
  ).run("System Admin", "admin", hashedPassword);
} else {
  // Force update to 'admin' as requested
  const hashedPassword = bcrypt.hashSync("admin", 10);
  db.prepare("UPDATE admins SET password = ? WHERE username = ?").run(
    hashedPassword,
    "admin",
  );
}


// Seed Subjects if none exist
const subjectsCount = db
  .prepare("SELECT COUNT(*) as count FROM subjects")
  .get().count;
if (subjectsCount < 50) {
  db.prepare("DELETE FROM subjects").run();
  const seedSubjects = [
    // Semester 1 (S1)
    {
      name: "GAMAT101 – Mathematics for Information Science-1 (Linear Algebra)",
      semester: 1,
      class: "computer science",
    },
    {
      name: "GAPHT121 – Physics for Information Science",
      semester: 1,
      class: "computer science",
    },
    {
      name: "GACYT122 – Chemistry for Information Science",
      semester: 1,
      class: "computer science",
    },
    {
      name: "GXEST103 – Engineering Graphics and Computer Aided Drawing",
      semester: 1,
      class: "computer science",
    },
    {
      name: "GXEST104 – Introduction to Electrical and Electronics Engineering",
      semester: 1,
      class: "computer science",
    },
    {
      name: "UCEST105 – Algorithmic Thinking with Python",
      semester: 1,
      class: "computer science",
    },
    {
      name: "GAESL106 – Basic Electrical and Electronics Engineering Workshop",
      semester: 1,
      class: "computer science",
    },
    { name: "UCPST127 – Health and Wellness", semester: 1, class: "computer science" },
    {
      name: "UCHUT128 – Life Skills and Professional Communication",
      semester: 1,
      class: "computer science",
    },
    {
      name: "UCSEM129 – Skill Enhancement Course: Digital 101 (NASSCOM MOOC)",
      semester: 1,
      class: "computer science",
    },

    // Semester 2 (S2)
    {
      name: "VECTOR CALCULUS, DIFFERENTIAL EQUATIONS",
      semester: 2,
      class: "computer science",
    },
    { name: "ENGINEERING PHYSICS", semester: 2, class: "computer science" },
    { name: "ENGINEERING GRAPHICS", semester: 2, class: "computer science" },
    { name: "PROGRAMMING IN C", semester: 2, class: "computer science" },
    { name: "ENGINEERING CHEMISTRY", semester: 2, class: "computer science" },
    { name: "ENGINEERING MECHANICS", semester: 2, class: "computer science" },
    { name: "PROFESSIONAL COMMUNICATION", semester: 2, class: "computer science" },
    { name: "BASICS OF CIVIL & MECHANICAL", semester: 2, class: "computer science" },
    { name: "BASICS OF ELECTRICAL & ELECTRONICS", semester: 2, class: "computer science" },

    // Semester 3 (S3)
    { name: "DISCRETE MATHEMATICAL STRUCTURES", semester: 3, class: "computer science" },
    { name: "OBJECT ORIENTED PROGRAMMING JAVA", semester: 3, class: "computer science" },
    { name: "Data Structures", semester: 3, class: "computer science" },
    { name: "Logic System Design", semester: 3, class: "computer science" },
    { name: "Sustainable Engineering", semester: 3, class: "computer science" },
    { name: "DESIGN & ENGINEERING", semester: 3, class: "computer science" },

    // Semester 4 (S4)
    { name: "COMPUTER ORGANISATION & ARCHITECTURE", semester: 4, class: "computer science" },
    { name: "GRAPH THEORY", semester: 4, class: "computer science" },
    { name: "DATABASE MANAGEMENT SYSTEMS", semester: 4, class: "computer science" },
    { name: "OPERATING SYSTEMS", semester: 4, class: "computer science" },
    { name: "CONSTITUTION OF INDIA", semester: 4, class: "computer science" },
    { name: "PROFESSIONAL ETHICS", semester: 4, class: "computer science" },

    // Semester 5 (S5)
    { name: "FORMAL LANGUAGES & AUTOMATA THEORY", semester: 5, class: "computer science" },
    { name: "MANAGEMENT OF SOFTWARE SYSTEMS", semester: 5, class: "computer science" },
    { name: "MICROPROCESSORS AND MICROCONTROLLERS", semester: 5, class: "computer science" },
    { name: "COMPUTER NETWORKS", semester: 5, class: "computer science" },
    { name: "SYSTEM SOFTWARE", semester: 5, class: "computer science" },
    { name: "DISASTER MANAGEMENT", semester: 5, class: "computer science" },

    // Semester 6 (S6)
    { name: "COMPUTER GRAPHICS & IMAGE PROCESSING", semester: 6, class: "computer science" },
    { name: "ALGORITHM ANALYSIS & DESIGN", semester: 6, class: "computer science" },
    { name: "COMPILER DESIGN", semester: 6, class: "computer science" },
    { name: "INDUSTRIAL ECONOMIC & FOREIGN TRADE", semester: 6, class: "computer science" },

    // Semester 7 (S7)
    { name: "NATURAL LANGUAGE PROCESSING", semester: 7, class: "computer science" },
    { name: "MACHINE LEARNING", semester: 7, class: "computer science" },
    { name: "CLOUD COMPUTING", semester: 7, class: "computer science" },
    { name: "ARTIFICIAL INTELLIGENCE", semester: 7, class: "computer science" },
    { name: "WEB PROGRAMMING", semester: 7, class: "computer science" },
    { name: "COMPUTER GRAPHICS", semester: 7, class: "computer science" },

    // Semester 8 (S8)
    { name: "DISTRIBUTED COMPUTING", semester: 8, class: "computer science" },
    { name: "EMBEDDED SYSTEM", semester: 8, class: "computer science" },
    { name: "INTERNET OF THINGS", semester: 8, class: "computer science" },
    { name: "INDUSTRIAL SAFETY ENGINEERING", semester: 8, class: "computer science" },
  ];

  const insertSubject = db.prepare(
    "INSERT INTO subjects (name, semester, class, year) VALUES (?, ?, ?, ?)",
  );
  const classes = ["computer science", "SOE", "Data Science", "Artificial Intelligence"];

  classes.forEach((c) => {
    seedSubjects.forEach((s) => {
      // Calculate year based on semester: 1-2=Yr1, 3-4=Yr2, 5-6=Yr3, 7-8=Yr4
      const year = Math.ceil(s.semester / 2);
      insertSubject.run(s.name, s.semester, c, year);
    });
  });
  const timetableCount = db
    .prepare("SELECT COUNT(*) as count FROM timetable")
    .get().count;
  if (timetableCount === 0) {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const times = [
      "09:00 AM",
      "10:00 AM",
      "11:15 AM",
      "12:15 PM",
      "02:00 PM",
      "03:00 PM",
    ];
    const insertTimetable = db.prepare(
      "INSERT INTO timetable (class, semester, subject, teacher, day, time) VALUES (?, ?, ?, ?, ?, ?)",
    );

    classes.forEach((c) => {
      for (let s = 1; s <= 8; s++) {
        const classSubjects = seedSubjects.filter(
          (sub) => sub.semester === s && sub.class === c,
        );
        if (classSubjects.length > 0) {
          days.forEach((day) => {
            // Add 3-4 subjects per day
            for (let i = 0; i < 4; i++) {
              const sub =
                classSubjects[Math.floor(Math.random() * classSubjects.length)];
              insertTimetable.run(c, s, sub.name, "Dr. Smith", day, times[i]);
            }
          });
        }
      }
    });
  }

  // Seed Achievements
  const studentCount = db
    .prepare("SELECT COUNT(*) as count FROM students")
    .get().count;
  if (studentCount > 0) {
    const achievementCount = db
      .prepare("SELECT COUNT(*) as count FROM achievements")
      .get().count;
    if (achievementCount === 0) {
      const students = db.prepare("SELECT id FROM students").all();
      const insertAchievement = db.prepare(
        "INSERT INTO achievements (student_id, title, description, icon) VALUES (?, ?, ?, ?)",
      );

      students.forEach((student) => {
        insertAchievement.run(
          student.id,
          "First Step",
          "Completed your first assignment!",
          "Star",
        );
        insertAchievement.run(
          student.id,
          "Perfect Attendance",
          "Maintained 100% attendance for a week",
          "CheckCircle",
        );
        insertAchievement.run(
          student.id,
          "Quiz Master",
          "Scored 100% on a quiz",
          "Target",
        );
      });
    }
  }
}

app.use(express.json({
  limit: "100mb",
}));
app.use(bodyParser.json({
  limit: "100mb"
}));
app.use(express.urlencoded({ extended: true }));

// Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

app.post(
  "/api/upload",
  authenticateToken,
  upload.single("file"),
  (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ fileUrl });
  },
);

// Auth Routes
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  let user;
  let detectedRole = "";

  // Try Admin
  user = db.prepare("SELECT * FROM admins WHERE username = ?").get(username);
  if (user) detectedRole = "admin";

  // Try Teacher
  if (!user) {
    user = db
      .prepare("SELECT * FROM teachers WHERE username = ?")
      .get(username);
    if (user) detectedRole = "teacher";
  }

  // Try Student
  if (!user) {
    user = db
      .prepare("SELECT * FROM students WHERE username = ?")
      .get(username);
    if (user) detectedRole = "student";
  }

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: detectedRole, name: user.name },
    JWT_SECRET,
  );
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: detectedRole,
      ...user,
    },
  });
});

app.post("/api/auth/register-teacher", (req, res) => {
  const { name, username, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  try {
    const result = db
      .prepare(
        "INSERT INTO teachers (name, username, password) VALUES (?, ?, ?)",
      )
      .run(name, username, hashedPassword);
    res.json({ id: result.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ message: "Username already exists" });
  }
});

// Admin Routes
app.get("/api/admin/teachers", authenticateToken, (req, res) => {
  if (req.user.role !== "admin") return res.sendStatus(403);
  const teachers = db
    .prepare(
      "SELECT id, name, username, department, isClassTeacher, assignedClass, assignedSemester FROM teachers",
    )
    .all();
  res.json(teachers);
});

app.delete("/api/admin/teachers/:id", authenticateToken, (req, res) => {
  if (req.user.role !== "admin") return res.sendStatus(403);
  const teacherId = req.params.id;

  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM teacher_subjects WHERE teacher_id = ?").run(
      teacherId,
    );
    db.prepare("DELETE FROM marks WHERE teacher_id = ?").run(teacherId);
    db.prepare("DELETE FROM assignments WHERE teacher_id = ?").run(teacherId);
    db.prepare("DELETE FROM flashcards WHERE teacher_id = ?").run(teacherId);
    db.prepare("DELETE FROM quizzes WHERE teacher_id = ?").run(teacherId);
    db.prepare("DELETE FROM teachers WHERE id = ?").run(teacherId);
  });

  transaction();
  res.json({ success: true });
});

app.put("/api/admin/teachers/:id", authenticateToken, (req, res) => {
  if (req.user.role !== "admin") return res.sendStatus(403);
  const {
    name,
    username,
    department,
    isClassTeacher,
    assignedClass,
    assignedSemester,
  } = req.body;
  db.prepare(
    "UPDATE teachers SET name = ?, username = ?, department = ?, isClassTeacher = ?, assignedClass = ?, assignedSemester = ? WHERE id = ?",
  ).run(
    name,
    username,
    department,
    isClassTeacher ? 1 : 0,
    assignedClass,
    assignedSemester,
    req.params.id,
  );
  res.json({ success: true });
});

app.post("/api/admin/teachers", authenticateToken, (req, res) => {
  if (req.user.role !== "admin") return res.sendStatus(403);
  const {
    name,
    username,
    password,
    department,
    isClassTeacher,
    assignedClass,
    assignedSemester,
  } = req.body;

  if (!name || !username || !password) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    // Check if username exists in any role table
    const admin = db
      .prepare("SELECT id FROM admins WHERE LOWER(username) = LOWER(?)")
      .get(username);
    const teacher = db
      .prepare("SELECT id FROM teachers WHERE LOWER(username) = LOWER(?)")
      .get(username);
    const student = db
      .prepare("SELECT id FROM students WHERE LOWER(username) = LOWER(?)")
      .get(username);

    if (admin || teacher || student) {
      return res.status(400).json({ message: "Username already taken" });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db
      .prepare(
        "INSERT INTO teachers (name, username, password, department, isClassTeacher, assignedClass, assignedSemester) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        name,
        username,
        hashedPassword,
        department,
        isClassTeacher ? 1 : 0,
        assignedClass,
        assignedSemester,
      );
    res.json({ id: result.lastInsertRowid });
  } catch (e) {
    console.error(e);
    res.status(400).json({ message: e.message || "Error creating teacher" });
  }
});

app.get("/api/admin/students", authenticateToken, (req, res) => {
  if (req.user.role !== "admin") return res.sendStatus(403);
  const students = db
    .prepare(
      "SELECT id, name, username, class, semester, points, stars, tenthMarks, twelfthMarks, fatherName, motherName, fatherNumber, motherNumber, problemSubjects FROM students",
    )
    .all();

  const studentsWithStats = students.map((s) => {
    const marks = db
      .prepare("SELECT AVG(marks) as avg FROM marks WHERE student_id = ?")
      .get(s.id);
    
    const attendanceRecords = db
      .prepare("SELECT status, subject_id FROM attendance WHERE student_id = ?")
      .all(s.id);
    const attendedClasses = attendanceRecords.filter(
      (a) => a.status === "Present" || a.status === "Late",
    ).length;

    
    // For a simpler overall total, we can just take the max total records for any student in this class
    const overallMaxQuery = db.prepare(`
      SELECT MAX(cnt) as max_cnt FROM (
        SELECT COUNT(*) as cnt FROM attendance WHERE student_id IN (SELECT id FROM students WHERE class = ? AND semester = ?) GROUP BY student_id
      )
    `).get(s.class, s.semester);

    const totalClasses = overallMaxQuery.max_cnt || attendanceRecords.length;
    const attendanceRate = totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100) : 0;

    return {
      ...s,
      avgMarks: marks.avg ? Math.round(marks.avg) : 0,
      attendance: attendanceRate,
      attendedClasses,
      totalClasses,
    };
  });

  res.json(studentsWithStats);
});

app.get("/api/admin/students/:id", authenticateToken, (req, res) => {
  if (req.user.role !== "admin") return res.sendStatus(403);
  const student = db
    .prepare(
      "SELECT id, name, username, class, semester, points, stars, tenthMarks, twelfthMarks, fatherName, motherName, fatherNumber, motherNumber, problemSubjects FROM students WHERE id = ?",
    )
    .get(req.params.id);
  if (!student) return res.status(404).json({ message: "Student not found" });

  const marks = db
    .prepare(
      "SELECT m.*, s.name as subject_name FROM marks m JOIN subjects s ON m.subject_id = s.id WHERE m.student_id = ?",
    )
    .all(req.params.id);
  const attendance = db
    .prepare(
      "SELECT a.*, s.name as subject_name FROM attendance a JOIN subjects s ON a.subject_id = s.id WHERE a.student_id = ?",
    )
    .all(req.params.id);

  res.json({ ...student, marks, attendance });
});

app.delete("/api/admin/students/:id", authenticateToken, (req, res) => {
  if (req.user.role !== "admin") return res.sendStatus(403);
  const studentId = req.params.id;

  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM marks WHERE student_id = ?").run(studentId);
    db.prepare("DELETE FROM attendance WHERE student_id = ?").run(studentId);
    db.prepare("DELETE FROM assignments WHERE student_id = ?").run(studentId);
    db.prepare("DELETE FROM quiz_results WHERE student_id = ?").run(studentId);
    db.prepare("DELETE FROM tasks WHERE student_id = ?").run(studentId);
    db.prepare("DELETE FROM achievements WHERE student_id = ?").run(studentId);
    db.prepare("DELETE FROM cgpa WHERE student_id = ?").run(studentId);
    db.prepare("DELETE FROM verification_requests WHERE student_id = ?").run(
      studentId,
    );
    db.prepare(
      "DELETE FROM notifications WHERE user_id = ? AND role = 'student'",
    ).run(studentId);
    db.prepare("DELETE FROM students WHERE id = ?").run(studentId);
  });

  transaction();
  res.json({ success: true });
});

app.put("/api/admin/students/:id", authenticateToken, (req, res) => {
  if (req.user.role !== "admin") return res.sendStatus(403);
  const {
    name,
    username,
    class: className,
    semester,
    points,
    stars,
    fatherName,
    fatherNumber,
    motherName,
    motherNumber
  } = req.body;
  db.prepare(
    "UPDATE students SET name = ?, username = ?, class = ?, semester = ?, points = ?, stars = ?, fatherName = ?, fatherNumber = ?, motherName = ?, motherNumber = ? WHERE id = ?",
  ).run(name, username, className, semester, points, stars, fatherName, fatherNumber, motherName, motherNumber, req.params.id);
  res.json({ success: true });
});

app.post("/api/teacher/students", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher" && req.user.role !== "admin")
    return res.sendStatus(403);
  const { name, username, password, class: className, semester, fatherName, fatherNumber, motherName, motherNumber } = req.body;

  if (!name || !username || !password) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    // Check if username exists in any role table
    const admin = db
      .prepare("SELECT id FROM admins WHERE username = ?")
      .get(username);
    const teacher = db
      .prepare("SELECT id FROM teachers WHERE username = ?")
      .get(username);
    const student = db
      .prepare("SELECT id FROM students WHERE username = ?")
      .get(username);

    if (admin || teacher || student) {
      return res.status(400).json({ message: "Username already taken" });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db
      .prepare(
        "INSERT INTO students (name, username, password, class, semester, fatherName, fatherNumber, motherName, motherNumber) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run(name, username, hashedPassword, className, semester, fatherName || null, fatherNumber || null, motherName || null, motherNumber || null);
    res.json({ id: result.lastInsertRowid });
  } catch (e) {
    console.error(e);
    res.status(400).json({ message: e.message || "Error creating student" });
  }
});

app.get("/api/teacher/students", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher" && req.user.role !== "admin")
    return res.sendStatus(403);

  let students;
  if (req.user.role === "admin") {
    students = db
      .prepare(
        "SELECT id, name, username, class, semester, points, stars, tenthMarks, twelfthMarks, fatherName, motherName, fatherNumber, motherNumber, problemSubjects FROM students",
      )
      .all();
  } else {
    // For teachers: Return students from THEIR assigned class (if class teacher)
    // AND students in classes/semesters where they teach a subject.
    const teacher = db
      .prepare(
        "SELECT isClassTeacher, assignedClass, assignedSemester FROM teachers WHERE id = ?",
      )
      .get(req.user.id);

    if (teacher) {
      // If class teacher, show ALL students in their assigned class
      // AND students in any other classes/subjects they teach
      students = db
        .prepare(
          `
          SELECT DISTINCT s.* 
          FROM students s
          LEFT JOIN subjects sub ON s.class = sub.class AND s.semester = sub.semester
          LEFT JOIN teacher_subjects ts ON sub.id = ts.subject_id
          WHERE (s.class = ? AND (? IS NULL OR s.semester = ?))
          OR ts.teacher_id = ?
          `,
        )
        .all(teacher.assignedClass, teacher.assignedSemester, teacher.assignedSemester, req.user.id);
    } else {
      students = [];
    }
  }

  // Add real marks and attendance stats to each student
  const studentsWithStats = students.map((s) => {
    const marks = db
      .prepare("SELECT AVG(marks) as avg FROM marks WHERE student_id = ?")
      .get(s.id);
    
    const attendanceRecords = db
      .prepare("SELECT status FROM attendance WHERE student_id = ?")
      .all(s.id);
    const attendedClasses = attendanceRecords.filter(
      (a) => a.status === "Present" || a.status === "Late",
    ).length;

    // Class Max heuristic
    const overallMaxQuery = db.prepare(`
      SELECT MAX(cnt) as max_cnt FROM (
        SELECT COUNT(*) as cnt FROM attendance WHERE student_id IN (SELECT id FROM students WHERE class = ? AND semester = ?) GROUP BY student_id
      )
    `).get(s.class, s.semester);

    const totalClasses = overallMaxQuery.max_cnt || attendanceRecords.length;
    const attendanceRate = totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100) : 0;

    return {
      ...s,
      avgMarks: marks.avg ? Math.round(marks.avg) : 0,
      attendance: attendanceRate,
      attendedClasses,
      totalClasses,
    };
  });

  res.json(studentsWithStats);
});

// Teacher Dashboard - Student Confidence Analytics
app.get("/api/teacher/student-confidence", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher") return res.sendStatus(403);
  
  const teacher = db.prepare("SELECT assignedClass, assignedSemester FROM teachers WHERE id = ?").get(req.user.id);
  if (!teacher) return res.status(404).json({ message: "Teacher not found" });

  const students = db.prepare(`
    SELECT DISTINCT s.id, s.name, s.class, s.semester, s.problemSubjects, s.problemTopics
    FROM students s
    LEFT JOIN subjects sub ON s.class = sub.class AND s.semester = sub.semester
    LEFT JOIN teacher_subjects ts ON sub.id = ts.subject_id
    WHERE (s.class = ? AND (? IS NULL OR s.semester = ?))
    OR ts.teacher_id = ?
  `).all(teacher.assignedClass, teacher.assignedSemester, teacher.assignedSemester, req.user.id);

  const confidenceData = students.map(s => ({
    ...s,
    problemSubjects: s.problemSubjects ? JSON.parse(s.problemSubjects) : [],
    problemTopics: s.problemTopics ? JSON.parse(s.problemTopics) : []
  }));

  res.json(confidenceData);
});

// Marks & Attendance
app.get("/api/marks/:studentId", authenticateToken, (req, res) => {
  const marks = db
    .prepare(
      "SELECT m.*, s.name as subject_name FROM marks m JOIN subjects s ON m.subject_id = s.id WHERE m.student_id = ?",
    )
    .all(req.params.studentId);
  res.json(marks);
});

app.get("/api/faculty", authenticateToken, (req, res) => {
  const teachers = db
    .prepare("SELECT id, name, 'teacher' as role FROM teachers")
    .all();
  const admins = db
    .prepare("SELECT id, name, 'admin' as role FROM admins")
    .all();
  res.json([...teachers, ...admins]);
});

app.post("/api/marks", authenticateToken, (req, res) => {
  const { student_id, subject_id, semester, marks, teacher_id, detailed_data } = req.body;
  const finalTeacherId = teacher_id || req.user.id;
  
  // If detailed_data is provided (object), we calculate the total marks
  let finalMarks = marks;
  let detailedJson = null;

  if (detailed_data && typeof detailed_data === 'object') {
    const d = detailed_data;
    const modulesSum = (d.modules || []).reduce((a, b) => a + (Number(b) || 0), 0);
    const internalsSum = (d.internals || []).reduce((a, b) => a + (Number(b) || 0), 0);
    const assignmentScore = Number(d.assignment) || 0;
    
    // grandTotal / 250 * 100 (Increased from 220 to 250 for 50-mark assignments)
    const grandTotal = modulesSum + internalsSum + assignmentScore;
    finalMarks = Math.round((grandTotal / 250) * 100);
    detailedJson = JSON.stringify(detailed_data);
  }

  // UPSERT LOGIC: Check if marks already exist for this student, subject, and semester
  const existing = db.prepare("SELECT id FROM marks WHERE student_id = ? AND subject_id = ? AND semester = ?").get(student_id, subject_id, semester);

  if (existing) {
    db.prepare(
      "UPDATE marks SET marks = ?, teacher_id = ?, detailed_data = ? WHERE id = ?",
    ).run(finalMarks, finalTeacherId, detailedJson, existing.id);
  } else {
    db.prepare(
      "INSERT INTO marks (student_id, subject_id, semester, marks, teacher_id, detailed_data) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(student_id, subject_id, semester, finalMarks, finalTeacherId, detailedJson);
  }

  // Notify student
  const subject = db
    .prepare("SELECT name FROM subjects WHERE id = ?")
    .get(subject_id);
  const subjectName = subject ? subject.name : `Subject ID ${subject_id}`;
  db.prepare(
    "INSERT INTO notifications (user_id, role, message) VALUES (?, 'student', ?)",
  ).run(student_id, `${existing ? 'Updated' : 'New'} marks added for ${subjectName}: ${finalMarks}% (Detailed logged)`);

  res.json({ success: true, marks: finalMarks });
});

app.get("/api/attendance/:studentId", authenticateToken, (req, res) => {
  const attendance = db
    .prepare(`
      SELECT a.*, s.name AS subject
      FROM attendance a
      LEFT JOIN subjects s ON a.subject_id = s.id
      WHERE a.student_id = ?
      ORDER BY a.date DESC, a.time DESC
    `)
    .all(req.params.studentId);
  res.json(attendance);
});

app.post("/api/attendance", authenticateToken, (req, res) => {
  let { student_id, subject_id, date, time, status } = req.body;

  // Parse as integers — HTML form selects send strings
  const sid = parseInt(student_id);
  const subid = parseInt(subject_id);
  const entryTime = time || new Date().toTimeString().slice(0, 5);

  if (isNaN(sid) || isNaN(subid) || !date || !status) {
    return res.status(400).json({ message: `Missing required fields. Received: student_id=${student_id}, subject_id=${subject_id}, date=${date}, status=${status}` });
  }

  // Validate FK existence
  const studentExists = db.prepare("SELECT id FROM students WHERE id = ?").get(sid);
  if (!studentExists) return res.status(400).json({ message: `Student ID ${sid} does not exist.` });

  const subjectExists = db.prepare("SELECT id, name FROM subjects WHERE id = ?").get(subid);
  if (!subjectExists) return res.status(400).json({ message: `Subject ID ${subid} does not exist.` });

  db.prepare(
    "INSERT INTO attendance (student_id, subject_id, date, time, status) VALUES (?, ?, ?, ?, ?)",
  ).run(sid, subid, date, entryTime, status);

  // Notify student
  const subjectName = subjectExists.name || `Subject ID ${subid}`;
  db.prepare(
    "INSERT INTO notifications (user_id, role, message) VALUES (?, 'student', ?)",
  ).run(
    sid,
    `Attendance marked as ${status} for ${subjectName} on ${date}`,
  );

  res.json({ success: true });
});

app.put("/api/attendance/:id", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher" && req.user.role !== "admin")
    return res.sendStatus(403);
  const { status, date, time } = req.body;
  db.prepare("UPDATE attendance SET status = ?, date = ?, time = ? WHERE id = ?").run(
    status,
    date,
    time || null,
    req.params.id,
  );
  res.json({ success: true });
});

app.delete("/api/attendance/:id", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher" && req.user.role !== "admin")
    return res.sendStatus(403);
  db.prepare("DELETE FROM attendance WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.post("/api/attendance/check-in", authenticateToken, (req, res) => {
  if (req.user.role !== "student") return res.sendStatus(403);
  const { subject_id } = req.body;
  const date = new Date().toISOString().split("T")[0];

  // Check if already checked in today for this subject
  const existing = db
    .prepare(
      "SELECT * FROM attendance WHERE student_id = ? AND subject_id = ? AND date = ?",
    )
    .get(req.user.id, subject_id, date);
  if (existing) {
    return res
      .status(400)
      .json({ message: "Already checked in for this subject today." });
  }

  db.prepare(
    "INSERT INTO attendance (student_id, subject_id, date, status) VALUES (?, ?, ?, ?)",
  ).run(req.user.id, subject_id, date, "Present");

  // Add some points for attendance
  db.prepare("UPDATE students SET points = points + 5 WHERE id = ?").run(
    req.user.id,
  );

  res.json({ success: true });
});

// Subjects
app.get("/api/subjects", authenticateToken, (req, res) => {
  const subjects = db.prepare("SELECT * FROM subjects").all();
  res.json(subjects);
});

app.post("/api/admin/subjects", authenticateToken, (req, res) => {
  if (req.user.role !== "admin") return res.sendStatus(403);
  const { name, semester, class: className, year } = req.body;
  if (!name || !semester || !className) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  try {
    const finalYear = year || Math.ceil(semester / 2);
    const result = db
      .prepare(
        "INSERT INTO subjects (name, semester, class, year) VALUES (?, ?, ?, ?)",
      )
      .run(name, semester, className, finalYear);
    res.json({ id: result.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

app.delete("/api/admin/subjects/:id", authenticateToken, (req, res) => {
  if (req.user.role !== "admin") return res.sendStatus(403);
  try {
    db.prepare("DELETE FROM subjects WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

app.put("/api/admin/subjects/:id", authenticateToken, (req, res) => {
  if (req.user.role !== "admin") return res.sendStatus(403);
  const { name, semester, class: className, year } = req.body;
  try {
    const finalYear = year || Math.ceil(semester / 2);
    db.prepare(
      "UPDATE subjects SET name = ?, semester = ?, class = ?, year = ? WHERE id = ?",
    ).run(name, semester, className, finalYear, req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

app.get("/api/admin/teachers/:id/subjects", authenticateToken, (req, res) => {
  if (req.user.role !== "admin") return res.sendStatus(403);
  const subjects = db
    .prepare(
      "SELECT s.* FROM subjects s JOIN teacher_subjects ts ON s.id = ts.subject_id WHERE ts.teacher_id = ?",
    )
    .all(req.params.id);
  res.json(subjects);
});

app.post("/api/admin/teachers/:id/subjects", authenticateToken, (req, res) => {
  if (req.user.role !== "admin") return res.sendStatus(403);
  const teacherId = req.params.id;
  const { subject_ids } = req.body;

  try {
    const transaction = db.transaction(() => {
      db.prepare("DELETE FROM teacher_subjects WHERE teacher_id = ?").run(
        teacherId,
      );
      const insert = db.prepare(
        "INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES (?, ?)",
      );
      for (const sid of subject_ids) {
        insert.run(teacherId, sid);
      }
    });
    transaction();
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// Assignments
app.get("/api/teacher/subjects", authenticateToken, (req, res) => {
  if (req.user.role === "admin") {
    return res.json(db.prepare("SELECT * FROM subjects").all());
  }
  if (req.user.role !== "teacher") return res.sendStatus(403);

  // Get teacher's assigned class and semester
  const teacher = db
    .prepare(
      "SELECT assignedClass, assignedSemester FROM teachers WHERE id = ?",
    )
    .get(req.user.id);

  if (!teacher) return res.json([]);

  // Return subjects that match the teacher's assigned class and semester
  // OR subjects explicitly assigned to the teacher in teacher_subjects
  const subjects = db
    .prepare(
      `
    SELECT DISTINCT s.* 
    FROM subjects s
    LEFT JOIN teacher_subjects ts ON s.id = ts.subject_id
    WHERE ts.teacher_id = ? 
    OR (s.class = ? AND s.semester = ?)
  `,
    )
    .all(req.user.id, teacher.assignedClass, teacher.assignedSemester);

  res.json(subjects);
});

app.get("/api/teacher/assignments", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher") return res.sendStatus(403);
  const assignments = db
    .prepare(
      `
    SELECT a.*, s.name as student_name, sub.name as subject_name
    FROM assignments a 
    JOIN students s ON a.student_id = s.id 
    LEFT JOIN subjects sub ON a.subject_id = sub.id
    WHERE a.teacher_id = ?
  `,
    )
    .all(req.user.id);
  res.json(assignments);
});

app.put("/api/teacher/assignments/:id", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher") return res.sendStatus(403);
  const { title, marks, student_ids, subject_id, due_date, file_url } =
    req.body;
  const assignmentId = req.params.id;

  try {
    const transaction = db.transaction(() => {
      const original = db
        .prepare(
          "SELECT title FROM assignments WHERE id = ? AND teacher_id = ?",
        )
        .get(assignmentId, req.user.id);
      if (!original) throw new Error("Assignment not found");

      db.prepare(
        "DELETE FROM assignments WHERE title = ? AND teacher_id = ?",
      ).run(original.title, req.user.id);

      const insert = db.prepare(
        "INSERT INTO assignments (teacher_id, student_id, title, marks, subject_id, due_date, file_url) VALUES (?, ?, ?, ?, ?, ?, ?)",
      );
      for (const sid of student_ids) {
        insert.run(
          req.user.id,
          sid,
          title,
          marks,
          subject_id,
          due_date,
          file_url,
        );
      }
    });
    transaction();
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

app.get("/api/student/assignments", authenticateToken, (req, res) => {
  if (req.user.role !== "student") return res.sendStatus(403);
  const assignments = db
    .prepare(
      `
    SELECT a.*, t.name as teacher_name, s.name as subject_name
    FROM assignments a 
    JOIN teachers t ON a.teacher_id = t.id 
    LEFT JOIN subjects s ON a.subject_id = s.id
    WHERE a.student_id = ?
    ORDER BY a.priority DESC, a.due_date ASC
  `,
    )
    .all(req.user.id);
  res.json(assignments);
});

app.post("/api/teacher/assignments", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher") return res.sendStatus(403);
  const { student_ids, title, marks, subject_id, due_date, file_url } =
    req.body; // student_ids is an array

  const insert = db.prepare(
    "INSERT INTO assignments (teacher_id, student_id, title, marks, subject_id, due_date, file_url) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  const notify = db.prepare(
    "INSERT INTO notifications (user_id, role, message) VALUES (?, 'student', ?)",
  );

  const transaction = db.transaction((ids) => {
    for (const id of ids) {
      insert.run(req.user.id, id, title, marks, subject_id, due_date, file_url);
      notify.run(id, `New assignment assigned: ${title}`);
    }
  });

  transaction(student_ids);
  res.json({ success: true });
});

app.delete("/api/teacher/assignments/:id", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher") return res.sendStatus(403);
  const assignmentId = req.params.id;

  try {
    const transaction = db.transaction(() => {
      const original = db
        .prepare(
          "SELECT title FROM assignments WHERE id = ? AND teacher_id = ?",
        )
        .get(assignmentId, req.user.id);
      if (!original) throw new Error("Assignment not found");
      db.prepare(
        "DELETE FROM assignments WHERE title = ? AND teacher_id = ?",
      ).run(original.title, req.user.id);
    });
    transaction();
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// Student Priority/Due Date Updates
app.put(
  "/api/student/assignments/:id/priority",
  authenticateToken,
  (req, res) => {
    if (req.user.role !== "student") return res.sendStatus(403);
    const { priority, due_date } = req.body;
    db.prepare(
      "UPDATE assignments SET priority = ?, due_date = ? WHERE id = ? AND student_id = ?",
    ).run(priority, due_date, req.params.id, req.user.id);
    res.json({ success: true });
  },
);

app.put("/api/student/tasks/:id/priority", authenticateToken, (req, res) => {
  if (req.user.role !== "student") return res.sendStatus(403);
  const { priority, due_date } = req.body;
  db.prepare(
    "UPDATE tasks SET priority = ?, due_date = ? WHERE id = ? AND student_id = ?",
  ).run(priority, due_date, req.params.id, req.user.id);
  res.json({ success: true });
});

app.post(
  "/api/student/assignments/:id/complete",
  authenticateToken,
  (req, res) => {
    if (req.user.role !== "student") return res.sendStatus(403);
    db.prepare(
      "UPDATE assignments SET is_completed = 1 WHERE id = ? AND student_id = ?",
    ).run(req.params.id, req.user.id);
    res.json({ success: true });
  },
);

app.post("/api/teacher/assignments/:id/grade", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher") return res.sendStatus(403);
  const { score, feedback } = req.body;
  const assignmentId = req.params.id;

  try {
    const result = db.prepare(
      "UPDATE assignments SET score = ?, feedback = ?, is_completed = 1 WHERE id = ? AND teacher_id = ?"
    ).run(score, feedback, assignmentId, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ message: "Assignment not found or unauthorized" });
    }

    // Notify student
    const assignment = db.prepare("SELECT student_id, title FROM assignments WHERE id = ?").get(assignmentId);
    if (assignment) {
      db.prepare(
        "INSERT INTO notifications (user_id, role, message) VALUES (?, 'student', ?)"
      ).run(assignment.student_id, `Your assignment '${assignment.title}' has been graded: ${score} marks.`);
    }

    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// Timetable
app.get("/api/timetable", authenticateToken, (req, res) => {
  const { class: className, semester } = req.query;
  let query = "SELECT * FROM timetable";
  let params = [];
  if (className && semester) {
    query += " WHERE class = ? AND semester = ?";
    params.push(className, semester);
  }
  const timetable = db.prepare(query).all(...params);
  res.json(timetable);
});

app.post("/api/timetable", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher" && req.user.role !== "admin")
    return res.sendStatus(403);
  const { class: className, semester, subject, teacher, day, time } = req.body;
  db.prepare(
    "INSERT INTO timetable (class, semester, subject, teacher, day, time) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(className, semester, subject, teacher, day, time);
  res.json({ success: true });
});

// Student Profile Update
app.put("/api/student/profile", authenticateToken, (req, res) => {
  if (req.user.role !== "student") return res.sendStatus(403);
  const { 
    tenthMarks, 
    twelfthMarks, 
    fatherName, 
    motherName, 
    fatherNumber, 
    motherNumber, 
    problemSubjects,
    problemTopics
  } = req.body;

  try {
    db.prepare(`
      UPDATE students 
      SET tenthMarks = ?, 
          twelfthMarks = ?, 
          fatherName = ?, 
          motherName = ?, 
          fatherNumber = ?, 
          motherNumber = ?, 
          problemSubjects = ?,
          problemTopics = ?
      WHERE id = ?
    `).run(
      tenthMarks,
      twelfthMarks,
      fatherName,
      motherName,
      fatherNumber,
      motherNumber,
      JSON.stringify(problemSubjects || []),
      JSON.stringify(problemTopics || []),
      req.user.id
    );
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(400).json({ message: e.message });
  }
});

app.delete("/api/timetable/:id", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher" && req.user.role !== "admin")
    return res.sendStatus(403);
  db.prepare("DELETE FROM timetable WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// Verification Requests (Approvals)
app.post("/api/verification-requests", authenticateToken, (req, res) => {
  if (req.user.role !== "student") return res.sendStatus(403);
  const { field, old_value, new_value, subject_id } = req.body;
  try {
    db.prepare(
      `
      INSERT INTO verification_requests (student_id, field, old_value, new_value, status)
      VALUES (?, ?, ?, ?, 'pending')
    `,
    ).run(
      req.user.id,
      field,
      JSON.stringify(old_value),
      JSON.stringify(new_value),
    );

    // Notify admins and relevant teachers
    const admins = db.prepare("SELECT id FROM admins").all();
    admins.forEach((admin) => {
      db.prepare(
        "INSERT INTO notifications (user_id, role, message) VALUES (?, 'admin', ?)",
      ).run(admin.id, `Student ${req.user.name} requested to update ${field}`);
    });

    // Notify teachers who have this student in their class
    const student = db
      .prepare("SELECT class FROM students WHERE id = ?")
      .get(req.user.id);
    if (student) {
      const teachers = db
        .prepare("SELECT id FROM teachers WHERE assignedClass = ?")
        .all(student.class);
      teachers.forEach((teacher) => {
        db.prepare(
          "INSERT INTO notifications (user_id, role, message) VALUES (?, 'teacher', ?)",
        ).run(
          teacher.id,
          `Your student ${req.user.name} requested to update ${field}`,
        );
      });
    }

    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

app.get("/api/verification-requests", authenticateToken, (req, res) => {
  if (req.user.role === "student") return res.sendStatus(403);
  const requests = db
    .prepare(
      `
    SELECT v.*, s.name as student_name, s.class, s.semester 
    FROM verification_requests v
    JOIN students s ON v.student_id = s.id
    WHERE v.status = 'pending'
  `,
    )
    .all();
  res.json(requests);
});

app.post(
  "/api/verification-requests/:id/approve",
  authenticateToken,
  (req, res) => {
    if (req.user.role === "student") return res.sendStatus(403);
    const { id } = req.params;
    const request = db
      .prepare("SELECT * FROM verification_requests WHERE id = ?")
      .get(id);

    if (!request) return res.status(404).json({ message: "Request not found" });

    const newValue = JSON.parse(request.new_value);

    const transaction = db.transaction(() => {
      if (request.field === "marks") {
        db.prepare(
          "UPDATE marks SET marks = ? WHERE student_id = ? AND subject_id = ?",
        ).run(newValue.marks, request.student_id, newValue.subject_id);
      } else if (request.field === "attendance") {
        db.prepare(
          "INSERT INTO attendance (student_id, subject_id, date, status) VALUES (?, ?, ?, ?)",
        ).run(
          request.student_id,
          newValue.subject_id,
          newValue.date,
          newValue.status,
        );
      } else if (request.field === "cgpa") {
        db.prepare(
          "UPDATE cgpa SET cgpa = ? WHERE student_id = ? AND semester = ?",
        ).run(newValue.cgpa, request.student_id, newValue.semester);
      }

      db.prepare(
        "UPDATE verification_requests SET status = 'approved' WHERE id = ?",
      ).run(id);
      db.prepare(
        "INSERT INTO notifications (user_id, role, message) VALUES (?, 'student', ?)",
      ).run(
        request.student_id,
        `Your request to update ${request.field} has been approved`,
      );
    });

    try {
      transaction();
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  },
);

app.post(
  "/api/verification-requests/:id/reject",
  authenticateToken,
  (req, res) => {
    if (req.user.role === "student") return res.sendStatus(403);
    const { id } = req.params;
    const request = db
      .prepare("SELECT * FROM verification_requests WHERE id = ?")
      .get(id);

    if (!request) return res.status(404).json({ message: "Request not found" });

    db.prepare(
      "UPDATE verification_requests SET status = 'rejected' WHERE id = ?",
    ).run(id);
    db.prepare(
      "INSERT INTO notifications (user_id, role, message) VALUES (?, 'student', ?)",
    ).run(
      request.student_id,
      `Your request to update ${request.field} has been rejected`,
    );
    res.json({ success: true });
  },
);

// Quizzes
app.get("/api/quizzes", authenticateToken, (req, res) => {
  let query = `
    SELECT q.*, s.name as subject_name, s.class, s.semester, t.name as teacher_name, stu.name as student_name
    FROM quizzes q
    JOIN subjects s ON q.subject_id = s.id
    JOIN teachers t ON q.teacher_id = t.id
    LEFT JOIN students stu ON q.student_id = stu.id
  `;
  let params = [];

  if (req.user.role === "student") {
    query += " WHERE s.class = ? AND s.semester = ? AND (q.student_id IS NULL OR q.student_id = ?)";
    const student = db
      .prepare("SELECT class, semester FROM students WHERE id = ?")
      .get(req.user.id);
    if (student) {
      params.push(student.class, student.semester, req.user.id);
    }
  } else if (req.user.role === "teacher") {
    query += " WHERE q.teacher_id = ?";
    params.push(req.user.id);
  }

  const quizzes = db.prepare(query).all(...params);
  res.json(quizzes);
});

app.post("/api/quizzes", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher") return res.sendStatus(403);
  const { subject_id, title, questions, student_ids, level } = req.body;
  
  const insert = db.prepare(
    "INSERT INTO quizzes (teacher_id, subject_id, title, questions, student_id, level) VALUES (?, ?, ?, ?, ?, ?)",
  );
  
  const transaction = db.transaction((ids) => {
    for (const id of ids) {
      insert.run(req.user.id, subject_id, title, JSON.stringify(questions), id, level || 'Beginner');
    }
  });

  transaction(student_ids || [null]);
  res.json({ success: true });
});

app.put("/api/quizzes/:id", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher") return res.sendStatus(403);
  const { subject_id, title, questions, student_ids, level } = req.body;
  const quizId = req.params.id;

  try {
    const transaction = db.transaction((ids) => {
      const original = db
        .prepare("SELECT title FROM quizzes WHERE id = ? AND teacher_id = ?")
        .get(quizId, req.user.id);
      if (!original) throw new Error("Quiz not found");

      db.prepare("DELETE FROM quizzes WHERE title = ? AND teacher_id = ?").run(
        original.title,
        req.user.id,
      );

      const insert = db.prepare(
        "INSERT INTO quizzes (teacher_id, subject_id, title, questions, student_id, level) VALUES (?, ?, ?, ?, ?, ?)",
      );
      for (const id of ids) {
        insert.run(req.user.id, subject_id, title, JSON.stringify(questions), id, level || 'Beginner');
      }
    });

    transaction(student_ids || [null]);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

app.delete("/api/quizzes/:id", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher") return res.sendStatus(403);
  const quizId = req.params.id;

  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM quiz_results WHERE quiz_id = ?").run(quizId);
    db.prepare("DELETE FROM quizzes WHERE id = ? AND teacher_id = ?").run(
      quizId,
      req.user.id,
    );
  });

  transaction();
  res.json({ success: true });
});

app.post("/api/quizzes/:id/submit", authenticateToken, (req, res) => {
  if (req.user.role !== "student") return res.sendStatus(403);
  const { score, total } = req.body;
  const { id } = req.params;

  const transaction = db.transaction(() => {
    db.prepare(
      "INSERT INTO quiz_results (student_id, quiz_id, score, total) VALUES (?, ?, ?, ?)",
    ).run(req.user.id, id, score, total);

    // Reward points
    const pointsEarned = Math.floor((score / total) * 50);
    db.prepare("UPDATE students SET points = points + ? WHERE id = ?").run(
      pointsEarned,
      req.user.id,
    );

    // Check for achievements
    if (score === total) {
      db.prepare(
        "INSERT INTO achievements (student_id, title, icon) VALUES (?, 'Perfect Score!', '🏆')",
      ).run(req.user.id);
    }

    // Notify teacher
    const quiz = db
      .prepare("SELECT teacher_id, title FROM quizzes WHERE id = ?")
      .get(id);
    if (quiz) {
      db.prepare(
        "INSERT INTO notifications (user_id, role, message) VALUES (?, 'teacher', ?)",
      ).run(
        quiz.teacher_id,
        `Student ${req.user.name} completed quiz: ${quiz.title} (Score: ${score}/${total})`,
      );
    }
  });

  transaction();
  res.json({ success: true });
});

// Tasks
app.get("/api/tasks", authenticateToken, (req, res) => {
  const tasks = db
    .prepare(
      "SELECT * FROM tasks WHERE student_id = ? ORDER BY priority DESC, due_date ASC",
    )
    .all(req.user.id);
  res.json(tasks);
});

app.post("/api/tasks/:id/complete", authenticateToken, (req, res) => {
  if (req.user.role !== "student") return res.sendStatus(403);
  const task = db
    .prepare("SELECT * FROM tasks WHERE id = ? AND student_id = ?")
    .get(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ message: "Task not found" });

  const transaction = db.transaction(() => {
    db.prepare("UPDATE tasks SET is_completed = 1 WHERE id = ?").run(
      req.params.id,
    );
    db.prepare("UPDATE students SET points = points + ? WHERE id = ?").run(
      task.points,
      req.user.id,
    );
  });

  transaction();
  res.json({ success: true });
});

// Flashcards
app.get("/api/flashcards", authenticateToken, (req, res) => {
  let query = `
    SELECT f.*, s.name as subject_name, s.class, s.semester, t.name as teacher_name, stu.name as student_name
    FROM flashcards f
    JOIN subjects s ON f.subject_id = s.id
    JOIN teachers t ON f.teacher_id = t.id
    LEFT JOIN students stu ON f.student_id = stu.id
  `;
  let params = [];

  if (req.user.role === "student") {
    query += " WHERE s.class = ? AND s.semester = ? AND (f.student_id IS NULL OR f.student_id = ?)";
    const student = db
      .prepare("SELECT class, semester FROM students WHERE id = ?")
      .get(req.user.id);
    if (student) {
      params.push(student.class, student.semester, req.user.id);
    }
  } else if (req.user.role === "teacher") {
    query += " WHERE f.teacher_id = ?";
    params.push(req.user.id);
  }

  const flashcards = db.prepare(query).all(...params);
  res.json(flashcards);
});

app.post("/api/flashcards", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher") return res.sendStatus(403);
  const { subject_id, question, answer, student_ids, level } = req.body;
  
  const insert = db.prepare(
    "INSERT INTO flashcards (teacher_id, subject_id, question, answer, student_id, level) VALUES (?, ?, ?, ?, ?, ?)",
  );
  
  const transaction = db.transaction((ids) => {
    for (const id of ids) {
      insert.run(req.user.id, subject_id, question, answer, id, level || 'Beginner');
    }
  });

  transaction(student_ids || [null]);
  res.json({ success: true });
});

app.put("/api/flashcards/:id", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher") return res.sendStatus(403);
  const { subject_id, question, answer, student_ids, level } = req.body;
  const cardId = req.params.id;

  try {
    const transaction = db.transaction((ids) => {
      const original = db
        .prepare("SELECT question FROM flashcards WHERE id = ? AND teacher_id = ?")
        .get(cardId, req.user.id);
      if (!original) throw new Error("Flashcard not found");

      db.prepare(
        "DELETE FROM flashcards WHERE question = ? AND teacher_id = ?",
      ).run(original.question, req.user.id);

      const insert = db.prepare(
        "INSERT INTO flashcards (teacher_id, subject_id, question, answer, student_id, level) VALUES (?, ?, ?, ?, ?, ?)",
      );
      for (const id of ids) {
        insert.run(req.user.id, subject_id, question, answer, id, level || 'Beginner');
      }
    });

    transaction(student_ids || [null]);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

app.delete("/api/flashcards/:id", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher") return res.sendStatus(403);
  db.prepare("DELETE FROM flashcards WHERE id = ? AND teacher_id = ?").run(
    req.params.id,
    req.user.id,
  );
  res.json({ success: true });
});

// Flashcards Viewed Tracking
app.post("/api/flashcards/:id/view", authenticateToken, (req, res) => {
  const { id } = req.params;
  try {
    const flashcard = db.prepare(`
      SELECT f.teacher_id, f.question, t.name as teacher_name 
      FROM flashcards f 
      JOIN teachers t ON f.teacher_id = t.id 
      WHERE f.id = ?
    `).get(id);

    if (flashcard) {
      db.prepare(
        "INSERT INTO notifications (user_id, role, message) VALUES (?, 'teacher', ?)"
      ).run(
        flashcard.teacher_id,
        `Student ${req.user.name} viewed your flashcard: ${flashcard.question.substring(0, 30)}...`
      );
    }
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// Student Rewards (Stars)
app.post("/api/students/:id/stars", authenticateToken, (req, res) => {
  if (req.user.role === "student") return res.sendStatus(403);
  const { id } = req.params;
  try {
    db.prepare("UPDATE students SET stars = stars + 1 WHERE id = ?").run(id);
    db.prepare(
      "INSERT INTO notifications (user_id, role, message) VALUES (?, 'student', ?)"
    ).run(id, `Congratulations! Teacher ${req.user.name} awarded you a Star! 🌟`);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// CGPA Management & Verification
app.post("/api/cgpa", authenticateToken, (req, res) => {
  const { student_id, semester, cgpa } = req.body;
  try {
    if (req.user.role === "student") {
      // Student creates a verification request
      const newValue = JSON.stringify({ semester, cgpa });
      const existing = db.prepare("SELECT cgpa FROM cgpa WHERE student_id = ? AND semester = ?").get(student_id, semester);
      const oldValue = existing ? JSON.stringify({ semester, cgpa: existing.cgpa }) : null;

      db.prepare(`
        INSERT INTO verification_requests (student_id, field, old_value, new_value, status) 
        VALUES (?, 'cgpa', ?, ?, 'pending')
      `).run(student_id, oldValue, newValue);
      
      return res.json({ success: true, message: "Verification request submitted to teacher." });
    }

    // Admins and Teachers update directly
    db.prepare(`
      INSERT INTO cgpa (student_id, semester, cgpa) 
      VALUES (?, ?, ?)
      ON CONFLICT(student_id, semester) DO UPDATE SET cgpa = excluded.cgpa
    `).run(student_id, semester, cgpa);
    
    db.prepare(
      "INSERT INTO notifications (user_id, role, message) VALUES (?, 'student', ?)"
    ).run(student_id, `Your CGPA for Semester ${semester} has been updated to ${cgpa}.`);
    
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// Teacher Verification Endpoints
app.get("/api/teacher/verifications", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher") return res.sendStatus(403);
  
  // Teachers get requests for students in their assigned class
  const teacher = db.prepare("SELECT assignedClass, assignedSemester FROM teachers WHERE id = ?").get(req.user.id);
  let requests = [];
  
  if (teacher) {
    requests = db.prepare(`
      SELECT vr.*, s.name as student_name, s.class as student_class
      FROM verification_requests vr
      JOIN students s ON vr.student_id = s.id
      WHERE vr.status = 'pending' AND (s.class = ? OR ? IS NULL)
      ORDER BY vr.id DESC
    `).all(teacher.assignedClass, teacher.assignedClass);
  }
  
  res.json(requests);
});

app.post("/api/teacher/verifications/:id/approve", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher") return res.sendStatus(403);
  const { id } = req.params;
  const { edited_cgpa } = req.body; // Teacher can optionally edit before approving
  
  try {
    const request = db.prepare("SELECT * FROM verification_requests WHERE id = ?").get(id);
    if (!request || request.status !== 'pending') return res.status(400).json({ message: "Invalid request" });

    const newValue = JSON.parse(request.new_value);
    const finalCgpa = edited_cgpa !== undefined ? edited_cgpa : newValue.cgpa;

    // Apply the CGPA update
    db.prepare(`
      INSERT INTO cgpa (student_id, semester, cgpa) 
      VALUES (?, ?, ?)
      ON CONFLICT(student_id, semester) DO UPDATE SET cgpa = excluded.cgpa
    `).run(request.student_id, newValue.semester, finalCgpa);

    // Update request status
    db.prepare("UPDATE verification_requests SET status = 'approved' WHERE id = ?").run(id);

    // Notify student
    db.prepare(
      "INSERT INTO notifications (user_id, role, message) VALUES (?, 'student', ?)"
    ).run(request.student_id, `Your CGPA request for Semester ${newValue.semester} was approved as ${finalCgpa}.`);

    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

app.post("/api/teacher/verifications/:id/reject", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher") return res.sendStatus(403);
  try {
    const request = db.prepare("SELECT * FROM verification_requests WHERE id = ?").get(req.params.id);
    if (request) {
      db.prepare("UPDATE verification_requests SET status = 'rejected' WHERE id = ?").run(req.params.id);
      db.prepare(
        "INSERT INTO notifications (user_id, role, message) VALUES (?, 'student', ?)"
      ).run(request.student_id, `Your CGPA verification request was rejected. Please contact your teacher.`);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// Achievements
app.get("/api/achievements", authenticateToken, (req, res) => {
  const achievements = db
    .prepare("SELECT * FROM achievements WHERE student_id = ?")
    .all(req.user.id);
  res.json(achievements);
});

// Analytics & Prediction
app.get("/api/analytics/student/:id", authenticateToken, async (req, res) => {
  const studentId = req.params.id;
  const marks = db
    .prepare(
      "SELECT m.marks, s.name as subject, m.subject_id, m.detailed_data FROM marks m JOIN subjects s ON m.subject_id = s.id WHERE m.student_id = ?",
    )
    .all(studentId);

  // Calculate subject-wise attendance
  const subjectWiseAttendance = db
    .prepare(
      `
      SELECT subject_id, 
             COUNT(*) as total,
             SUM(CASE WHEN status = 'Present' OR status = 'Late' THEN 1 ELSE 0 END) as present
      FROM attendance 
      WHERE student_id = ?
      GROUP BY subject_id
    `,
    )
    .all(studentId);

  const studentInfo = db
    .prepare("SELECT class, semester, problemSubjects, problemTopics FROM students WHERE id = ?")
    .get(studentId);

  // Subject-wise Class Max heuristic
  const subjectMaxHeld = db.prepare(`
    SELECT subject_id, MAX(cnt) as max_cnt FROM (
      SELECT student_id, subject_id, COUNT(*) as cnt FROM attendance 
      WHERE subject_id IN (SELECT id FROM subjects WHERE class = ? AND semester = ?)
      GROUP BY student_id, subject_id
    ) GROUP BY subject_id
  `).all(studentInfo.class, studentInfo.semester);

  marks.forEach((m) => {
    const att = subjectWiseAttendance.find((a) => a.subject_id === m.subject_id);
    const maxForSub = subjectMaxHeld.find(sm => sm.subject_id === m.subject_id)?.max_cnt || (att ? att.total : 0);
    m.attendance = maxForSub > 0 ? Math.round(((att ? att.present : 0) / maxForSub) * 100) : 0;
    m.attendedClasses = att ? att.present : 0;
    m.totalClasses = maxForSub;
  });
  const attendance = db
    .prepare("SELECT status FROM attendance WHERE student_id = ?")
    .all(studentId);

  // Class Max heuristic for total classes
  const overallMaxQuery = db.prepare(`
    SELECT MAX(cnt) as max_cnt FROM (
      SELECT COUNT(*) as cnt FROM attendance 
      WHERE student_id IN (SELECT id FROM students WHERE class = ? AND semester = ?) 
      GROUP BY student_id
    )
  `).get(studentInfo.class, studentInfo.semester);
  
  const totalClasses = overallMaxQuery.max_cnt || attendance.length;
  const attendedClasses = attendance.filter(
    (a) => a.status === "Present" || a.status === "Late",
  ).length;
  const attendanceRate =
    totalClasses > 0 ? (attendedClasses / totalClasses) * 100 : 0;

  const cgpas = db
    .prepare(
      "SELECT semester, cgpa FROM cgpa WHERE student_id = ? ORDER BY semester",
    )
    .all(studentId);

  const avgMarks =
    marks.length > 0
      ? marks.reduce((acc, m) => acc + m.marks, 0) / marks.length
      : 0;

  // Prediction Logic
  let latestCgpa = cgpas.length > 0 ? cgpas[cgpas.length - 1].cgpa : 0;
  
  // HEURISTIC: Handle students with no historical CGPA data (e.g. Semester 1)
  if (latestCgpa === 0 && avgMarks > 0) {
    latestCgpa = Math.min(10, avgMarks / 10);
  }

  const performanceScore =
    latestCgpa * 10 * 0.4 + attendanceRate * 0.2 + avgMarks * 0.3 + 70 * 0.1;

  let prediction = "At Risk";
  if (performanceScore >= 80) prediction = "Excellent";
  else if (performanceScore >= 65) prediction = "Good";
  else if (performanceScore >= 45 || (latestCgpa === 0 && avgMarks > 40)) prediction = "Needs Improvement";
  // The fallback to JS logic shouldn't overly penalize new students
  if (latestCgpa === 0 && avgMarks >= 60) prediction = "Good";
  if (latestCgpa === 0 && avgMarks >= 80) prediction = "Excellent";

  // Massive AI Insights Pool (Expansive and Natural-Sounding Advice)
  const insightsPool = {
    Excellent: [
      "Your academic momentum is truly impressive! Continue this trajectory and you'll be a prime candidate for top-tier master's programs or R&D roles.",
      "Consistently setting the bar high! Consider building a personal project portfolio to showcase how you apply these high grades to real problems.",
      "Exceptional results. This is the perfect time to start peer-tutoring or contributing to open-source; it will reinforce your mastery even further.",
      "You've mastered the 'how' of learning. Now focus on the 'why' by exploring industry applications of your favorite subjects.",
      "Remarkable consistency! Your balanced approach between internals and assignments is exactly what recruiters look for in high-potential graduates.",
      "A proactive and disciplined approach. We recommend exploring certifications like AWS, Azure, or Google Cloud to complement your stellar CGPA.",
      "Your analytical skills are top-notch. Try taking on a complex capstone project early to put your multi-subject knowledge to the test.",
      "Maintain this focus! You are in the top 5% of the database. Focus on honing your leadership and soft skills to match your technical prowess.",
      "Brilliant performance across the board. Have you considered exploring undergraduate research fellowship opportunities this summer?",
      "You're a high-flyer. Keep your edge by staying updated with latest journals and technical blogs relevant to your core subjects.",
      "Impressive work! Use your deep understanding to help others in study groups; it's the ultimate way to prove you truly know the material.",
      "You have achieved an elite status. We recommend looking into hackathons and national-level competitions to test your skills in new environments.",
      "A stellar performance record. Focus on deepening your understanding of algorithms and system design to excel in future interviews.",
      "Consistency is your superpower. Your ability to handle a heavy course load with such precision is a testament to your focus.",
      "Excellent work! Start thinking about your long-term career goals. With these grades, almost any door is open for you.",
      "You've shown a rare level of academic maturity. Consider taking a leadership role in technical workshops to share your knowledge.",
      "Outstanding! Your ability to link different subjects together for a holistic understanding is a key strength. Keep it up.",
      "You're a top performer. Focus on building a professional network on LinkedIn to leverage these stellar academic results for internships.",
      "Bravo! Your consistency in both theory and practicals is commendable. A future in research or high-end engineering looks very bright.",
      "You are setting a high standard for your peers. Maintain this discipline while expanding into interdisciplinary technical domains.",
      "Remarkable focus! Consider aiming for a 10/10 semester; you have the foundation and the work ethic to achieve it.",
      "Your performance is a blueprint for success. Use this momentum to tackle the most complex elective subjects next semester.",
      "Exceptional dedication! We recommend exploring advanced seminars or Moocs that go beyond the standard university syllabus.",
      "You have mastered the curriculum. Challenge yourself by solving real-world case studies related to your core engineering subjects."
    ],
    Good: [
      "You're doing very well! To break into the 'Excellent' bracket, focus on those small assignment marks that can nudge your total higher.",
      "Solid and dependable performance. A more iterative study pattern—reviewing notes immediately after class—could take you to the next level.",
      "Great job so far. Your internal exams are strong, but there's a slight drop in assignment completion. Nailing those will boost your forecast.",
      "You're on the right path. Try to engage more in class discussions to solidify abstract concepts and improve your confidence during vivas.",
      "Healthy academic standing! We recommend dedicating an extra 20 minutes a day to practicing code or problems in your most challenging subject.",
      "Your attendance is great, and your marks are good. To differentiate yourself, start a small GitHub project based on what you're learning.",
      "Good steady progress. You have the foundation; now focus on 'Deep Work' sessions to master the more complex modules of the curriculum.",
      "Consistent performer! Try experimenting with active recall techniques like flashcards to improve your retention for the final exams.",
      "You're performing well above average. Reach out to your mentors for more challenging resource materials to keep your learning curve steep.",
      "Nice work this term. A little more focus on the 'Application' part of your theory subjects will yield much higher marks in the long run.",
      "Your foundation is strong. Focus on time management during exams to ensure you can adequately address every section and avoid stress.",
      "Good performance. You are very close to a higher tier! Target the subject with the lowest score for a quick 'power boost' to your average.",
      "A solid year so far. Maintain this consistency while gradually increasing your complexity of practice problems to stay ahead.",
      "Reliable results. Consider taking on a small leadership role in a tech club to round out your profile as you maintain these good grades.",
      "Well done. You have the potential to be a top student with just a 10% increase in focused revision time per week.",
      "Great job. Your progress is steady. Try to focus on the 'why' behind the formulas to improve your problem-solving speed.",
      "You're a solid performer. We recommend exploring extra-curricular technical projects to apply your good grades in practice.",
      "Good work! You are nearing the 'Excellent' mark. Focus on perfect assignment submissions to get that extra percentage boost.",
      "Healthy academic results. Try to maintain a consistent sleep schedule to ensure peak performance during those early morning lectures.",
      "You've got a strong grip on the basics. Now, challenge yourself with 'Hard' level problems from the platform's quiz section.",
      "Consistently good results. Consider forming a study group where you take the lead on topics you're most comfortable with.",
      "You're performing well. To improve further, focus on the feedback from your last internal exam to address specific weak points.",
      "Solid year so far. Keep this momentum going into the finals. A structured revision plan for the last month will be your best friend.",
      "You have shown great improvement this term. Stay focused on the core subjects to ensure a strong finish to the semester."
    ],
    "Needs Improvement": [
      "You have the capability to be a top student. Let's start by improving your class attendance to catch those critical exam tips from faculty.",
      "Some areas are currently vulnerable. We recommend a 'Priority Focus' on core subjects for the next 14 days to regain your footing.",
      "Your assignments are dragging your score down. Set a weekend 'Catch-up' block to clear all pending tasks and improve your internals.",
      "Don't get discouraged! The middle of the semester is always tough. Revisit the early model tests to rebuild your confidence in the basics.",
      "You're making an effort, but inconsistencies in study habits are showing. Try the Pomodoro technique to stay focused for longer periods.",
      "Your attendance rate is currently below 75%. This is the primary driver for the lower scores. Priority #1: Be present in every lecture.",
      "Foundational gaps identified. It might be time for a 'Back-to-Basics' review session with a peer or a mentor for your core modules.",
      "Your internal scores are fluctuating. Use the platform's quizzes twice a week to test your knowledge and find the exact topics that trip you up.",
      "There's room for growth here. Start by setting 3 small daily study goals. Small wins today will lead to much larger wins by the finals.",
      "Focus alert: Your current engagement in practicals is lower than expected. Hands-on practice will make the theories much easier to grasp.",
      "It's time for a 'Course Correction'. Reach out to your teachers now—before the final rush—to clear your most critical doubts.",
      "You are currently below your potential. Change your study environment once a week to stay fresh and avoid academic burnout.",
      "Your current path is stable but slow. To accelerate your learning, try teaching a topic to a friend; it's the fastest way to find where you're stuck.",
      "Check your assignment priorities. Completing them on time is 'Low Hanging Fruit' that can significantly boost your overall percentage.",
      "You're standing on the edge of a breakthrough. Master just two key topics this week, and you'll see your predictive score rise.",
      "Don't settle for average. You have the potential for 'Good' or 'Excellent' grades if you can improve your class engagement.",
      "Focus on the basics. Many of your mistakes are foundational. A quick review of the first-year concepts might help current subjects.",
      "You can do this! Break your study time into 25-minute blocks with 5-minute breaks to stay fresh and avoid getting overwhelmed.",
      "Your attendance is the key variable. Aim for a 90% attendance rate for the next 30 days and watch your internal marks soar.",
      "It's time to get organized. A clear study timetable and a dedicated workspace will make a huge difference in your productivity.",
      "You're currently in a safe zone, but barely. A little extra effort now will prevent a lot of stress during the final exam week.",
      "Focus on your assignments. They are 'fixed marks' that you can secure with just a bit of discipline and timely submission.",
      "Reach out to your peers who are excelling. Sometimes a new perspective on a difficult topic is all you need to finally 'get it'.",
      "You are improving, but slowly. Let's speed up the progress by tackling the most difficult topics first while your mind is fresh."
    ],
    "At Risk": [
      "Critical Alert: Your current trajectory requires immediate intervention. Please book a session with your academic counselor today.",
      "Urgent focus needed: Attendance and assignments are currently in a high-risk zone. We need to clear all backlogs by the end of this week.",
      "Don't lose hope—recovery is possible! Start with the most recent lecture and work your way backwards one day at a time.",
      "Immediate action: Your internal exam scores are far below the safety threshold. Dedicate 4 hours each evening to core subject recovery.",
      "High priority risk: Attendance is currently the main barrier to success. Every missed class from now on significantly lowers your pass chance.",
      "Reach out for help today. Your subject mentors are here to guide you through a 'Fast-Track' catch-up plan to save the semester.",
      "Strategic focus: Drop all non-essential activities for the next two weeks. We need a 100% focus on clearing the primary 'Problem Subjects'.",
      "You are currently at a crossroads. Committing to a strict study schedule for just 21 days can turn this 'At Risk' status around.",
      "Foundational alert: Significant gaps in basics are impacting your ability to follow current lectures. Spend 1 hour daily on foundational review.",
      "Your current grading shows you are struggling with the course load. Let's simplify: Master only the most important 50% of each subject first.",
      "Avoid procrastination at all costs. Every hour spent studying today is worth three hours of cramming during the stressful final week.",
      "Academic emergency: Your predictive CGPA is falling. Use the 'Learning Support' resources in the dashboard to find difficult topics to master.",
      "You have the brainpower, but the effort is currently misaligned. Redirect your energy from side topics to your primary core curriculum.",
      "Urgent: Participation in labs and assignments is mandatory for clearing this semester. Complete all pending lab reports by tomorrow.",
      "It's not too late to turn this around. Consistency starts with today's class. Be there, be engaged, and start your recovery now.",
      "Urgent: You need a structured recovery plan. Focus on the subjects with the highest credit-weighting first to maximize your GPA.",
      "Academic emergency! Stop all non-essential activities and devote the next 10 days to catching up on foundational modules.",
      "Don't lose hope. Even a small improvement today counts. Attend your next lecture and take the most detailed notes possible.",
      "You are at a crossroad. Choosing to focus now will save your semester. Reach out to the 'Student Success' team for guidance.",
      "Critical focus needed: Your practical marks are currently zero. Please submit your lab records to the faculty immediately.",
      "This is a turnaround opportunity! Master the first two modules of every subject perfectly; it's the safest way to pass.",
      "Your current path leads to a year back. Let's avoid that by setting a 'Hard Target' of 5 hours of study every single day.",
      "Focus alert! Your performance is currently being dragged down by avoidable absences. Make every class count from today on.",
      "You can still pass. Focus 100% on the internal assessments and assignments to build a safety net for the final theory exams."
    ]
  };

  const student = db
    .prepare("SELECT problemSubjects FROM students WHERE id = ?")
    .get(studentId);
  const problemSubjects = student?.problemSubjects
    ? JSON.parse(student.problemSubjects)
    : [];

  const greetings = [
    "AI Diagnostic Insight:",
    "Academic Performance Forecast:",
    "Strategic Learning Note:",
    "Personalized Advisor Feedback:",
    "EduAI Performance Analysis:",
  ];
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];

  const categoryTips = insightsPool[prediction] || insightsPool["At Risk"];
  const randomTip =
    categoryTips[Math.floor(Math.random() * categoryTips.length)];
  const recommendation = `${greeting} ${randomTip}`;

  // Diverse advice for reported problem subjects
  const problemSubjectAdvicePool = [
    "Since you find this subject challenging, we recommend dedicating at least 45 minutes daily to focused practice. Focus specifically on the foundational concepts before moving to advanced topics, as the current modules build heavily on introductory theories.",
    "To master this area, try implementing the 'Feynman Technique' where you explain complex concepts to yourself out loud. Your recent results suggest that visual aids and diagrams might help you grasp the abstract theories more effectively than rote memorization.",
    "I've noticed this is a difficult area for you. It might be beneficial to join a peer study group or schedule a one-on-one session with your professor to clarify any lingering doubts that might be slowing down your academic progress.",
    "Don't let this subject discourage you! Many students find this module abstract. Try breaking down the complex topics into 15-minute 'micro-learning' sessions to avoid overwhelm and ensure better retention of the material.",
    "Consider using the platform's flashcards specifically for this subject at least three times a week. Active recall is the most effective way to turn a 'Weak Subject' into a 'Strong' one over the course of the semester.",
    "Focus on the 'Practical Application' of these concepts. Sometimes seeing how the theory works in a real-world project can make the abstract parts much easier to understand and remember during your quizzes.",
  ];

  const problem_subjects_advice = problemSubjects.map((subject) => ({
    subject,
    advice:
      problemSubjectAdvicePool[
        Math.floor(Math.random() * problemSubjectAdvicePool.length)
      ],
  }));

  // Identify lowest subject
  let lowestSubject = null;
  if (marks.length > 0) {
    lowestSubject = marks.reduce((prev, curr) =>
      prev.marks < curr.marks ? prev : curr,
    );
  }

  // Subject specific tips pool
  const subjectSpecificTips = {
    "Design and Analysis of Algorithms": {
      high: [
        "Revise time and space complexity concepts.",
        "Practice solving problems using Divide and Conquer strategy.",
        "Study Greedy algorithms with examples like activity selection and knapsack.",
        "Practice Dynamic Programming problems such as matrix chain multiplication and knapsack.",
        "Understand Backtracking algorithms like the N-Queens problem.",
        "Solve previous year KTU algorithm problems.",
      ],
      average: [
        "Practice analyzing algorithm time complexity using Big-O notation.",
        "Compare different algorithm design strategies (Greedy vs Dynamic Programming).",
        "Practice recursive algorithm tracing.",
        "Review important algorithms like Strassen’s matrix multiplication.",
      ],
      low: [
        "Continue practicing advanced algorithm problems.",
        "Focus on writing clear algorithm steps and complexity analysis.",
        "Solve additional practice problems to improve problem-solving speed.",
      ],
      general: [
        "Practice writing pseudocode for algorithms.",
        "Draw recursion trees to understand recursive algorithms.",
        "Solve algorithm problems daily to improve logical thinking.",
        "Use flowcharts to visualize algorithm steps.",
        "Practice previous year KTU questions.",
      ],
    },
    "Computer Graphics and Image Processing": {
      high: [
        "Practice window-to-viewport transformation problems step by step.",
        "Revise line clipping algorithms such as Cohen–Sutherland and Liang–Barsky.",
        "Study the 3D viewing pipeline with diagrams.",
        "Understand different projections (parallel and perspective).",
        "Revise depth buffer algorithm and scan-line algorithm.",
        "Practice image representation techniques like binary, grayscale, and color images.",
      ],
      average: [
        "Practice polygon clipping and line clipping problems.",
        "Revise 2D and 3D transformations with examples.",
        "Study steps in digital image processing.",
        "Review projection methods and their applications.",
      ],
      low: [
        "Continue practicing graphics transformation problems.",
        "Focus on drawing neat diagrams for algorithms in exams.",
        "Solve previous year KTU exam questions.",
      ],
      general: [
        "Practice drawing diagrams for algorithms and pipelines.",
        "Revise important formulas and transformation matrices.",
        "Watch visual tutorials for graphics concepts.",
        "Solve previous year KTU questions regularly.",
        "Create short notes for each module.",
      ],
    },
    "Compiler Design": {
      high: [
        "Revise phases of a compiler and their functions.",
        "Practice lexical analysis concepts such as tokens, lexemes, and patterns.",
        "Study syntax analysis and parsing techniques.",
        "Practice LL(1) parsing and LR parsing methods.",
        "Understand parse trees and syntax trees with examples.",
        "Revise intermediate code generation techniques.",
      ],
      average: [
        "Practice constructing parsing tables for LL(1) grammars.",
        "Revise error detection and error recovery methods.",
        "Study symbol table management in compilers.",
        "Review code optimization techniques.",
      ],
      low: [
        "Continue practicing compiler design problems.",
        "Focus on writing clear explanations for compiler phases.",
        "Solve previous year KTU compiler design questions.",
      ],
      general: [
        "Draw compiler phase diagrams during revision.",
        "Practice grammar derivation examples.",
        "Create short notes for parsing techniques.",
        "Solve previous year KTU exam questions.",
        "Use examples to understand syntax analysis concepts.",
      ],
    },
  };

  const subject_tips = marks
    .map((m) => {
      const pool = subjectSpecificTips[m.subject];
      if (!pool) return null;

      let tips = [];
      if (m.marks < 50) tips = [...pool.high];
      else if (m.marks <= 70) tips = [...pool.average];
      else tips = [...pool.low];

      // Add 1-2 random general tips
      const general = [...pool.general];
      for (let i = 0; i < 2 && general.length > 0; i++) {
        const idx = Math.floor(Math.random() * general.length);
        tips.push(general.splice(idx, 1)[0]);
      }

      return { subject: m.subject, tips };
    })
    .filter((t) => t !== null);

  // --- Start Python AI Prediction ---
  let aiData = null;
  const pythonPath = process.env.PYTHON_PATH || "python";

  // Calculate backlogs (marks < 40)
  const backlogs = marks.filter(m => m.marks < 40).length;

  // Calculate assignment completion rate
  let assignmentCompletionRate = 0;
  try {
    const assignmentsQuery = db.prepare("SELECT is_completed FROM assignments WHERE student_id = ?").all(studentId);
    if (assignmentsQuery.length > 0) {
      const completedAssignments = assignmentsQuery.filter(a => a.is_completed).length;
      assignmentCompletionRate = Math.round((completedAssignments / assignmentsQuery.length) * 100);
    }
  } catch (e) {
    console.error("Error calculating assignments:", e);
  }

  const studentFullData = {
    name: studentInfo.name,
    class: studentInfo.class,
    semester: studentInfo.semester,
    marks: marks.map(m => ({ subject: m.subject, marks: m.marks })),
    attendanceRate,
    cgpaTrend: cgpas,
    problemSubjects,
    backlogs,
    assignmentCompletionRate,
    studyHoursPerWeek: 15
  };

  try {
    const runAiPredictor = () => {
      return new Promise((resolve, reject) => {
        const pythonProcess = spawn(pythonPath, ["ai_predictor.py"]);
        let output = "";
        let errorOutput = "";

        pythonProcess.stdout.on("data", (data) => { output += data.toString(); });
        pythonProcess.stderr.on("data", (data) => { errorOutput += data.toString(); });

        pythonProcess.on("close", (code) => {
          if (code === 0) {
            try {
              resolve(JSON.parse(output));
            } catch (e) {
              reject(new Error("Failed to parse AI output: " + output));
            }
          } else {
            reject(new Error(`Predictor failed (code ${code}): ${errorOutput}`));
          }
        });

        pythonProcess.stdin.write(JSON.stringify(studentFullData));
        pythonProcess.stdin.end();
      });
    };

    aiData = await runAiPredictor();
    console.log("AI Predictor Result:", aiData);
  } catch (err) {
    console.error("AI Predictor failed:", err.message);
  }

  const finalPrediction = aiData?.prediction || prediction;
  const finalScore = aiData?.performanceScore || performanceScore;
  const finalRecommendation = aiData?.recommendation || recommendation;
  const finalProblemAdvice = (aiData?.insights || []).length > 0 
      ? aiData.insights.map(i => ({ subject: i.subject, advice: i.advice }))
      : problem_subjects_advice;

  res.json({
    marks,
    attendanceRate,
    cgpaTrend: cgpas,
    prediction: finalPrediction,
    performanceScore: finalScore,
    recommendation: finalRecommendation,
    problem_subjects_advice: finalProblemAdvice,
    lowestSubject,
    subject_tips,
    aiSummary: aiData?.message || aiData?.overallSummary || "AI Insights temporarily unavailable.",
    aiData: aiData || null
  });
});

app.get("/api/teacher/analytics/assignments", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher") return res.sendStatus(403);
  const analytics = db
    .prepare(`SELECT a.title, a.is_completed, a.due_date, s.name as student_name, sub.name as subject_name
    FROM assignments a
    JOIN students s ON a.student_id = s.id
    JOIN subjects sub ON a.subject_id = sub.id
    WHERE a.teacher_id = ?
    ORDER BY a.due_date DESC
  `,
    )
    .all(req.user.id);
  res.json(analytics);
});

app.get("/api/teacher/analytics/quizzes", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher") return res.sendStatus(403);
  const analytics = db
    .prepare(
      `
    SELECT q.title, qr.score, qr.total, qr.completed_at, s.name as student_name, sub.name as subject_name
    FROM quiz_results qr
    JOIN quizzes q ON qr.quiz_id = q.id
    JOIN students s ON qr.student_id = s.id
    JOIN subjects sub ON q.subject_id = sub.id
    WHERE q.teacher_id = ?
    ORDER BY qr.completed_at DESC
  `,
    )
    .all(req.user.id);
  res.json(analytics);
});

// Notifications
app.get("/api/notifications", authenticateToken, (req, res) => {
  const notifications = db
    .prepare(
      `
    SELECT * FROM notifications 
    WHERE (user_id = ? AND role = ?) 
    OR (role = 'all')
    ORDER BY created_at DESC
  `,
    )
    .all(req.user.id, req.user.role);
  res.json(notifications);
});

app.post("/api/notifications/:id/read", authenticateToken, (req, res) => {
  db.prepare(
    "UPDATE notifications SET is_read = 1 WHERE id = ? AND (user_id = ? OR role = 'all')",
  ).run(req.params.id, req.user.id);
  res.json({ success: true });
});

app.post("/api/notifications/broadcast", authenticateToken, (req, res) => {
  if (req.user.role !== "admin") return res.sendStatus(403);
  const { message } = req.body;
  db.prepare("INSERT INTO notifications (role, message) VALUES ('all', ?)").run(
    message,
  );
  res.json({ success: true });
});

// AI Content Generation (Sarvam AI / Gemini fallback)
app.post("/api/generate-ai-content", authenticateToken, upload.single("document"), async (req, res) => {
  if (req.user.role !== "teacher") return res.sendStatus(403);
  const { subject_id, type } = req.body;
  
  if (!req.file || !subject_id) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).json({ message: "Document file and Subject ID are required" });
  }

  try {
    const subject = db.prepare("SELECT name FROM subjects WHERE id = ?").get(subject_id);
    const subjectName = subject ? subject.name : "the subject";

    // Extract text using pdf-parse from disk
    let extractedText = "";
    const fileBuffer = await fs.promises.readFile(req.file.path);

if (req.file.mimetype === "application/pdf") {
  const pdfData = await pdf(fileBuffer);
  extractedText = pdfData.text;
} else {
  extractedText = fileBuffer.toString("utf-8");
}

    // Clean up uploaded file
    fs.unlink(req.file.path, () => {});

    if (!extractedText.trim()) {
      return res.status(400).json({ message: "Could not extract text from document." });
    }

    // Prepare Sarvam prompt
    let systemPrompt = "";
    if (type === "quiz") {
       systemPrompt = `
You are an expert teacher.

Generate exactly 3 multiple-choice questions from the given text.

Rules:
- Each question must be clear and direct.
- Do NOT use phrases like "based on", "according to", "from the text", or similar.
- Questions must be asked as if they are standalone exam questions.
- Each question must have exactly 4 options.
- Only ONE option must be correct.
- The correct answer must be factually accurate from the text.
- Distractors (wrong options) must be realistic and related.

Output format (STRICT JSON ONLY):
[
  {
    "text": "Question?",
    "options": [ {text: "Option 1", isCorrect: false}, {text: "Option 2", isCorrect: true}, {text: "Option 3", isCorrect: false}, {text: "Option 4", isCorrect: false}],
  }
]
`;
    } else {
       systemPrompt = `You are an expert teacher. From the following text, generate a JSON array of exactly 3 flashcards. The JSON format should exactly be: [{ "q": "Question/Term", "a": "Answer/Definition" }]. Output ONLY JSON.`;
    }

    let generatedData = null;

    // Call Sarvam AI API
    if (process.env.SARVAM_API_KEY) {
      try {
        const sarvamRes = await fetch("https://api.sarvam.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.SARVAM_API_KEY}`
          },
          body: JSON.stringify({
            model: "sarvam-m",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Text slice: ${extractedText.substring(0, 3000)}` }
            ],
            temperature: 0.7
          })
        });
        
        if (sarvamRes.ok) {
           const json = await sarvamRes.json();
           const content = json.choices[0].message.content;
           console.log(content, "content")
           let cleanContent = content
  .replace(/```json/g, '')
  .replace(/```/g, '')
  .replace(/<think>[\s\S]*?<\/think>/g, '') // 🔥 remove thinking blocks
  .trim();

// Extract only JSON array part
const jsonMatch = cleanContent.match(/\[[\s\S]*\]/);

if (!jsonMatch) {
  throw new Error("No valid JSON found in AI response");
}

generatedData = JSON.parse(jsonMatch[0]);
           console.log("Sarvam API generated data:", generatedData);
        }
      } catch (err) {
        console.error("Sarvam API hit failed, falling back to mock:", err);
      }
    } else {
      console.log("No Sarvam API key found")
    }

    // Fallback Mock Logic
    if (!generatedData) {
      if (type === "quiz") {
        generatedData = [
          {
            text: `Based on your document: What is the primary concept discussed?`,
            options: [ {text: "Concept A", isCorrect: false}, {text: "Concept B", isCorrect: true}, {text: "Concept C", isCorrect: false}, {text: "Concept D", isCorrect: false}],
          },
          {
            text: `Which of the following is a key takeaway from chapter 1?`,
            options: [ {text: "Takeaway 1", isCorrect: false}, {text: "Takeaway 2", isCorrect: true}, {text: "Takeaway 3", isCorrect: false}, {text: "Takeaway 4", isCorrect: false}],
          },
          {
            text: `Identify the correct application of the theory mentioned.`,
            options: [ {text: "Application X", isCorrect: false}, {text: "Application Y", isCorrect: true}, {text: "Application Z", isCorrect: false}, {text: "None", isCorrect: false}],
          }
        ];
      } else {
        generatedData = [
          { q: `Key Definition 1 from the uploaded doc`, a: `Detailed explanation extracted from PDF.` },
          { q: `Important Formula/Concept`, a: `The breakdown of the concept...` },
          { q: `Historical Context`, a: `Contextual background from the PDF.` }
        ];
      }
    }

    

    if (type === "quiz") {
      const mockQuestions = JSON.stringify(generatedData);
      const result = db.prepare(
        "INSERT INTO quizzes (teacher_id, subject_id, title, questions) VALUES (?, ?, ?, ?)"
      ).run(req.user.id, subject_id, "AI Generated Quiz: " + subjectName, mockQuestions);
      
      return res.json({ success: true, message: "Quiz generated successfully", id: result.lastInsertRowid });
    } 
    else if (type === "flashcard") {
      const insertStmt = db.prepare("INSERT INTO flashcards (teacher_id, subject_id, question, answer) VALUES (?, ?, ?, ?)");
      const transaction = db.transaction(() => {
        generatedData.forEach(card => {
          insertStmt.run(req.user.id, subject_id, card.q, card.a);
        });
      });
      transaction();

      
      return res.json({ success: true, message: "Flashcards generated successfully" });
    }

    res.status(400).json({ message: "Invalid type requested" });
  } catch (error) {
    console.error("AI Generation Error:", error);
    res.status(500).json({ message: "Failed to generate AI content" });
  }
});

// CGPA Management
// GET all CGPA records for a student
app.get("/api/cgpa/:studentId", authenticateToken, (req, res) => {
  const records = db.prepare(
    "SELECT semester, cgpa FROM cgpa WHERE student_id = ? ORDER BY semester ASC"
  ).all(req.params.studentId);
  res.json(records);
});

// PUT upsert CGPA for a specific semester
app.put("/api/cgpa/:studentId/:semester", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher" && req.user.role !== "admin") return res.sendStatus(403);
  const { cgpa } = req.body;
  if (cgpa === undefined || cgpa < 0 || cgpa > 10) {
    return res.status(400).json({ message: "CGPA must be between 0 and 10" });
  }
  db.prepare(`
    INSERT INTO cgpa (student_id, semester, cgpa)
    VALUES (?, ?, ?)
    ON CONFLICT(student_id, semester) DO UPDATE SET cgpa = excluded.cgpa
  `).run(req.params.studentId, req.params.semester, cgpa);
  res.json({ success: true });
});

// Teacher Attendance Analytics
// GET /api/teacher/attendance/subject-wise - Returns attendance logs for teacher's subjects
app.get("/api/teacher/attendance/subject-wise", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher" && req.user.role !== "admin") return res.sendStatus(403);
  const { subject_id, dateFrom, dateTo } = req.query;

  let query = `
    SELECT a.id, a.status, a.date, a.student_id,
           s.name as student_name, s.class as student_class, s.semester,
           sub.name as subject_name, sub.id as subject_id
    FROM attendance a
    JOIN students s ON a.student_id = s.id
    JOIN subjects sub ON a.subject_id = sub.id
    JOIN teacher_subjects ts ON ts.subject_id = sub.id
    WHERE ts.teacher_id = ?
  `;
  const params = [req.user.id];

  if (subject_id) { query += " AND a.subject_id = ?"; params.push(subject_id); }
  if (dateFrom)   { query += " AND a.date >= ?";      params.push(dateFrom); }
  if (dateTo)     { query += " AND a.date <= ?";      params.push(dateTo); }

  query += " ORDER BY a.date DESC, sub.name ASC";

  try {
    const logs = db.prepare(query).all(...params);
    res.json(logs);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/teacher/attendance/class-wise - Returns attendance logs for a given class/semester
app.get("/api/teacher/attendance/class-wise", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher" && req.user.role !== "admin") return res.sendStatus(403);
  const { className, semester, dateFrom, dateTo } = req.query;

  let query = `
    SELECT a.id, a.status, a.date, a.student_id,
           s.name as student_name, s.class as student_class, s.semester,
           sub.name as subject_name, sub.id as subject_id
    FROM attendance a
    JOIN students s ON a.student_id = s.id
    JOIN subjects sub ON a.subject_id = sub.id
    JOIN teacher_subjects ts ON ts.subject_id = sub.id
    WHERE ts.teacher_id = ?
  `;
  const params = [req.user.id];

  if (className) { query += " AND LOWER(s.class) = LOWER(?)"; params.push(className); }
  if (semester)  { query += " AND s.semester = ?";             params.push(semester); }
  if (dateFrom)  { query += " AND a.date >= ?";               params.push(dateFrom); }
  if (dateTo)    { query += " AND a.date <= ?";               params.push(dateTo); }

  query += " ORDER BY a.date DESC, s.name ASC";

  try {
    const logs = db.prepare(query).all(...params);
    res.json(logs);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Bulk Attendance
app.get("/api/teacher/students/filter", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher" && req.user.role !== "admin") return res.sendStatus(403);
  const { className, semester } = req.query;
  let query = "SELECT id, name, username, class, semester FROM students";
  let params = [];
  
  if (className || semester) {
    query += " WHERE";
    if (className) {
      query += " LOWER(class) = LOWER(?)";
      params.push(className);
    }
    if (semester) {
      if (className) query += " AND";
      query += " semester = ?";
      params.push(semester);
    }
  }
  
  const students = db.prepare(query).all(...params);
  res.json(students);
});

app.post("/api/attendance/bulk", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher" && req.user.role !== "admin") return res.sendStatus(403);
  const { subject_id, date, time, attendanceRecords } = req.body;
  
  if (!subject_id || !date || !attendanceRecords || !Array.isArray(attendanceRecords)) {
    return res.status(400).json({ message: "Invalid request data" });
  }

  const insert = db.prepare(
    "INSERT INTO attendance (student_id, subject_id, date, status) VALUES (?, ?, ?, ?)"
  );

  const transaction = db.transaction((records) => {
    for (const record of records) {
      insert.run(record.student_id, subject_id, date, record.status);
    }
  });

  try {
    transaction(attendanceRecords);
    res.json({ success: true, message: `Attendance recorded for ${attendanceRecords.length} students` });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// 404 handler for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({ message: `API route ${req.originalUrl} not found` });
});

// Serve uploads directory
app.use("/uploads", express.static(uploadDir));

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
}



// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || "Internal Server Error" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
