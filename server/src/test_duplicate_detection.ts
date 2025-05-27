import { 
  checkForDuplicateNote, 
  filterDuplicateNotes, 
  calculateStringSimilarity,
  calculateContentSimilarity,
  calculateTagOverlap,
  DUPLICATE_DETECTION_CONFIG 
} from './chatService.js';

// Sample notes for testing
const existingNotes = [
  {
    id: 'note1',
    title: 'Pythagorean Theorem',
    content: 'The Pythagorean theorem states that in a right triangle, the square of the hypotenuse equals the sum of squares of the other two sides: $a^2 + b^2 = c^2$.',
    tags: ['geometry', 'mathematics', 'triangles'],
    createdAt: new Date('2024-01-01')
  },
  {
    id: 'note2', 
    title: 'Chain Rule in Calculus',
    content: 'The chain rule is used to find the derivative of composite functions. If $f(x) = g(h(x))$, then $f\'(x) = g\'(h(x)) \\cdot h\'(x)$.',
    tags: ['calculus', 'derivatives', 'mathematics'],
    createdAt: new Date('2024-01-02')
  },
  {
    id: 'note3',
    title: 'Newton\'s Second Law',
    content: 'Newton\'s second law states that the force acting on an object equals its mass times acceleration: $F = ma$.',
    tags: ['physics', 'mechanics', 'laws'],
    createdAt: new Date('2024-01-03')
  }
];

// Test cases
const testNotes = [
  {
    title: 'Pythagorean Theorem Explanation', // Very similar title
    content: 'The Pythagorean theorem shows that in right triangles, the hypotenuse squared equals the sum of the other sides squared: $a^2 + b^2 = c^2$.',
    tags: ['geometry', 'math', 'triangles']
  },
  {
    title: 'Chain Rule for Derivatives', // Similar title
    content: 'When finding derivatives of composite functions, use the chain rule: $\\frac{d}{dx}f(g(x)) = f\'(g(x)) \\cdot g\'(x)$.',
    tags: ['calculus', 'derivatives', 'mathematics']
  },
  {
    title: 'Quadratic Formula', // Completely different
    content: 'The quadratic formula solves equations of the form $ax^2 + bx + c = 0$: $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$.',
    tags: ['algebra', 'quadratic', 'mathematics']
  },
  {
    title: 'Force and Acceleration', // Different title, similar content
    content: 'The relationship between force, mass, and acceleration is described by Newton\'s second law: $F = ma$.',
    tags: ['physics', 'mechanics', 'newton']
  }
];

function runTests() {
  console.log('=== Duplicate Detection Test ===\n');
  
  // Test individual similarity functions
  console.log('1. Testing similarity calculations:');
  console.log(`Title similarity: ${(calculateStringSimilarity('Pythagorean Theorem', 'Pythagorean Theorem Explanation') * 100).toFixed(1)}%`);
  console.log(`Content similarity: ${(calculateContentSimilarity(existingNotes[0].content, testNotes[0].content) * 100).toFixed(1)}%`);
  console.log(`Tag overlap: ${(calculateTagOverlap(existingNotes[0].tags, testNotes[0].tags) * 100).toFixed(1)}%\n`);
  
  // Test duplicate detection for each note
  console.log('2. Testing duplicate detection:');
  testNotes.forEach((testNote, index) => {
    const result = checkForDuplicateNote(testNote, existingNotes);
    console.log(`Test Note ${index + 1}: "${testNote.title}"`);
    console.log(`  Is Duplicate: ${result.isDuplicate}`);
    if (result.isDuplicate) {
      console.log(`  Reason: ${result.reason}`);
      console.log(`  Similar to: "${result.similarNote?.title}"`);
    }
    console.log('');
  });
  
  // Test batch filtering
  console.log('3. Testing batch filtering:');
  const { acceptedNotes, rejectedNotes } = filterDuplicateNotes(testNotes, [...existingNotes]);
  console.log(`Accepted: ${acceptedNotes.length} notes`);
  console.log(`Rejected: ${rejectedNotes.length} notes`);
  
  if (rejectedNotes.length > 0) {
    console.log('\nRejected notes:');
    rejectedNotes.forEach(rejected => {
      console.log(`  - "${rejected.note.title}": ${rejected.reason}`);
    });
  }
  
  if (acceptedNotes.length > 0) {
    console.log('\nAccepted notes:');
    acceptedNotes.forEach(accepted => {
      console.log(`  - "${accepted.title}"`);
    });
  }
  
  console.log('\n=== Configuration ===');
  console.log(`Title similarity threshold: ${DUPLICATE_DETECTION_CONFIG.TITLE_SIMILARITY_THRESHOLD * 100}%`);
  console.log(`Content similarity threshold: ${DUPLICATE_DETECTION_CONFIG.CONTENT_SIMILARITY_THRESHOLD * 100}%`);
  console.log(`Tag overlap threshold: ${DUPLICATE_DETECTION_CONFIG.TAG_OVERLAP_THRESHOLD * 100}%`);
  console.log(`Min content length: ${DUPLICATE_DETECTION_CONFIG.MIN_CONTENT_LENGTH} chars`);
}

// Run tests if this file is executed directly
// (Removed import.meta check for TypeScript compatibility)

export { runTests }; 