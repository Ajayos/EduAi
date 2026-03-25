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
  console.log(user, "user", username, password, req.body)

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
  } = req.body;
  db.prepare(
    "UPDATE students SET name = ?, username = ?, class = ?, semester = ?, points = ?, stars = ? WHERE id = ?",
  ).run(name, username, className, semester, points, stars, req.params.id);
  res.json({ success: true });
});

app.post("/api/teacher/students", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher" && req.user.role !== "admin")
    return res.sendStatus(403);
  const { name, username, password, class: className, semester } = req.body;

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
        "INSERT INTO students (name, username, password, class, semester) VALUES (?, ?, ?, ?, ?)",
      )
      .run(name, username, hashedPassword, className, semester);
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
  const { student_id, subject_id, semester, marks, teacher_id } = req.body;
  const finalTeacherId = teacher_id || req.user.id;
  db.prepare(
    "INSERT INTO marks (student_id, subject_id, semester, marks, teacher_id) VALUES (?, ?, ?, ?, ?)",
  ).run(student_id, subject_id, semester, marks, finalTeacherId);

  // Notify student
  const subject = db
    .prepare("SELECT name FROM subjects WHERE id = ?")
    .get(subject_id);
  const subjectName = subject ? subject.name : `Subject ID ${subject_id}`;
  db.prepare(
    "INSERT INTO notifications (user_id, role, message) VALUES (?, 'student', ?)",
  ).run(student_id, `New marks added for ${subjectName}: ${marks}`);

  res.json({ success: true });
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
      "SELECT m.marks, s.name as subject, m.subject_id FROM marks m JOIN subjects s ON m.subject_id = s.id WHERE m.student_id = ?",
    )
    .all(studentId);
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
    latestCgpa * 10 * 0.4 + attendanceRate * 0.2 + avgMarks * 0.3 + 70 * 0.1; // Assuming 70 for assignments if none

  let prediction = "At Risk";
  if (performanceScore >= 85) prediction = "Excellent";
  else if (performanceScore >= 70) prediction = "Good";
  else if (performanceScore >= 50) prediction = "Needs Improvement";

  res.json({
    marks,
    attendanceRate,
    cgpaTrend: cgpas,
    prediction,
    performanceScore,
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
