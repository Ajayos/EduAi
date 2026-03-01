import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("eduai.db");
const JWT_SECRET = process.env.JWT_SECRET || "eduai-secret-key-12345";

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT, -- 'teacher' or 'student'
    name TEXT,
    department TEXT,
    teacher_id TEXT,
    register_number TEXT,
    avatar_url TEXT
  );

  CREATE TABLE IF NOT EXISTS students_meta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    semester INTEGER,
    last_year_gpa REAL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    student_id INTEGER,
    internal_marks INTEGER,
    attendance_percent INTEGER,
    semester INTEGER,
    rating INTEGER DEFAULT 3, -- 1-5 stars
    FOREIGN KEY(student_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    description TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'completed'
    points INTEGER DEFAULT 10,
    type TEXT, -- 'quiz', 'revision', 'flashcard'
    FOREIGN KEY(student_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    subject_id INTEGER,
    quiz_progress INTEGER DEFAULT 0,
    flashcard_progress INTEGER DEFAULT 0,
    FOREIGN KEY(student_id) REFERENCES users(id),
    FOREIGN KEY(subject_id) REFERENCES subjects(id)
  );

  CREATE TABLE IF NOT EXISTS timetable (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    day TEXT,
    subject TEXT,
    start_time TEXT,
    end_time TEXT,
    room TEXT,
    FOREIGN KEY(student_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS study_planner (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    task TEXT,
    due_date TEXT,
    priority TEXT DEFAULT 'Medium',
    status TEXT DEFAULT 'pending',
    FOREIGN KEY(student_id) REFERENCES users(id)
  );
`);

// Seed Database
async function seedDatabase() {
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
  if (userCount.count === 0) {
    console.log("Seeding database...");
    const hashedPassword = await bcrypt.hash("password123", 10);

    // Create Teacher
    db.prepare(
      "INSERT INTO users (username, password, role, name, department) VALUES (?, ?, ?, ?, ?)",
    ).run(
      "teacher",
      hashedPassword,
      "teacher",
      "Dr. Sarah Wilson",
      "Computer Science",
    );

    // Create Students
    const students = [
      {
        username: "student",
        name: "Alex Johnson",
        reg: "CS2024001",
        dept: "Computer Science",
      },
      {
        username: "student2",
        name: "Emma Davis",
        reg: "CS2024002",
        dept: "Computer Science",
      },
      {
        username: "student3",
        name: "Liam Smith",
        reg: "CS2024003",
        dept: "Computer Science",
      },
      {
        username: "student4",
        name: "Sophia Brown",
        reg: "CS2024004",
        dept: "Computer Science",
      },
    ];

    for (const s of students) {
      const info = db
        .prepare(
          "INSERT INTO users (username, password, role, name, department, register_number, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .run(
          s.username,
          hashedPassword,
          "student",
          s.name,
          s.dept,
          s.reg,
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.username}`,
        );

      const studentId = info.lastInsertRowid;
      db.prepare(
        "INSERT INTO students_meta (user_id, semester, last_year_gpa) VALUES (?, ?, ?)",
      ).run(studentId, 1, (Math.random() * 2 + 7).toFixed(2));

      const subjects = [
        "Mathematics",
        "Physics",
        "Computer Science",
        "English",
        "Data Structures",
        "Algorithms",
      ];
      for (const sub of subjects) {
        const subInfo = db
          .prepare(
            "INSERT INTO subjects (name, student_id, internal_marks, attendance_percent, semester, rating) VALUES (?, ?, ?, ?, ?, ?)",
          )
          .run(
            sub,
            studentId,
            Math.floor(Math.random() * 40) + 50,
            Math.floor(Math.random() * 30) + 70,
            1,
            Math.floor(Math.random() * 3) + 3,
          );

        db.prepare(
          "INSERT INTO progress (student_id, subject_id, quiz_progress, flashcard_progress) VALUES (?, ?, ?, ?)",
        ).run(
          studentId,
          subInfo.lastInsertRowid,
          Math.floor(Math.random() * 100),
          Math.floor(Math.random() * 100),
        );
      }

      const tasks = [
        { desc: "Complete Math Quiz", type: "quiz", pts: 50 },
        { desc: "Review Physics Notes", type: "revision", pts: 20 },
        { desc: "Practice CS Flashcards", type: "flashcard", pts: 30 },
        { desc: "Submit English Essay", type: "revision", pts: 40 },
        { desc: "Algorithm Lab Prep", type: "quiz", pts: 60 },
      ];

      for (const t of tasks) {
        db.prepare(
          "INSERT INTO tasks (student_id, description, status, points, type) VALUES (?, ?, ?, ?, ?)",
        ).run(
          studentId,
          t.desc,
          Math.random() > 0.5 ? "completed" : "pending",
          t.pts,
          t.type,
        );
      }

      // Seed Timetable
      const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
      const times = [
        { start: "09:00", end: "10:00" },
        { start: "10:00", end: "11:00" },
        { start: "11:15", end: "12:15" },
        { start: "13:30", end: "14:30" },
      ];

      for (const day of days) {
        for (let i = 0; i < times.length; i++) {
          const sub = subjects[Math.floor(Math.random() * subjects.length)];
          db.prepare(
            "INSERT INTO timetable (student_id, day, subject, start_time, end_time, room) VALUES (?, ?, ?, ?, ?, ?)",
          ).run(
            studentId,
            day,
            sub,
            times[i].start,
            times[i].end,
            `Room ${100 + i}`,
          );
        }
      }

      // Seed Study Planner
      const plannerTasks = [
        { task: "Finish React Project", priority: "High", due: "2026-03-05" },
        {
          task: "Read Chapter 4 of Physics",
          priority: "Medium",
          due: "2026-03-02",
        },
        { task: "Prepare for Math Quiz", priority: "High", due: "2026-03-03" },
        { task: "English Essay Draft", priority: "Low", due: "2026-03-10" },
      ];

      for (const pt of plannerTasks) {
        db.prepare(
          "INSERT INTO study_planner (student_id, task, due_date, priority, status) VALUES (?, ?, ?, ?, ?)",
        ).run(
          studentId,
          pt.task,
          pt.due,
          pt.priority,
          Math.random() > 0.7 ? "completed" : "pending",
        );
      }
    }
    console.log("Database seeded successfully!");
  }
}

