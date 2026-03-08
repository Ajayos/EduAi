import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import sqlite3 from "better-sqlite3";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "eduai-secret-key-2026";

// Database Setup
const db = new sqlite3("eduai.db");

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
    FOREIGN KEY(teacher_id) REFERENCES teachers(id),
    FOREIGN KEY(subject_id) REFERENCES subjects(id)
  );

  CREATE TABLE IF NOT EXISTS marks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    subject_id INTEGER,
    semester INTEGER,
    marks INTEGER,
    teacher_id INTEGER,
    FOREIGN KEY(student_id) REFERENCES students(id),
    FOREIGN KEY(subject_id) REFERENCES subjects(id),
    FOREIGN KEY(teacher_id) REFERENCES teachers(id)
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    subject_id INTEGER,
    date TEXT,
    status TEXT,
    FOREIGN KEY(student_id) REFERENCES students(id),
    FOREIGN KEY(subject_id) REFERENCES subjects(id)
  );

  CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER,
    student_id INTEGER,
    title TEXT,
    marks INTEGER,
    FOREIGN KEY(teacher_id) REFERENCES teachers(id),
    FOREIGN KEY(student_id) REFERENCES students(id)
  );

  CREATE TABLE IF NOT EXISTS flashcards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER,
    subject_id INTEGER,
    question TEXT,
    answer TEXT,
    FOREIGN KEY(teacher_id) REFERENCES teachers(id),
    FOREIGN KEY(subject_id) REFERENCES subjects(id)
  );

  CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER,
    subject_id INTEGER,
    title TEXT,
    questions TEXT, -- JSON string
    FOREIGN KEY(teacher_id) REFERENCES teachers(id),
    FOREIGN KEY(subject_id) REFERENCES subjects(id)
  );

  CREATE TABLE IF NOT EXISTS quiz_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    quiz_id INTEGER,
    score INTEGER,
    total INTEGER,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(student_id) REFERENCES students(id),
    FOREIGN KEY(quiz_id) REFERENCES quizzes(id)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    title TEXT,
    description TEXT,
    points INTEGER,
    is_completed BOOLEAN DEFAULT 0,
    type TEXT, -- 'improvement', 'revision', 'quiz', 'flashcard'
    FOREIGN KEY(student_id) REFERENCES students(id)
  );

  CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    title TEXT,
    icon TEXT,
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(student_id) REFERENCES students(id)
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
    FOREIGN KEY(student_id) REFERENCES students(id)
  );

  CREATE TABLE IF NOT EXISTS verification_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    field TEXT,
    old_value TEXT,
    new_value TEXT,
    status TEXT DEFAULT 'pending',
    FOREIGN KEY(student_id) REFERENCES students(id)
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
if (subjectsCount === 0) {
  const seedSubjects = [
    // Semester 1
    {
      name: "Engineering Mathematics I",
      semester: 1,
      class: "Computer Science",
    },
    { name: "Engineering Physics", semester: 1, class: "Computer Science" },
    { name: "Engineering Chemistry", semester: 1, class: "Computer Science" },
    { name: "Engineering Graphics", semester: 1, class: "Computer Science" },
    {
      name: "Basics of Civil Engineering",
      semester: 1,
      class: "Computer Science",
    },
    {
      name: "Basics of Mechanical Engineering",
      semester: 1,
      class: "Computer Science",
    },

    // Semester 2
    {
      name: "Engineering Mathematics II",
      semester: 2,
      class: "Computer Science",
    },
    { name: "Engineering Mechanics", semester: 2, class: "Computer Science" },
    {
      name: "Basics of Electrical Engineering",
      semester: 2,
      class: "Computer Science",
    },
    {
      name: "Basics of Electronics Engineering",
      semester: 2,
      class: "Computer Science",
    },
    { name: "Programming in C", semester: 2, class: "Computer Science" },
    { name: "Professional Ethics", semester: 2, class: "Computer Science" },

    // Semester 3
    { name: "Discrete Mathematics", semester: 3, class: "Computer Science" },
    { name: "Data Structures", semester: 3, class: "Computer Science" },
    {
      name: "Object Oriented Programming",
      semester: 3,
      class: "Computer Science",
    },
    { name: "Digital Electronics", semester: 3, class: "Computer Science" },

    // Semester 4
    { name: "Signals and Systems", semester: 4, class: "Computer Science" },
    { name: "Computer Organization", semester: 4, class: "Computer Science" },
    { name: "Operating Systems", semester: 4, class: "Computer Science" },
    {
      name: "Design and Analysis of Algorithms",
      semester: 4,
      class: "Computer Science",
    },
    {
      name: "Algorithm Analysis and design",
      semester: 4,
      class: "Computer Science",
    },

    // Semester 5
    {
      name: "Database Management Systems",
      semester: 5,
      class: "Computer Science",
    },
    { name: "Computer Networks", semester: 5, class: "Computer Science" },
    { name: "Web Technologies", semester: 5, class: "Computer Science" },
    {
      name: "Computer graphics and image processing",
      semester: 5,
      class: "Computer Science",
    },
    { name: "Networking Lab", semester: 5, class: "Computer Science" },

    // Semester 6
    { name: "Software Engineering", semester: 6, class: "Computer Science" },
    { name: "Compiler Design", semester: 6, class: "Computer Science" },
    {
      name: "Microprocessors and Microcontrollers",
      semester: 6,
      class: "Computer Science",
    },
    { name: "Control Systems", semester: 6, class: "Computer Science" },
    {
      name: "Formal Languages and Automata Theory",
      semester: 6,
      class: "Computer Science",
    },
    {
      name: "Industrial economics and foreign trade",
      semester: 6,
      class: "Computer Science",
    },
    { name: "Mini project", semester: 6, class: "Computer Science" },

    // Semester 7
    { name: "Artificial Intelligence", semester: 7, class: "Computer Science" },
    { name: "Machine Learning", semester: 7, class: "Computer Science" },
    { name: "Cloud Computing", semester: 7, class: "Computer Science" },
    { name: "Cyber Security", semester: 7, class: "Computer Science" },
    { name: "Data Mining", semester: 7, class: "Computer Science" },
    { name: "Project Work Phase 1", semester: 7, class: "Computer Science" },
    { name: "Seminar", semester: 7, class: "Computer Science" },

    // Semester 8
    { name: "Big Data Analytics", semester: 8, class: "Computer Science" },
    { name: "Internet of Things", semester: 8, class: "Computer Science" },
    { name: "Distributed Systems", semester: 8, class: "Computer Science" },
    { name: "Engineering Economics", semester: 8, class: "Computer Science" },
    { name: "Project Work Phase 2", semester: 8, class: "Computer Science" },
    { name: "Comprehensive viva", semester: 8, class: "Computer Science" },
  ];
  const insertSubject = db.prepare(
    "INSERT INTO subjects (name, semester, class) VALUES (?, ?, ?)",
  );
  seedSubjects.forEach((s) => insertSubject.run(s.name, s.semester, s.class));
}

