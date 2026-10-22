// Only link works with verified source information. Do not infer books for other movies.
export const BOOKS = {
 "alice-wonderland": {
   id: "alice-wonderland", title: "Alice’s Adventures in Wonderland", author: "Lewis Carroll", year: 1865,
   filmId: "alice-1903", file: "/books/alice-in-wonderland.txt",
   publicSource: "https://www.gutenberg.org/ebooks/11",
   introduction: "Follow Alice from the riverbank into Wonderland, then watch the 1903 adaptation together.",
   preview: "Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, ‘and what is the use of a book,’ thought Alice ‘without pictures or conversations?’"
 }
};
export const bookForFilm = (film) => film?.bookId ? BOOKS[film.bookId] : null;