const app = express();
app.use(express.json());

// Auth Middleware
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
app.post("/api/auth/register", async (req, res) => {
  const {
    username,
    password,
    role,
    name,
    department,
    teacher_id,
    register_number,
  } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const info = db
      .prepare(
        "INSERT INTO users (username, password, role, name, department, teacher_id, register_number, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        username,
        hashedPassword,
        role,
        name,
        department,
        teacher_id,
        register_number,
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      );

    if (role === "student") {
      db.prepare(
        "INSERT INTO students_meta (user_id, semester, last_year_gpa) VALUES (?, ?, ?)",
      ).run(info.lastInsertRowid, 1, 0);
    }

    res.status(201).json({ message: "User created" });
  } catch (e) {
    res.status(400).json({ error: "Username already exists" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  const user = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = jwt.sign(
    { id: user.id, role: user.role, username: user.username },
    JWT_SECRET,
  );
  res.json({
    token,
    user: {
      id: user.id,
      role: user.role,
      name: user.name,
      department: user.department,
      avatar_url: user.avatar_url,
    },
  });
});

// Teacher Routes
app.get("/api/teacher/students", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher") return res.sendStatus(403);
  const { department, semester } = req.query;
  const students = db
    .prepare(
      `
    SELECT u.*, sm.semester, sm.last_year_gpa 
    FROM users u 
    JOIN students_meta sm ON u.id = sm.user_id 
    WHERE u.role = 'student' AND u.department = ? AND sm.semester = ?
  `,
    )
    .all(department, semester);
  res.json(students);
});

app.get("/api/student/:id/details", authenticateToken, (req, res) => {
  const studentId = req.params.id;
  const student = db.prepare("SELECT * FROM users WHERE id = ?").get(studentId);
  const meta = db
    .prepare("SELECT * FROM students_meta WHERE user_id = ?")
    .get(studentId);
  const subjects = db
    .prepare("SELECT * FROM subjects WHERE student_id = ?")
    .all(studentId);
  const progress = db
    .prepare("SELECT * FROM progress WHERE student_id = ?")
    .all(studentId);
  const tasks = db
    .prepare("SELECT * FROM tasks WHERE student_id = ?")
    .all(studentId);
  const timetable = db
    .prepare("SELECT * FROM timetable WHERE student_id = ?")
    .all(studentId);
  const studyPlanner = db
    .prepare("SELECT * FROM study_planner WHERE student_id = ?")
    .all(studentId);

  // Calculate risk level
  let riskLevel = "Low";
  const avgAttendance =
    subjects.length > 0
      ? subjects.reduce((acc, s) => acc + s.attendance_percent, 0) /
        subjects.length
      : 100;
  const avgMarks =
    subjects.length > 0
      ? subjects.reduce((acc, s) => acc + s.internal_marks, 0) / subjects.length
      : 100;

  if (avgAttendance < 75 || avgMarks < 40) riskLevel = "High";
  else if (avgAttendance < 85 || avgMarks < 60) riskLevel = "Medium";

  res.json({
    ...student,
    ...meta,
    subjects,
    progress,
    tasks,
    timetable,
    studyPlanner,
    riskLevel,
  });
});

app.post("/api/teacher/create-student", authenticateToken, async (req, res) => {
  if (req.user.role !== "teacher") return res.sendStatus(403);
  const {
    username,
    password,
    name,
    department,
    register_number,
    semester,
    last_year_gpa,
  } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const info = db
    .prepare(
      "INSERT INTO users (username, password, role, name, department, register_number, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      username,
      hashedPassword,
      "student",
      name,
      department,
      register_number,
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
    );

  db.prepare(
    "INSERT INTO students_meta (user_id, semester, last_year_gpa) VALUES (?, ?, ?)",
  ).run(info.lastInsertRowid, semester, last_year_gpa);

  // Add some default subjects
  const defaultSubjects = [
    "Mathematics",
    "Physics",
    "Computer Science",
    "English",
  ];
  defaultSubjects.forEach((sub) => {
    const subInfo = db
      .prepare(
        "INSERT INTO subjects (name, student_id, internal_marks, attendance_percent, semester) VALUES (?, ?, ?, ?, ?)",
      )
      .run(
        sub,
        info.lastInsertRowid,
        Math.floor(Math.random() * 40) + 50,
        Math.floor(Math.random() * 30) + 70,
        semester,
      );

    db.prepare(
      "INSERT INTO progress (student_id, subject_id, quiz_progress, flashcard_progress) VALUES (?, ?, ?, ?)",
    ).run(
      info.lastInsertRowid,
      subInfo.lastInsertRowid,
      Math.floor(Math.random() * 100),
      Math.floor(Math.random() * 100),
    );
  });

  res.status(201).json({ message: "Student created" });
});

// Student Routes
app.get("/api/student/dashboard", authenticateToken, (req, res) => {
  const studentId = req.user.id;
  const subjects = db
    .prepare("SELECT * FROM subjects WHERE student_id = ?")
    .all(studentId);
  const tasks = db
    .prepare("SELECT * FROM tasks WHERE student_id = ?")
    .all(studentId);
  const progress = db
    .prepare("SELECT * FROM progress WHERE student_id = ?")
    .all(studentId);
  const timetable = db
    .prepare("SELECT * FROM timetable WHERE student_id = ?")
    .all(studentId);
  const studyPlanner = db
    .prepare("SELECT * FROM study_planner WHERE student_id = ?")
    .all(studentId);

  res.json({ subjects, tasks, progress, timetable, studyPlanner });
});

app.post("/api/student/study-planner", authenticateToken, (req, res) => {
  const { task, due_date, priority } = req.body;
  db.prepare(
    "INSERT INTO study_planner (student_id, task, due_date, priority) VALUES (?, ?, ?, ?)",
  ).run(req.user.id, task, due_date, priority);
  res.json({ message: "Task added to planner" });
});

app.post(
  "/api/student/study-planner/:id/toggle",
  authenticateToken,
  (req, res) => {
    const taskId = req.params.id;
    const task = db
      .prepare(
        "SELECT status FROM study_planner WHERE id = ? AND student_id = ?",
      )
      .get(taskId, req.user.id);
    if (task) {
      const newStatus = task.status === "completed" ? "pending" : "completed";
      db.prepare("UPDATE study_planner SET status = ? WHERE id = ?").run(
        newStatus,
        taskId,
      );
      res.json({ message: "Status updated" });
    } else {
      res.sendStatus(404);
    }
  },
);

app.delete("/api/student/study-planner/:id", authenticateToken, (req, res) => {
  db.prepare("DELETE FROM study_planner WHERE id = ? AND student_id = ?").run(
    req.params.id,
    req.user.id,
  );
  res.json({ message: "Task deleted" });
});

app.post("/api/student/complete-task", authenticateToken, (req, res) => {
  const { taskId } = req.body;
  db.prepare(
    "UPDATE tasks SET status = 'completed' WHERE id = ? AND student_id = ?",
  ).run(taskId, req.user.id);
  res.json({ message: "Task completed" });
});

app.post("/api/student/subject/:id/rating", authenticateToken, (req, res) => {
  const { rating } = req.body;
  const subjectId = req.params.id;
  db.prepare(
    "UPDATE subjects SET rating = ? WHERE id = ? AND student_id = ?",
  ).run(rating, subjectId, req.user.id);
  res.json({ message: "Rating updated" });
});

async function startServer() {
  const PORT = 3000;
  await seedDatabase();

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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