app.use(express.json());

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
  db.prepare("DELETE FROM teachers WHERE id = ?").run(req.params.id);
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
      "SELECT id, name, username, class, semester, points, stars FROM students",
    )
    .all();
  res.json(students);
});

app.get("/api/admin/students/:id", authenticateToken, (req, res) => {
  if (req.user.role !== "admin") return res.sendStatus(403);
  const student = db
    .prepare(
      "SELECT id, name, username, class, semester, points, stars FROM students WHERE id = ?",
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
  db.prepare("DELETE FROM students WHERE id = ?").run(req.params.id);
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
        "SELECT id, name, username, class, semester, points, stars FROM students",
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
          "SELECT id, name, username, class, semester, points, stars FROM students WHERE class = ?",
        )
        .all(teacher.assignedClass);
    } else {
      // If not a class teacher, maybe they see all students or none?
      // Let's allow them to see all students for now so they can add marks.
      students = db
        .prepare(
          "SELECT id, name, username, class, semester, points, stars FROM students",
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

// Subjects
app.get("/api/subjects", authenticateToken, (req, res) => {
  const subjects = db.prepare("SELECT * FROM subjects").all();
  res.json(subjects);
});

// Assignments
app.get("/api/teacher/assignments", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher") return res.sendStatus(403);
  const assignments = db
    .prepare(
      `
    SELECT a.*, s.name as student_name 
    FROM assignments a 
    JOIN students s ON a.student_id = s.id 
    WHERE a.teacher_id = ?
  `,
    )
    .all(req.user.id);
  res.json(assignments);
});

app.put("/api/teacher/assignments/:id", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher") return res.sendStatus(403);
  const { title, marks, student_ids } = req.body;
  const assignmentId = req.params.id;

  try {
    const transaction = db.transaction(() => {
      // Update the assignment title and marks (this is tricky because assignments are per student in this schema)
      // Actually, the current schema stores one row per student per assignment title.
      // To "edit" an assignment, we should probably update all rows with the same title/teacher or handle it differently.
      // Given the current schema, let's update by ID for simple fields, but the user wants to edit the "list of students".

      // Better approach for this schema: Delete old ones with same title/teacher and re-insert?
      // Or just update the specific one.
      // If the user wants to edit "the assignment", they likely think of it as one entity.

      // Let's find the original title of this assignment ID
      const original = db
        .prepare(
          "SELECT title FROM assignments WHERE id = ? AND teacher_id = ?",
        )
        .get(assignmentId, req.user.id);
      if (!original) throw new Error("Assignment not found");

      // Delete all assignments with that title for this teacher
      db.prepare(
        "DELETE FROM assignments WHERE title = ? AND teacher_id = ?",
      ).run(original.title, req.user.id);

      // Re-insert
      const insert = db.prepare(
        "INSERT INTO assignments (teacher_id, student_id, title, marks) VALUES (?, ?, ?, ?)",
      );
      for (const sid of student_ids) {
        insert.run(req.user.id, sid, title, marks);
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
    SELECT a.*, t.name as teacher_name 
    FROM assignments a 
    JOIN teachers t ON a.teacher_id = t.id 
    WHERE a.student_id = ?
  `,
    )
    .all(req.user.id);
  res.json(assignments);
});

app.post("/api/teacher/assignments", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher") return res.sendStatus(403);
  const { student_ids, title, marks } = req.body; // student_ids is an array

  const insert = db.prepare(
    "INSERT INTO assignments (teacher_id, student_id, title, marks) VALUES (?, ?, ?, ?)",
  );
  const notify = db.prepare(
    "INSERT INTO notifications (user_id, role, message) VALUES (?, 'student', ?)",
  );

  const transaction = db.transaction((ids) => {
    for (const id of ids) {
      insert.run(req.user.id, id, title, marks);
      notify.run(id, `New assignment assigned: ${title}`);
    }
  });

  transaction(student_ids);
  res.json({ success: true });
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
    SELECT q.*, s.name as subject_name, t.name as teacher_name, s.class, s.semester
    FROM quizzes q
    JOIN subjects s ON q.subject_id = s.id
    JOIN teachers t ON q.teacher_id = t.id
  `;
  let params = [];

  if (req.user.role === "student") {
    const student = db
      .prepare("SELECT class, semester FROM students WHERE id = ?")
      .get(req.user.id);
    if (student) {
      query += " WHERE s.class = ? AND s.semester = ?";
      params.push(student.class, student.semester);
    }
  } else if (req.user.role === "teacher") {
    query += " WHERE q.teacher_id = ?";
    params.push(req.user.id);
  }

  const quizzes = db.prepare(query).all(...params);
  res.json(quizzes);
});

app.post("/api/quizzes", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher") {
    return res.sendStatus(403);
  }

  const { subject_id, title, questions } = req.body;

  const teacher = db
    .prepare("SELECT id FROM teachers WHERE id = ?")
    .get(req.user.id);

  if (!teacher) {
    return res.status(400).json({ error: "Teacher not found" });
  }

  const subject = db
    .prepare("SELECT id FROM subjects WHERE id = ?")
    .get(subject_id);

  if (!subject) {
    return res.status(400).json({ error: "Subject not found" });
  }

  db.prepare(`
    INSERT INTO quizzes (teacher_id, subject_id, title, questions)
    VALUES (?, ?, ?, ?)
  `).run(req.user.id, subject_id, title, JSON.stringify(questions));

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
    .prepare("SELECT * FROM tasks WHERE student_id = ?")
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
    SELECT f.*, s.name as subject_name, s.class, s.semester
    FROM flashcards f
    JOIN subjects s ON f.subject_id = s.id
  `;
  let params = [];

  if (req.user.role === "student") {
    const student = db
      .prepare("SELECT class, semester FROM students WHERE id = ?")
      .get(req.user.id);
    if (student) {
      query += " WHERE s.class = ? AND s.semester = ?";
      params.push(student.class, student.semester);
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
  const { subject_id, question, answer } = req.body;
  db.prepare(
    "INSERT INTO flashcards (teacher_id, subject_id, question, answer) VALUES (?, ?, ?, ?)",
  ).run(req.user.id, subject_id, question, answer);
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
      "SELECT m.marks, s.name as subject FROM marks m JOIN subjects s ON m.subject_id = s.id WHERE m.student_id = ?",
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

// 404 handler for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({ message: `API route ${req.originalUrl} not found` });
});

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
