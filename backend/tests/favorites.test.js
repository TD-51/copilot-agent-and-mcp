const request = require('supertest');
const express = require('express');
const createApiRouter = require('../routes');
const path = require('path');

const fs = require('fs');
const usersFile = path.join(__dirname, '../data/test-users.json');
const booksFile = path.join(__dirname, '../data/test-books.json');

// Helper to get a valid JWT
const jwt = require('jsonwebtoken');
const SECRET_KEY = 'test_secret';
function getToken(username = 'sandra') {
  return jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });
}

const app = express();
app.use(express.json());
app.use('/api', createApiRouter({
  usersFile,
  booksFile,
  readJSON: (file) => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')) : [],
  writeJSON: (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2)),
  authenticateToken: (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);
    try {
      req.user = jwt.verify(token, SECRET_KEY);
      next();
    } catch {
      return res.sendStatus(403);
    }
  },
  SECRET_KEY,
}));

describe('Favorites API', () => {
  it('GET /api/favorites should fail without auth', async () => {
    const res = await request(app).get('/api/favorites');
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/favorites should return favorites for valid user', async () => {
    const token = getToken('sandra');
    const res = await request(app)
      .get('/api/favorites')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/favorites should 404 for non-existent user', async () => {
    const token = getToken('nouser');
    const res = await request(app)
      .get('/api/favorites')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(404);
  });

  it('POST /api/favorites should add a book to favorites', async () => {
    const token = getToken('sandra');
    // Pick a book not already in favorites
    const books = JSON.parse(fs.readFileSync(booksFile, 'utf-8'));
    const users = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
    const sandra = users.find(u => u.username === 'sandra');
    const notFav = books.find(b => !sandra.favorites.includes(b.id));
    if (!notFav) return; // skip if all are favorites
    const res = await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookId: notFav.id });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/added/);
  });

  it('POST /api/favorites should not duplicate favorites', async () => {
    const token = getToken('sandra');
    const users = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
    const sandra = users.find(u => u.username === 'sandra');
    const alreadyFav = sandra.favorites[0];
    const res = await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookId: alreadyFav });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/added/);
  });

  it('POST /api/favorites should fail with missing bookId', async () => {
    const token = getToken('sandra');
    const res = await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/favorites should 404 for non-existent user', async () => {
    const token = getToken('nouser');
    const res = await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookId: '1' });
    expect(res.statusCode).toBe(404);
  });

  it('POST /api/favorites should fail without auth', async () => {
    const res = await request(app)
      .post('/api/favorites')
      .send({ bookId: '1' });
    expect(res.statusCode).toBe(401);
  });

  describe('DELETE /api/favorites', () => {
    it('should persist removal without changing other favorites or users', async () => {
      const users = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
      const sandra = users.find(u => u.username === 'sandra');
      const bookId = sandra.favorites[0];
      const expectedUsers = users.map(user => user.username === 'sandra'
        ? { ...user, favorites: user.favorites.filter(id => id !== bookId) }
        : user);

      const res = await request(app)
        .delete('/api/favorites')
        .set('Authorization', 'Bearer ' + getToken())
        .send({ bookId });
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/removed/);
      expect(JSON.parse(fs.readFileSync(usersFile, 'utf-8'))).toEqual(expectedUsers);

      const favorites = await request(app)
        .get('/api/favorites')
        .set('Authorization', 'Bearer ' + getToken());
      expect(favorites.statusCode).toBe(200);
      expect(favorites.body.map(book => book.id)).not.toContain(bookId);
      expect(favorites.body.map(book => book.id).sort()).toEqual(
        expectedUsers.find(user => user.username === 'sandra').favorites.slice().sort()
      );

      const repeated = await request(app)
        .delete('/api/favorites')
        .set('Authorization', 'Bearer ' + getToken())
        .send({ bookId });
      expect(repeated.statusCode).toBe(200);
      expect(JSON.parse(fs.readFileSync(usersFile, 'utf-8'))).toEqual(expectedUsers);
    });

    it('should fail without auth and leave data unchanged', async () => {
      const before = fs.readFileSync(usersFile, 'utf-8');
      const res = await request(app).delete('/api/favorites').send({ bookId: '1' });
      expect(res.statusCode).toBe(401);
      expect(fs.readFileSync(usersFile, 'utf-8')).toBe(before);
    });

    it('should fail with invalid auth and leave data unchanged', async () => {
      const before = fs.readFileSync(usersFile, 'utf-8');
      const res = await request(app)
        .delete('/api/favorites')
        .set('Authorization', 'Bearer ' + 'invalid')
        .send({ bookId: '1' });
      expect(res.statusCode).toBe(403);
      expect(fs.readFileSync(usersFile, 'utf-8')).toBe(before);
    });

    it.each([undefined, {}, { bookId: '' }])('should reject a missing bookId (%p)', async body => {
      const before = fs.readFileSync(usersFile, 'utf-8');
      const res = await request(app)
        .delete('/api/favorites')
        .set('Authorization', 'Bearer ' + getToken())
        .send(body);
      expect(res.statusCode).toBe(400);
      expect(fs.readFileSync(usersFile, 'utf-8')).toBe(before);
    });

    it('should 404 for a non-existent user', async () => {
      const before = fs.readFileSync(usersFile, 'utf-8');
      const res = await request(app)
        .delete('/api/favorites')
        .set('Authorization', 'Bearer ' + getToken('nouser'))
        .send({ bookId: '1' });
      expect(res.statusCode).toBe(404);
      expect(fs.readFileSync(usersFile, 'utf-8')).toBe(before);
    });

    it('should rate-limit repeated removal attempts without changing data', async () => {
      const before = fs.readFileSync(usersFile, 'utf-8');
      let res;
      for (let i = 0; i < 61; i++) {
        res = await request(app).delete('/api/favorites').send({ bookId: '1' });
        if (res.statusCode === 429) break;
        expect(res.statusCode).toBe(401);
      }
      expect(res.statusCode).toBe(429);
      expect(fs.readFileSync(usersFile, 'utf-8')).toBe(before);
    });
  });
});
