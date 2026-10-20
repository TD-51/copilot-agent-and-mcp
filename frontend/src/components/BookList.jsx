
import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchBooks, setSort } from '../store/booksSlice';
import { addFavorite, fetchFavorites } from '../store/favoritesSlice';
import { useNavigate } from 'react-router-dom';
import styles from '../styles/BookList.module.css';

const BookList = () => {
  const dispatch = useAppDispatch();
  const books = useAppSelector(state => state.books.items);
  const status = useAppSelector(state => state.books.status);
  const sort = useAppSelector(state => state.books.sort);
  const order = useAppSelector(state => state.books.order);
  const token = useAppSelector(state => state.user.token);
  const navigate = useNavigate();
  const favorites = useAppSelector(state => state.favorites.items);

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
    dispatch(fetchBooks());
  }, [dispatch, token, navigate, sort, order]);

  useEffect(() => {
    if (!token) return;
    dispatch(fetchFavorites(token));
  }, [dispatch, token, navigate]);

  const handleAddFavorite = async (bookId) => {
    if (!token) {
      navigate('/');
      return;
    }
    await dispatch(addFavorite({ token, bookId }));
    dispatch(fetchFavorites(token));
  };

  return (
    <div>
      <h2>Books</h2>
      <label htmlFor="book-sort">Sort books: </label>
      <select
        id="book-sort"
        value={`${sort}-${order}`}
        onChange={event => {
          const [sort, order] = event.target.value.split('-');
          dispatch(setSort({ sort, order }));
        }}
      >
        <option value="title-asc">Title (A–Z)</option>
        <option value="title-desc">Title (Z–A)</option>
        <option value="author-asc">Author (A–Z)</option>
        <option value="author-desc">Author (Z–A)</option>
      </select>
      {status === 'loading' ? <div role="status">Loading...</div> :
        status === 'failed' ? <div role="alert">Failed to load books.</div> :
        books.length === 0 ? (
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
          <p>No books available.</p>
          <p>Check back later or add a new book if you have permission.</p>
        </div>
      ) : (
        <div className={styles.bookGrid}>
          {books.map(book => {
            const isFavorite = favorites.some(fav => fav.id === book.id);
            return (
              <div className={styles.bookCard + ' ' + styles.bookCardWithHeart} key={book.id}>
                {isFavorite && (
                  <span className={styles.favoriteHeart} title="In Favorites">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="#e25555" stroke="#e25555" strokeWidth="1.5">
                      <path d="M12 21s-6.2-5.2-8.4-7.4C1.2 11.2 1.2 8.1 3.1 6.2c1.9-1.9 5-1.9 6.9 0l2 2 2-2c1.9-1.9 5-1.9 6.9 0 1.9 1.9 1.9 5 0 6.9C18.2 15.8 12 21 12 21z"/>
                    </svg>
                  </span>
                )}
                <div className={styles.bookTitle}>{book.title}</div>
                <div className={styles.bookAuthor}>by {book.author}</div>
                <button
                  className={styles.simpleBtn}
                  onClick={() => handleAddFavorite(book.id)}
                >
                  {isFavorite ? 'In Favorites' : 'Add to Favorites'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BookList;
