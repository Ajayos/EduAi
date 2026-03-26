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
const db = new sqlite3("eduai.db");
db.pragma("foreign_keys = ON");


// Initialize Schema
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
    stars INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    semester INTEGER,
    class TEXT
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
    question TEXT,
    answer TEXT,
    FOREIGN KEY(teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER,
    subject_id INTEGER,
    title TEXT,
    questions TEXT, -- JSON string
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
 // Migration: Add detailed_data to marks if not exists
  const marksColumns = db.prepare("PRAGMA table_info(marks)").all();
  if (!marksColumns.some(c => c.name === 'detailed_data')) {
    db.exec("ALTER TABLE marks ADD COLUMN detailed_data TEXT;");
    console.log("Migration: Added detailed_data column to marks table.");
  }

// Migration: Add subject_id to flashcards and quizzes if they don't exist
try {
  db.prepare("ALTER TABLE flashcards ADD COLUMN subject_id INTEGER").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE quizzes ADD COLUMN subject_id INTEGER").run();
} catch (e) {}
try {
    db.prepare("ALTER TABLE assignments ADD COLUMN file_url TEXT").run();
  } catch (e) {
    // Column already exists or other error
  }
    try {
    db.prepare("ALTER TABLE achievements ADD COLUMN description TEXT").run();
  } catch (e) {}
  
  // Student Profile Migration
  try { db.prepare("ALTER TABLE students ADD COLUMN tenthMarks REAL").run(); } catch (e) {}
  try { db.prepare("ALTER TABLE students ADD COLUMN twelfthMarks REAL").run(); } catch (e) {}
  try { db.prepare("ALTER TABLE students ADD COLUMN fatherName TEXT").run(); } catch (e) {}
  try { db.prepare("ALTER TABLE students ADD COLUMN motherName TEXT").run(); } catch (e) {}
  try { db.prepare("ALTER TABLE students ADD COLUMN fatherNumber TEXT").run(); } catch (e) {}
  try { db.prepare("ALTER TABLE students ADD COLUMN motherNumber TEXT").run(); } catch (e) {}
  try { db.prepare("ALTER TABLE students ADD COLUMN problemSubjects TEXT").run(); } catch (e) {}
  
  // Subject Year Migration
  try { db.prepare("ALTER TABLE subjects ADD COLUMN year INTEGER DEFAULT 1").run(); } catch (e) {}
  
  // Targeted Assignments Migration
  try { db.prepare("ALTER TABLE quizzes ADD COLUMN student_id INTEGER").run(); } catch (e) {}
  try { db.prepare("ALTER TABLE flashcards ADD COLUMN student_id INTEGER").run(); } catch (e) {}

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
      class: "CSE",
    },
    {
      name: "GAPHT121 – Physics for Information Science",
      semester: 1,
      class: "CSE",
    },
    {
      name: "GACYT122 – Chemistry for Information Science",
      semester: 1,
      class: "CSE",
    },
    {
      name: "GXEST103 – Engineering Graphics and Computer Aided Drawing",
      semester: 1,
      class: "CSE",
    },
    {
      name: "GXEST104 – Introduction to Electrical and Electronics Engineering",
      semester: 1,
      class: "CSE",
    },
    {
      name: "UCEST105 – Algorithmic Thinking with Python",
      semester: 1,
      class: "CSE",
    },
    {
      name: "GAESL106 – Basic Electrical and Electronics Engineering Workshop",
      semester: 1,
      class: "CSE",
    },
    { name: "UCPST127 – Health and Wellness", semester: 1, class: "CSE" },
    {
      name: "UCHUT128 – Life Skills and Professional Communication",
      semester: 1,
      class: "CSE",
    },
    {
      name: "UCSEM129 – Skill Enhancement Course: Digital 101 (NASSCOM MOOC)",
      semester: 1,
      class: "CSE",
    },

    // Semester 2 (S2)
    {
      name: "VECTOR CALCULUS, DIFFERENTIAL EQUATIONS",
      semester: 2,
      class: "CSE",
    },
    { name: "ENGINEERING PHYSICS", semester: 2, class: "CSE" },
    { name: "ENGINEERING GRAPHICS", semester: 2, class: "CSE" },
    { name: "PROGRAMMING IN C", semester: 2, class: "CSE" },
    { name: "ENGINEERING CHEMISTRY", semester: 2, class: "CSE" },
    { name: "ENGINEERING MECHANICS", semester: 2, class: "CSE" },
    { name: "PROFESSIONAL COMMUNICATION", semester: 2, class: "CSE" },
    { name: "BASICS OF CIVIL & MECHANICAL", semester: 2, class: "CSE" },
    { name: "BASICS OF ELECTRICAL & ELECTRONICS", semester: 2, class: "CSE" },

    // Semester 3 (S3)
    { name: "DISCRETE MATHEMATICAL STRUCTURES", semester: 3, class: "CSE" },
    { name: "OBJECT ORIENTED PROGRAMMING JAVA", semester: 3, class: "CSE" },
    { name: "Data Structures", semester: 3, class: "CSE" },
    { name: "Logic System Design", semester: 3, class: "CSE" },
    { name: "Sustainable Engineering", semester: 3, class: "CSE" },
    { name: "DESIGN & ENGINEERING", semester: 3, class: "CSE" },

    // Semester 4 (S4)
    { name: "COMPUTER ORGANISATION & ARCHITECTURE", semester: 4, class: "CSE" },
    { name: "GRAPH THEORY", semester: 4, class: "CSE" },
    { name: "DATABASE MANAGEMENT SYSTEMS", semester: 4, class: "CSE" },
    { name: "OPERATING SYSTEMS", semester: 4, class: "CSE" },
    { name: "CONSTITUTION OF INDIA", semester: 4, class: "CSE" },
    { name: "PROFESSIONAL ETHICS", semester: 4, class: "CSE" },

    // Semester 5 (S5)
    { name: "FORMAL LANGUAGES & AUTOMATA THEORY", semester: 5, class: "CSE" },
    { name: "MANAGEMENT OF SOFTWARE SYSTEMS", semester: 5, class: "CSE" },
    { name: "MICROPROCESSORS AND MICROCONTROLLERS", semester: 5, class: "CSE" },
    { name: "COMPUTER NETWORKS", semester: 5, class: "CSE" },
    { name: "SYSTEM SOFTWARE", semester: 5, class: "CSE" },
    { name: "DISASTER MANAGEMENT", semester: 5, class: "CSE" },

    // Semester 6 (S6)
    { name: "COMPUTER GRAPHICS & IMAGE PROCESSING", semester: 6, class: "CSE" },
    { name: "ALGORITHM ANALYSIS & DESIGN", semester: 6, class: "CSE" },
    { name: "COMPILER DESIGN", semester: 6, class: "CSE" },
    { name: "INDUSTRIAL ECONOMIC & FOREIGN TRADE", semester: 6, class: "CSE" },

    // Semester 7 (S7)
    { name: "NATURAL LANGUAGE PROCESSING", semester: 7, class: "CSE" },
    { name: "MACHINE LEARNING", semester: 7, class: "CSE" },
    { name: "CLOUD COMPUTING", semester: 7, class: "CSE" },
    { name: "ARTIFICIAL INTELLIGENCE", semester: 7, class: "CSE" },
    { name: "WEB PROGRAMMING", semester: 7, class: "CSE" },
    { name: "COMPUTER GRAPHICS", semester: 7, class: "CSE" },

    // Semester 8 (S8)
    { name: "DISTRIBUTED COMPUTING", semester: 8, class: "CSE" },
    { name: "EMBEDDED SYSTEM", semester: 8, class: "CSE" },
    { name: "INTERNET OF THINGS", semester: 8, class: "CSE" },
    { name: "INDUSTRIAL SAFETY ENGINEERING", semester: 8, class: "CSE" },
  ];

  const insertSubject = db.prepare(
    "INSERT INTO subjects (name, semester, class, year) VALUES (?, ?, ?, ?)",
  );
  const classes = ["CSE", "SOE", "Data Science", "Artificial Intelligence"];

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
    { id: user.id, username: user.username, role: detectedRole },
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
      "SELECT id, name, username, isClassTeacher, assignedClass, assignedSemester FROM teachers",
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
  const { name, username, isClassTeacher, assignedClass, assignedSemester } =
    req.body;
  db.prepare(
    "UPDATE teachers SET name = ?, username = ?, isClassTeacher = ?, assignedClass = ?, assignedSemester = ? WHERE id = ?",
  ).run(
    name,
    username,
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
        "INSERT INTO teachers (name, username, password, isClassTeacher, assignedClass, assignedSemester) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(
        name,
        username,
        hashedPassword,
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
  res.json(students);
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
    // For teachers, we might want to filter by their assigned class if they are a class teacher
    const teacher = db
      .prepare(
        "SELECT isClassTeacher, assignedClass FROM teachers WHERE id = ?",
      )
      .get(req.user.id);
    if (teacher && teacher.isClassTeacher) {
      students = db
        .prepare(
          "SELECT id, name, username, class, semester, points, stars, tenthMarks, twelfthMarks, fatherName, motherName, fatherNumber, motherNumber, problemSubjects FROM students WHERE class = ?",
        )
        .all(teacher.assignedClass);
    } else {
      // If not a class teacher, maybe they see all students or none?
      // Let's allow them to see all students for now so they can add marks.
      students = db
        .prepare(
          "SELECT id, name, username, class, semester, points, stars, tenthMarks, twelfthMarks, fatherName, motherName, fatherNumber, motherNumber, problemSubjects FROM students",
        )
        .all();
    }
  }

  // Add avg marks to each student (mocked for now as in the dashboard)
  const studentsWithStats = students.map((s) => {
    const marks = db
      .prepare("SELECT AVG(marks) as avg FROM marks WHERE student_id = ?")
      .get(s.id);
    return {
      ...s,
      avgMarks: marks.avg ? Math.round(marks.avg) : 0,
    };
  });

  res.json(studentsWithStats);
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
    
    // grandTotal / 220 * 100
    const grandTotal = modulesSum + internalsSum + assignmentScore;
    finalMarks = Math.round((grandTotal / 220) * 100);
    detailedJson = JSON.stringify(detailed_data);
  }

  db.prepare(
    "INSERT INTO marks (student_id, subject_id, semester, marks, teacher_id, detailed_data) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(student_id, subject_id, semester, finalMarks, finalTeacherId, detailedJson);

  // Notify student
  const subject = db
    .prepare("SELECT name FROM subjects WHERE id = ?")
    .get(subject_id);
  const subjectName = subject ? subject.name : `Subject ID ${subject_id}`;
  db.prepare(
    "INSERT INTO notifications (user_id, role, message) VALUES (?, 'student', ?)",
  ).run(student_id, `New marks added for ${subjectName}: ${finalMarks}% (Detailed logged)`);

  res.json({ success: true, marks: finalMarks });
});

