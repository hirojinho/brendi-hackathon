export function buildNoteGenerationPrompt(content: string): string {
  return `You are a Zettelkasten note-taking assistant. Create concise notes for fundamental, reusable concepts.

Respond ONLY with a JSON object of the form:
{
  "thinking": "string",
  "notes": [ { "title": "string", "content": "string", "tags": ["string","string","string"] } ]
}

Guidelines:
- Prefer one broader note; at most 3 if truly distinct concepts.
- Use exactly 3 specific, hyphenated tags per note.
- Use Markdown for text and LaTeX for math ($...$ or $$...$$).

Content to analyze:
${content}`;
}


