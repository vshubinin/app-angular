import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe, registerLocaleData } from '@angular/common';
import localeRu from '@angular/common/locales/ru';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { Note } from './note.model';
import { NotesApiService } from './notes-api.service';
import { NewNote } from './notes-api.service';

registerLocaleData(localeRu);

@Component({
  imports: [DatePipe, FormsModule, RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App implements OnInit {
  private readonly notesApi = inject(NotesApiService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly notes = signal<Note[]>([]);
  protected readonly isCreating = signal(false);
  protected readonly loadError = signal('');
  protected readonly saveError = signal('');
  protected title = '';
  protected content = '';

  ngOnInit(): void {
    if (!this.isBrowser) {
      return;
    }

    this.notesApi.getNotes().subscribe({
      next: (notes) => this.notes.set(notes),
      error: () => this.loadError.set('Не удалось загрузить заметки. Обновите страницу позже.'),
    });
  }

  protected createNote(): void {
    const title = this.title.trim();
    const content = this.content.trim();

    if (!title || !content) {
      return;
    }

    const newNote: NewNote = { title, content };
    this.saveError.set('');
    this.notesApi.createNote(newNote).subscribe({
      next: (note) => {
        this.notes.update((notes) => [note, ...notes]);
        this.title = '';
        this.content = '';
        this.isCreating.set(false);
      },
      error: () => this.saveError.set('Не удалось сохранить заметку. Попробуйте ещё раз.'),
    });
  }

  protected cancelCreation(): void {
    this.title = '';
    this.content = '';
    this.saveError.set('');
    this.isCreating.set(false);
  }
}