app.get("/api/attendance/:studentId", authenticateToken, (req, res) => {
  const attendance = db
    .prepare("SELECT * FROM attendance WHERE student_id = ?")
    .all(req.params.studentId);
  res.json(attendance);
});

app.post("/api/attendance", authenticateToken, (req, res) => {
  const { student_id, subject_id, date, status } = req.body;
  db.prepare(
    "INSERT INTO attendance (student_id, subject_id, date, status) VALUES (?, ?, ?, ?)",
  ).run(student_id, subject_id, date, status);

  // Notify student
  const subject = db
    .prepare("SELECT name FROM subjects WHERE id = ?")
    .get(subject_id);
  const subjectName = subject ? subject.name : `Subject ID ${subject_id}`;
  db.prepare(
    "INSERT INTO notifications (user_id, role, message) VALUES (?, 'student', ?)",
  ).run(
    student_id,
    `Attendance marked as ${status} for ${subjectName} on ${date}`,
  );

  res.json({ success: true });
});

app.put("/api/attendance/:id", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher" && req.user.role !== "admin")
    return res.sendStatus(403);
  const { status, date } = req.body;
  db.prepare("UPDATE attendance SET status = ?, date = ? WHERE id = ?").run(
    status,
    date,
    req.params.id,
  );
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
    problemSubjects 
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
          problemSubjects = ?
      WHERE id = ?
    `).run(
      tenthMarks,
      twelfthMarks,
      fatherName,
      motherName,
      fatherNumber,
      motherNumber,
      JSON.stringify(problemSubjects),
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
  const { subject_id, title, questions, student_ids } = req.body;
  
  const insert = db.prepare(
    "INSERT INTO quizzes (teacher_id, subject_id, title, questions, student_id) VALUES (?, ?, ?, ?, ?)",
  );
  
  const transaction = db.transaction((ids) => {
    for (const id of ids) {
      insert.run(req.user.id, subject_id, title, JSON.stringify(questions), id);
    }
  });

  transaction(student_ids || [null]);
  res.json({ success: true });
});

app.put("/api/quizzes/:id", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher") return res.sendStatus(403);
  const { subject_id, title, questions, student_ids } = req.body;
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
        "INSERT INTO quizzes (teacher_id, subject_id, title, questions, student_id) VALUES (?, ?, ?, ?, ?)",
      );
      for (const id of ids) {
        insert.run(req.user.id, subject_id, title, JSON.stringify(questions), id);
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
  const { subject_id, question, answer, student_ids } = req.body;
  
  const insert = db.prepare(
    "INSERT INTO flashcards (teacher_id, subject_id, question, answer, student_id) VALUES (?, ?, ?, ?, ?)",
  );
  
  const transaction = db.transaction((ids) => {
    for (const id of ids) {
      insert.run(req.user.id, subject_id, question, answer, id);
    }
  });

  transaction(student_ids || [null]);
  res.json({ success: true });
});

app.put("/api/flashcards/:id", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher") return res.sendStatus(403);
  const { subject_id, question, answer, student_ids } = req.body;
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
        "INSERT INTO flashcards (teacher_id, subject_id, question, answer, student_id) VALUES (?, ?, ?, ?, ?)",
      );
      for (const id of ids) {
        insert.run(req.user.id, subject_id, question, answer, id);
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

// Achievements
app.get("/api/achievements", authenticateToken, (req, res) => {
  const achievements = db
    .prepare("SELECT * FROM achievements WHERE student_id = ?")
    .all(req.user.id);
  res.json(achievements);
});

// Analytics & Prediction
app.get("/api/analytics/student/:id", authenticateToken, (req, res) => {
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
             SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present
      FROM attendance 
      WHERE student_id = ?
      GROUP BY subject_id
    `,
    )
    .all(studentId);

  marks.forEach((m) => {
    const att = subjectWiseAttendance.find((a) => a.subject_id === m.subject_id);
    m.attendance = att ? Math.round((att.present / att.total) * 100) : 0;
    m.attendedClasses = att ? att.present : 0;
    m.totalClasses = att ? att.total : 0;
  });
  const attendance = db
    .prepare("SELECT status FROM attendance WHERE student_id = ?")
    .all(studentId);
  const cgpas = db
    .prepare(
      "SELECT semester, cgpa FROM cgpa WHERE student_id = ? ORDER BY semester",
    )
    .all(studentId);

  const totalClasses = attendance.length;
  const attendedClasses = attendance.filter(
    (a) => a.status === "present",
  ).length;
  const attendanceRate =
    totalClasses > 0 ? (attendedClasses / totalClasses) * 100 : 0;

  const avgMarks =
    marks.length > 0
      ? marks.reduce((acc, m) => acc + m.marks, 0) / marks.length
      : 0;

  // Prediction Logic
  const latestCgpa = cgpas.length > 0 ? cgpas[cgpas.length - 1].cgpa : 0;
  const performanceScore =
    latestCgpa * 10 * 0.4 + attendanceRate * 0.2 + avgMarks * 0.3 + 70 * 0.1;

  let prediction = "At Risk";
  if (performanceScore >= 85) prediction = "Excellent";
  else if (performanceScore >= 70) prediction = "Good";
  else if (performanceScore >= 50) prediction = "Needs Improvement";

  // Diverse AI Insights Pool (>50 items randomized)
  const insightsPool = {
    Excellent: [
      "Your academic momentum is truly impressive! To reach the next level, consider mentoring peers or engaging in advanced research projects in your field.",
      "You are consistently outperforming expectations. This is a great time to explore competitive programming or industry certifications to complement your high CGPA.",
      "Extraordinary consistency! You've mastered the core concepts. We recommend diving into specialized electives that challenge your current understanding even further.",
      "Your performance is top-tier. Maintain this focus while also building a professional portfolio on GitHub to showcase your technical excellence to future employers.",
      "Brilliant work across all subjects! You have the potential to lead student organizations or technical clubs. Your balanced approach to study is a model for others.",
      "You've achieved a significant milestone. Keep pushing your boundaries with interdisciplinary projects that combine your strongest subjects for innovative results.",
      "Superior academic discipline! Use this strong foundation to start preparing for higher education entrance exams or prestigious internship opportunities early on.",
      "You are in the top percentile. Focus on deep-tech applications of your subjects and consider publishing a blog post or paper on your recent learnings.",
      "Outstanding results! Your dedication is paying off. To maintain this lead, keep up with the latest industry trends by following top-tier tech journals.",
      "You've mastered the art of learning. Challenge yourself by taking on a complex capstone project that solves a real-world problem using your diverse skill set.",
      "Exceptional academic record! Consider applying for undergraduate research assistantships to gain hands-on experience in your favorite subject area.",
      "You are setting a high bar for excellence. Focus on developing soft skills like leadership and communication to match your strong technical foundation.",
      "Brilliant performance! We recommend exploring open-source contributions to real-world projects to apply your classroom knowledge in a global context.",
      "Your consistency is a major asset. Keep refining your problem-solving techniques and consider participating in national-level technical competitions.",
      "You've reached a peak performance level. To keep your edge, try teaching a complex topic to a peer; it's the ultimate test of true mastery."
    ],
    Good: [
      "You have a solid foundation! A slight increase in your attendance could push your overall performance into the 'Excellent' category. Consistency is the key now.",
      "Great job so far. You're performing well in most areas, but focusing a bit more on your assignments could significantly boost your internal marks next semester.",
      "You're on the right track. Try to participate more in class discussions to deepen your understanding and gain more confidence in your subject knowledge.",
      "Good steady progress. We recommend setting up a weekly review session for your most challenging subjects to turn those 'Good' grades into 'Excellent' ones.",
      "Your performance is reliable and strong. To break through to the top tier, dedicate an extra hour each day to practicing problem-solving in core subjects.",
      "You've shown great potential. Focus on time management during exams to ensure you can adequately address every question and maximize your scoring potential.",
      "Healthy performance! You've got the basics down. Now is the time to start applying your knowledge through small side projects or coding challenges.",
      "Strong work. Your attendance is good, but your quiz scores show room for improvement. Regular revision of class notes will help you bridge that gap.",
      "You are a consistent performer. To improve further, try to explain complex concepts to your classmates; it's the best way to solidify your own understanding.",
      "Good performance! You are very close to the 'Excellent' bracket. Focus on refining your presentation skills and detail-oriented work in your assignments.",
      "Strong steady progress. Consider setting up a dedicated 'deep work' block in your weekly schedule to tackle the most complex topics without distractions.",
      "You're doing great! To boost your score further, focus on the 'Application' part of your core subjects, as these often carry higher marks in final exams.",
      "Consistently good results. We recommend seeking out extra-credit assignments or advanced reading material to stay ahead of the standard curriculum.",
      "You have a solid academic standing. Try to relate your theoretical learnings to real-life case studies to make the concepts more memorable and practical.",
      "Great work this semester. A slightly more proactive approach in project-based learning could be the key to unlocking your next level of achievement."
    ],
    "Needs Improvement": [
      "You're making an effort, but some areas need closer attention. We recommend setting daily study goals and seeking help from teachers for topics you find confusing.",
      "Your attendance is a bit low, which is impacting your score. Try to be more regular in class to catch important hints and explanations from your professors.",
      "You have the ability to do much better. Focus on completing your assignments on time as they carry significant weight in your overall academic performance score.",
      "It's time to step up your revision game. Using flashcards for quick daily reviews could help you improve your retention and boost your quiz results quickly.",
      "You're currently in the middle tier. Reorganizing your study space and creating a dedicated timetable will help you stay focused and improve your marks.",
      "Don't get discouraged! Many students find this semester challenging. Form a study group with your peers to tackle difficult concepts together more effectively.",
      "Check your attendance rate—it's currently a drag on your performance. Small changes in your daily routine can lead to much higher consistency in class.",
      "Your internal marks are below average. Take advantage of office hours to clear your doubts early before the final exams approach. You can do this!",
      "Focus on the 'Graph Theory' and 'Data Structures' modules specifically. Strengthening these will provide a much-needed boost to your overall technical grade.",
      "You have potential that isn't fully reflected in your grades. Practice active listening in class and take structured notes to improve your understanding.",
      "It's time to re-evaluate your study habits. Try the 'Active Recall' method to better prepare for quizzes and improve your subject-wise retention score.",
      "You are standing on the edge of a breakthrough. Focus on completing 100% of your coursework this week to regain your academic momentum quickly.",
      "Small, incremental improvements are your friend. Focus on mastering one small concept each day, and you'll see a significant cumulative effect in weeks.",
      "Your current scores suggest some foundational gaps. Don't worry—reviewing the first few weeks of lecture notes will help you catch up effectively."
    ],
    "At Risk": [
      "We're concerned about your current progress. Please schedule a meeting with your academic advisor as soon as possible to create a recovery plan for your studies.",
      "Your attendance and marks are significantly below the safety threshold. Dedicating time to catch up on missed lectures is critical right now for your success.",
      "Urgent action is needed. Focus on clearing your pending assignments and attending every single class from now on to avoid falling further behind.",
      "You are at a critical junction. We recommend a complete focus on your core subjects for the next 3 weeks to ensure you satisfy the minimum passing criteria.",
      "High priority: Your grades in internal exams indicate a need for immediate intervention. Reach out to your 'Subject Matter Experts' for personalized guidance.",
      "Attendance is your primary obstacle. Improving your presence in class is the fastest way to start recovering your grades and gaining back your confidence.",
      "A proactive approach is required. Start by mastering one small topic at a time using the platform's flashcards and quizzes to build up your knowledge base.",
      "You need to significantly increase your study hours. Avoid distractions and use the 'Pomodoro' technique to stay productive during your intense revision sessions.",
      "Your current path leads to academic probation. Let's turn this around by setting small, achievable goals each day and tracking your progress diligently.",
      "It's not too late to improve! Start with the most recent lecture and work your way back. Consistency from today onwards will make a huge difference.",
      "Immediate intervention required: You are currently performing at 'At Risk' levels. Focus on attending every tutorial session for extra guidance and support.",
      "Your academic standing is in danger. We recommend a complete digital detox during study hours to ensure 100% focus on your core recovery curriculum.",
      "Focus on the basics first. You cannot build a tall building on a weak foundation. Review the introductory concepts of every subject to find your footing.",
      "Reach out to your faculty mentor today. They can provide a customized learning path to help you bridge the gaps and avoid failing your current term.",
      "Consistency is currently your greatest weakness. Set an alarm for every class and make it your top priority to be present and engaged every single day."
    ]
  };

  const student = db
    .prepare("SELECT problemSubjects FROM students WHERE id = ?")
    .get(studentId);
  const problemSubjects = student?.problemSubjects
    ? JSON.parse(student.problemSubjects)
    : [];

  const categoryTips = insightsPool[prediction] || insightsPool["At Risk"];
  const randomTip =
    categoryTips[Math.floor(Math.random() * categoryTips.length)];
  const recommendation = randomTip;

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

  res.json({
    marks,
    attendanceRate,
    cgpaTrend: cgpas,
    prediction,
    performanceScore,
    recommendation,
    problem_subjects_advice,
    lowestSubject,
    subject_tips,
  });
});

app.get("/api/teacher/analytics/assignments", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher") return res.sendStatus(403);
  const analytics = db
    .prepare(
      `
    SELECT a.title, a.is_completed, a.due_date, s.name as student_name, sub.name as subject_name
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
