import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchFavorites, removeFavorite } from '../store/favoritesSlice';
import { useNavigate } from 'react-router-dom';

const Favorites = () => {
  const dispatch = useAppDispatch();
  const favorites = useAppSelector(state => state.favorites.items);
  const status = useAppSelector(state => state.favorites.status);
  const token = useAppSelector(state => state.user.token);
  const navigate = useNavigate();
  const [removingId, setRemovingId] = useState(null);
  const [removeError, setRemoveError] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
    dispatch(fetchFavorites(token));
  }, [dispatch, token, navigate]);

  const handleRemoveFavorite = async (bookId) => {
    setRemovingId(bookId);
    setRemoveError('');
    try {
      await dispatch(removeFavorite({ token, bookId })).unwrap();
    } catch {
      setRemoveError('Failed to remove favorite. Please try again.');
    } finally {
      setRemovingId(null);
    }
  };

  if (status === 'loading') return <div>Loading...</div>;
  if (status === 'failed') return <div>Failed to load favorites.</div>;

  return (
    <div>
      <h2>My Favorite Books</h2>
      {removeError && <p role="alert">{removeError}</p>}
      {favorites.length === 0 ? (
        <div style={{
          background: '#fff',
          padding: '2rem',
          borderRadius: '8px',
          maxWidth: '400px',
          margin: '2rem auto',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          textAlign: 'center',
          color: '#888',
        }}>
          <p>No favorite books yet.</p>
          <p>
            Go to the <a href="/books" onClick={e => { e.preventDefault(); navigate('/books'); }}>book list</a> to add some!
          </p>
        </div>
      ) : (
        <ul>
          {favorites.map(book => (
            <li key={book.id}>
              <strong>{book.title}</strong> by {book.author}
              <button
                onClick={() => handleRemoveFavorite(book.id)}
                disabled={removingId !== null}
                aria-label={`Remove ${book.title} from favorites`}
              >
                {removingId === book.id ? 'Removing...' : 'Remove from Favorites'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Favorites;
