import { NotesRepository } from '../../domain/ports/repositories/index.js';
import { NoteEntity } from '../../domain/entities/index.js';

export class NotesService {
  constructor(private readonly notesRepo: NotesRepository) {}

  create(note: NoteEntity): void {
    this.notesRepo.save(note);
  }

  list(): NoteEntity[] {
    return this.notesRepo.list();
  }

  delete(id: string): void {
    this.notesRepo.delete(id);
  }

  updateSrs(
    id: string,
    update: Partial<Pick<NoteEntity, 'nextReview' | 'interval' | 'easiness' | 'repetitions' | 'lastReview' | 'lastPerformance'>>
  ): void {
    this.notesRepo.updateSrsFields(id, update);
  }
}


