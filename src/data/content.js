/**
 * @typedef {Object} Certificate
 * @property {string} title
 * @property {string} issuer
 * @property {string} issuedAt
 * @property {string} credentialId
 * @property {string} verificationUrl
 * @property {string} mediaUrl
 * @property {string[]} skills
 * @property {string} summary
 * @property {boolean} featured
 */

/**
 * @typedef {Object} BlogPost
 * @property {string} slug
 * @property {string} title
 * @property {string} excerpt
 * @property {string} date
 * @property {string[]} tags
 * @property {string} cover
 * @property {string} readingTime
 * @property {string} body
 */

export const profile = {
  name: "Mohammad Sameer",
  role: "Generative AI Developer Intern",
  company: "AI Zoned",
  education: "B.Tech Computer Science, AI & ML Specialisation",
  semester: "6th semester, currently giving end-sem exams",
  location: "Greater Noida, India",
  phone: "+91 8603829005",
  email: "hello@sam18.xyz",
  resumeUrl: "/assets/mohammad-sameer-resume.pdf",
  avatarAlt: "Abstract neural console artwork for Mohammad Sameer",
  summary:
    "AI and Machine Learning engineer building production-ready GenAI applications with RAG, FastAPI, LangChain, cloud backends, and practical product workflows.",
  status: [
    "GenAI intern at AI Zoned",
    "RAG and LLM app builder",
    "FastAPI + cloud backend",
    "President, Technova"
  ],
  socials: [
    { label: "Email", href: "mailto:hello@sam18.xyz" },
    { label: "LinkedIn", href: "https://linkedin.com/in/connect-to-sam-xyz" },
    { label: "GitHub", href: "https://github.com/sam0786-xyz" },
    { label: "Resume", href: "/assets/mohammad-sameer-resume.pdf" }
  ]
};

export const stats = [];

export const skills = [
  {
    group: "AI & Machine Learning",
    items: ["Generative AI", "RAG", "LangChain", "Gemini LLMs", "Scikit-learn", "TensorFlow"]
  },
  {
    group: "Programming & Backend",
    items: ["Python", "C++", "Java", "SQL", "FastAPI", "JWT authentication"]
  },
  {
    group: "Cloud & Product Tools",
    items: ["AWS", "GCP", "Azure", "DynamoDB", "Qdrant", "ElevenLabs", "Twilio"]
  }
];

export const experience = [
  {
    role: "Generative AI Developer Intern",
    company: "AI Zoned",
    location: "Gurugram, Haryana, India",
    period: "Oct 2025 - Present",
    highlights: [
      "Engineered a full-stack AI-driven CA exam preparation platform using Next.js, FastAPI, AWS, Gemini LLMs, and Qdrant.",
      "Delivered automated answer sheet grading and semantic study material retrieval workflows.",
      "Built a voice-based conversational AI system using ElevenLabs and Twilio for real-time interaction.",
      "Developed FastAPI backend services with JWT authentication and DynamoDB for scalable data handling."
    ],
    tags: ["Next.js", "FastAPI", "AWS", "Gemini", "Qdrant", "DynamoDB"]
  }
];

export const projects = [
  {
    title: "Technova Society Website",
    type: "Full-stack platform",
    status: "Dec 2025 - Mar 2026",
    summary:
      "Built and deployed a Next.js and Supabase platform centralizing technical society event management with a gamified dashboard and real-time QR-based attendance.",
    impact: "Scaled impact to 800+ students and supported 5,000+ QR scans for a 24-hour event.",
    tags: ["Next.js", "TypeScript", "Tailwind CSS", "Framer Motion", "Supabase", "Resend"],
    href: "#"
  },
  {
    title: "Gmail Newsletters to Podcast",
    type: "AI automation pipeline",
    status: "Project",
    summary:
      "Built an automated pipeline that converts newsletters into audio summaries using Gmail API, Gemini 2.5 Flash, ElevenLabs, and Pydub.",
    impact: "Reduced manual reading time by approximately 1 hour daily.",
    tags: ["Gmail API", "Gemini 2.5 Flash", "ElevenLabs", "Pydub"],
    href: "#"
  },
  {
    title: "AI CA Exam Preparation Platform",
    type: "Professional AI product",
    status: "AI Zoned",
    summary:
      "A full-stack AI product for automated answer grading and semantic material retrieval using Gemini LLMs, Qdrant, FastAPI, AWS, and Next.js.",
    impact: "Combines RAG, cloud APIs, authentication, and production data handling.",
    tags: ["RAG", "Gemini", "Qdrant", "FastAPI", "AWS", "Next.js"],
    href: "/blog/genai-field-notes/"
  }
];

