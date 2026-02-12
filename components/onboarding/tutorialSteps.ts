export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target: string | null; // CSS selector for data-tutorial attribute, null for centered modal
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to LARA!',
    description: 'Create a task, collect drafts, and give high-quality feedback. LARA provides teacher-designed, research-informed guidance so students can understand their learning and improve with each draft. Let\'s take a quick tour to set up your first task.',
    target: null,
    position: 'center',
  },
  {
    id: 'create-task',
    title: 'Create Your First Task',
    description: 'Click here to create a new writing task for your students. You can set the prompt, success criteria, and customise feedback settings.',
    target: '[data-tutorial="create-task"]',
    position: 'bottom',
  },
  {
    id: 'share-task',
    title: 'Share with Students',
    description: 'Once you have a task, share this link with your students. They can join using the link or by entering the task code.',
    target: '[data-tutorial="share-task"]',
    position: 'top',
  },
  {
    id: 'student-list',
    title: 'Monitor Your Students',
    description: 'As students join, they appear here. You can see their status at a glance - who has joined, submitted, or needs attention.',
    target: '[data-tutorial="student-list"]',
    position: 'top',
  },
  {
    id: 'remove-student',
    title: 'Remove Students',
    description: 'Need to remove a student? Hover over their name and click the remove icon. Useful for removing test entries or mistakes.',
    target: '[data-tutorial="remove-student"]',
    position: 'bottom',
  },
  {
    id: 'generate-feedback',
    title: 'Generate AI Feedback',
    description: 'When students submit their work, you\'ll see them here. Click "Generate Feedback" to create personalised AI feedback for each student.',
    target: '[data-tutorial="generate-feedback"]',
    position: 'bottom',
  },
  {
    id: 'folders',
    title: 'Organise with Folders',
    description: 'Click "All Tasks" to view, organise, and drag tasks between folders. Create folders by class, topic, or any system that works for you.',
    target: '[data-tutorial="folders"]',
    position: 'right',
  },
];

export const ONBOARDING_KEY = 'lara-onboarding-completed';
