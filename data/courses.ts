export interface Lesson {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  type: "lesson" | "quiz" | "challenge";
  isLocked: boolean;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  category: string;
  thumbnail: string;
  language: string;
  duration: string; // e.g., "6 hours"
  lessonsCount: number;
  studentsCount: number;
  rating: number;
  isFree: boolean;
  isPro: boolean;
  tags: string[];
  lessons: Lesson[];
}

export const courses: Course[] = [
  {
    id: "1",
    slug: "basic-javascript",
    title: "Basic JavaScript",
    description: "Learn the fundamentals of JavaScript programming. Master variables, functions, loops, and objects to build interactive web applications.",
    difficulty: "beginner",
    category: "Programming",
    thumbnail: "🟨",
    language: "JavaScript",
    duration: "6 hours",
    lessonsCount: 24,
    studentsCount: 12500,
    rating: 4.8,
    isFree: true,
    isPro: false,
    tags: ["JavaScript", "Web Development", "Programming Basics"],
    lessons: [
      {
        id: "1-1",
        title: "Introduction to JavaScript",
        description: "Learn what JavaScript is and how to run your first program",
        duration: 15,
        type: "lesson",
        isLocked: false,
      },
      {
        id: "1-2",
        title: "Variables and Data Types",
        description: "Understand how to store and manipulate data",
        duration: 20,
        type: "lesson",
        isLocked: false,
      },
      {
        id: "1-3",
        title: "Functions",
        description: "Create reusable blocks of code",
        duration: 25,
        type: "lesson",
        isLocked: false,
      },
      {
        id: "1-4",
        title: "Quiz: JavaScript Basics",
        description: "Test your knowledge",
        duration: 10,
        type: "quiz",
        isLocked: false,
      },
      {
        id: "1-5",
        title: "Loops and Iteration",
        description: "Repeat code efficiently",
        duration: 20,
        type: "lesson",
        isLocked: true,
      },
    ],
  },
  {
    id: "2",
    slug: "python-fundamentals",
    title: "Python Fundamentals",
    description: "Start your Python journey. Learn syntax, data structures, and build real-world projects from scratch.",
    difficulty: "beginner",
    category: "Programming",
    thumbnail: "🐍",
    language: "Python",
    duration: "8 hours",
    lessonsCount: 30,
    studentsCount: 15200,
    rating: 4.9,
    isFree: true,
    isPro: false,
    tags: ["Python", "Data Science", "Programming Basics"],
    lessons: [
      {
        id: "2-1",
        title: "Python Basics",
        description: "Your first Python program",
        duration: 15,
        type: "lesson",
        isLocked: false,
      },
      {
        id: "2-2",
        title: "Lists and Tuples",
        description: "Working with collections",
        duration: 25,
        type: "lesson",
        isLocked: false,
      },
    ],
  },
  {
    id: "3",
    slug: "data-structures-algorithms",
    title: "Data Structures & Algorithms",
    description: "Master essential DSA concepts. Learn arrays, linked lists, trees, graphs, sorting, and searching algorithms.",
    difficulty: "intermediate",
    category: "Computer Science",
    thumbnail: "🌲",
    language: "Python",
    duration: "20 hours",
    lessonsCount: 45,
    studentsCount: 8400,
    rating: 4.7,
    isFree: false,
    isPro: true,
    tags: ["DSA", "Algorithms", "Interview Prep"],
    lessons: [
      {
        id: "3-1",
        title: "Array Basics",
        description: "Understanding arrays and their operations",
        duration: 30,
        type: "lesson",
        isLocked: false,
      },
    ],
  },
  {
    id: "4",
    slug: "react-for-beginners",
    title: "React for Beginners",
    description: "Build modern web apps with React. Learn components, hooks, state management, and routing.",
    difficulty: "intermediate",
    category: "Web Development",
    thumbnail: "⚛️",
    language: "JavaScript",
    duration: "12 hours",
    lessonsCount: 36,
    studentsCount: 9800,
    rating: 4.8,
    isFree: false,
    isPro: true,
    tags: ["React", "Frontend", "Web Development"],
    lessons: [
      {
        id: "4-1",
        title: "React Fundamentals",
        description: "Understanding React and JSX",
        duration: 20,
        type: "lesson",
        isLocked: false,
      },
    ],
  },
  {
    id: "5",
    slug: "advanced-typescript",
    title: "Advanced TypeScript",
    description: "Level up your TypeScript skills. Dive into generics, decorators, advanced types, and design patterns.",
    difficulty: "advanced",
    category: "Programming",
    thumbnail: "📘",
    language: "TypeScript",
    duration: "15 hours",
    lessonsCount: 40,
    studentsCount: 5600,
    rating: 4.9,
    isFree: false,
    isPro: true,
    tags: ["TypeScript", "Advanced", "Type Safety"],
    lessons: [
      {
        id: "5-1",
        title: "Advanced Types",
        description: "Union, intersection, and conditional types",
        duration: 35,
        type: "lesson",
        isLocked: false,
      },
    ],
  },
  {
    id: "6",
    slug: "web-development-basics",
    title: "Web Development Basics",
    description: "Learn HTML, CSS, and JavaScript basics. Build your first responsive website from scratch.",
    difficulty: "beginner",
    category: "Web Development",
    thumbnail: "🌐",
    language: "HTML/CSS/JS",
    duration: "10 hours",
    lessonsCount: 32,
    studentsCount: 18900,
    rating: 4.7,
    isFree: true,
    isPro: false,
    tags: ["HTML", "CSS", "Web Design"],
    lessons: [
      {
        id: "6-1",
        title: "HTML Fundamentals",
        description: "Structure of web pages",
        duration: 20,
        type: "lesson",
        isLocked: false,
      },
    ],
  },
  {
    id: "7",
    slug: "sql-database-design",
    title: "SQL & Database Design",
    description: "Master database fundamentals. Learn SQL queries, joins, indexes, normalization, and optimization.",
    difficulty: "intermediate",
    category: "Backend",
    thumbnail: "🗄️",
    language: "SQL",
    duration: "14 hours",
    lessonsCount: 38,
    studentsCount: 7200,
    rating: 4.6,
    isFree: false,
    isPro: true,
    tags: ["SQL", "Database", "Backend"],
    lessons: [
      {
        id: "7-1",
        title: "SQL Basics",
        description: "SELECT, WHERE, and basic queries",
        duration: 25,
        type: "lesson",
        isLocked: false,
      },
    ],
  },
  {
    id: "8",
    slug: "machine-learning-python",
    title: "Machine Learning with Python",
    description: "Enter the world of ML. Learn supervised/unsupervised learning, neural networks, and build ML models.",
    difficulty: "advanced",
    category: "Data Science",
    thumbnail: "🤖",
    language: "Python",
    duration: "25 hours",
    lessonsCount: 50,
    studentsCount: 6400,
    rating: 4.8,
    isFree: false,
    isPro: true,
    tags: ["ML", "AI", "Data Science"],
    lessons: [
      {
        id: "8-1",
        title: "Introduction to ML",
        description: "What is machine learning?",
        duration: 30,
        type: "lesson",
        isLocked: false,
      },
    ],
  },
];

export const categories = [
  "All Courses",
  "Programming",
  "Web Development",
  "Computer Science",
  "Backend",
  "Data Science",
];

export const difficulties = ["all", "beginner", "intermediate", "advanced"] as const;