export const education = [
  {
    school: "Sharda University",
    location: "Greater Noida, Uttar Pradesh, India",
    degree: "Bachelor of Technology in Computer Science (AI & ML Specialization)",
    period: "Aug 2023 - May 2027"
  },
  {
    school: "Good Samaritan School",
    location: "Jasola, New Delhi",
    degree: "Science with Mathematics",
    period: "Apr 2022 - Apr 2023"
  }
];

export const responsibilities = [
  {
    title: "President, Technova - Technical Society of Sharda University",
    period: "Sept 2025 - Present",
    summary: "Leading 70+ members across 8 technical domains and driving execution of technical initiatives."
  },
  {
    title: "Volunteer, MLOps.Community - Delhi NCR",
    period: "Mar 2025 - Present",
    summary: "Supporting event execution and community coordination."
  }
];

/** @type {Certificate[]} */
export const certificates = [
  {
    title: "Machine Learning Specialization",
    issuer: "Stanford & DeepLearning.AI",
    issuedAt: "2025-01",
    credentialId: "Add credential ID",
    verificationUrl: "",
    mediaUrl: "",
    skills: ["Machine Learning", "Supervised Learning", "Model Evaluation"],
    summary:
      "Credential from Stanford and DeepLearning.AI covering core machine learning concepts and applied model development.",
    featured: true
  },
  {
    title: "AWS Cloud Quest: Practitioner",
    issuer: "AWS",
    issuedAt: "2025-01",
    credentialId: "Add credential ID",
    verificationUrl: "",
    mediaUrl: "",
    skills: ["AWS", "Cloud", "Cloud Practitioner"],
    summary:
      "AWS practitioner-level cloud learning credential aligned with backend and deployment workflows.",
    featured: true
  },
  {
    title: "Verified Certificate Slot",
    issuer: "Add issuer",
    issuedAt: "2026-05",
    credentialId: "Add ID",
    verificationUrl: "",
    mediaUrl: "",
    skills: ["Add skill", "Add skill"],
    summary:
      "Duplicate this entry for each LinkedIn Learning, Coursera, Google, Microsoft, NVIDIA, or university certificate.",
    featured: false
  }
];

/** @type {BlogPost[]} */
export const blogPosts = [
  {
    slug: "genai-field-notes",
    title: "GenAI Field Notes: Building Like a Student Researcher",
    excerpt:
      "A starter essay for the portfolio blog about learning, building, evaluating, and explaining AI systems without sounding like everyone else.",
    date: "2026-05-02",
    tags: ["Generative AI", "Learning", "Portfolio"],
    cover: "/assets/neural-console.png",
    readingTime: "4 min read",
    body: `
      <p>Good AI work is not only about knowing the newest model. It is about learning how to turn uncertainty into experiments, experiments into interfaces, and interfaces into something a real person can trust.</p>
      <h2>The Workbench Mindset</h2>
      <p>My current focus is building small, clear systems: prompts that can be inspected, outputs that can be evaluated, and product flows that keep humans in control.</p>
      <figure class="math-block" data-math="L(\\theta)=\\frac{1}{n}\\sum_{i=1}^{n}(y_i-\\hat{y_i})^2">
        <figcaption>Loss functions are reminders that learning needs feedback.</figcaption>
        <code>L(theta) = 1/n sum(y - y_hat)^2</code>
      </figure>
      <h2>What Matters Most</h2>
      <p>I care about the full loop: understanding the problem, designing the interaction, building the prototype, measuring the impact, and communicating what the system can and cannot do.</p>
      <pre><code>observe -> prototype -> evaluate -> explain -> improve</code></pre>
    `
  }
];

export const linkedinPosts = [
  {
    id: "genai-ai-zoned",
    title: "GenAI Developer Intern at AI Zoned",
    url: "https://www.linkedin.com/in/connect-to-sam-xyz/",
    publishedAt: "2026-05-01",
    summary:
      "Public LinkedIn profile highlight for applied AI and generative systems work at AI Zoned, including RAG, LLM workflows, and backend implementation.",
    tags: ["Generative AI", "RAG", "AI Zoned"],
    featured: true,
    embedHtml: ""
  },
  {
    id: "linkedin-certifications",
    title: "Google Cloud and GenAI learning trail",
    url: "https://www.linkedin.com/in/connect-to-sam-xyz/",
    publishedAt: "2026-04-20",
    summary:
      "Profile-visible certifications include Google Cloud Computing Foundations, Introduction to Generative AI, and Prompt Engineering.",
    tags: ["Google Cloud", "GenAI", "Prompt Engineering"],
    featured: true,
    embedHtml: ""
  },
  {
    id: "technova-leadership",
    title: "Technova and community leadership",
    url: "https://www.linkedin.com/in/connect-to-sam-xyz/",
    publishedAt: "2026-03-28",
    summary:
      "Public profile highlight for Technova leadership, community work, and technical society execution across multiple domains.",
    tags: ["Technova", "Leadership", "Community"],
    featured: true,
    embedHtml: ""
  }
];

export const siteContentVersion = 4;
