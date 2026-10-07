import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { App } from './app';
import { NotesApiService } from './notes-api.service';

describe('App', () => {
  let notesApi: { getNotes: ReturnType<typeof vi.fn>; createNote: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    notesApi = {
      getNotes: vi.fn().mockReturnValue(of([])),
      createNote: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: NotesApiService, useValue: notesApi }],
    })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the notes workspace', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Заметки');
    expect(compiled.querySelector('.empty-state')).toBeTruthy();
  });

  it('should create a note from the form', async () => {
    const fixture = TestBed.createComponent(App);
    notesApi.createNote.mockImplementation(({ title, content }) => of({
      id: 'note-1',
      title,
      content,
      createdAt: '2026-10-06T12:00:00.000Z',
    }));
    fixture.componentInstance['isCreating'].set(true);
    await fixture.whenStable();
    fixture.componentInstance['title'] = 'План';
    fixture.componentInstance['content'] = 'Купить продукты';
    fixture.componentInstance['createNote']();
    fixture.detectChanges();

    expect(fixture.componentInstance['notes']()).toHaveLength(1);
    expect((fixture.nativeElement as HTMLElement).querySelector('.note-card h3')?.textContent).toContain('План');
    expect(notesApi.createNote).toHaveBeenCalledWith({ title: 'План', content: 'Купить продукты' });
  });
});
