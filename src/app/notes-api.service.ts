import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Note } from './note.model';

export interface NewNote {
  title: string;
  content: string;
}

@Injectable({ providedIn: 'root' })
export class NotesApiService {
  private readonly http = inject(HttpClient);

  getNotes(): Observable<Note[]> {
    return this.http.get<Note[]>('/api/notes');
  }

  createNote(note: NewNote): Observable<Note> {
    return this.http.post<Note>('/api/notes', note);
  }
}
