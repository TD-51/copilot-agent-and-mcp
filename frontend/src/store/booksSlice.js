import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchBooks = createAsyncThunk('books/fetchBooks', async (_, { getState }) => {
  const { sort, order } = getState().books;
  const params = new URLSearchParams({ sort, order });
  const res = await fetch(`http://localhost:4000/api/books?${params}`);
  if (!res.ok) throw new Error('Failed to load books.');
  return res.json();
});

const booksSlice = createSlice({
  name: 'books',
  initialState: { items: [], status: 'idle', sort: 'title', order: 'asc', requestId: null },
  reducers: {
    setSort(state, action) {
      state.sort = action.payload.sort;
      state.order = action.payload.order;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchBooks.pending, (state, action) => {
        state.status = 'loading';
        state.requestId = action.meta.requestId;
      })
      .addCase(fetchBooks.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchBooks.rejected, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        state.status = 'failed';
      });
  },
});

export const { setSort } = booksSlice.actions;
export default booksSlice.reducer;
