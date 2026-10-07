import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import type { Note } from './app/note.model';

const browserDistFolder = join(import.meta.dirname, '../browser');
const notesFile = process.env['NOTES_FILE'] ?? join(process.cwd(), 'data', 'notes.json');

const app = express();
const angularApp = new AngularNodeAppEngine();
app.use(express.json());

async function readNotes(): Promise<Note[]> {
  try {
    return JSON.parse(await readFile(notesFile, 'utf8')) as Note[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
    await mkdir(dirname(notesFile), { recursive: true });
    await writeFile(notesFile, '[]\n', { flag: 'wx' }).catch((writeError: NodeJS.ErrnoException) => {
      if (writeError.code !== 'EEXIST') {
        throw writeError;
      }
    });
    return [];
  }
}

let writeQueue = Promise.resolve();

async function appendNote(note: Note): Promise<void> {
  const write = writeQueue.then(async () => {
    const notes = await readNotes();
    notes.unshift(note);
    await mkdir(dirname(notesFile), { recursive: true });
    const temporaryFile = `${notesFile}.${randomUUID()}.tmp`;
    await writeFile(temporaryFile, `${JSON.stringify(notes, null, 2)}\n`, 'utf8');
    await rename(temporaryFile, notesFile);
  });
  writeQueue = write.catch(() => undefined);
  await write;
}

app.get('/api/notes', async (_req, res, next) => {
  try {
    res.json(await readNotes());
  } catch (error) {
    next(error);
  }
});

app.post('/api/notes', async (req, res, next) => {
  try {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    if (!title || !content || title.length > 80 || content.length > 2000) {
      res.status(400).json({ error: 'Укажите заголовок и текст заметки допустимой длины.' });
      return;
    }

    const note: Note = {
      id: randomUUID(),
      title,
      content,
      createdAt: new Date().toISOString(),
    };
    await appendNote(note);
    res.status(201).json(note);
  } catch (error) {
    next(error);
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
