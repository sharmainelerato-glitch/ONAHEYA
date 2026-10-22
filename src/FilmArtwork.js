
/*
  =========================================
  ONAHEYA — FILM ARTWORK
  =========================================

  Local artwork for films, series
  and documentaries.

  Folder: public/images/posters/
*/

export const filmArtwork = {
  // ORIGINAL FILMS

  "big-buck-bunny": {
    src: "/images/posters/big-buck-bunny.png",
    alt: "Big Buck Bunny",
  },

  sintel: {
    src: "/images/posters/sintel.png",
    alt: "Sintel",
  },

  "tears-of-steel": {
    src: "/images/posters/tears-of-steel.png",
    alt: "Tears of Steel",
  },

  spring: {
    src: "/images/posters/spring.png",
    alt: "Spring",
  },

  "alice-1903": {
    src: "/images/posters/alice-1903.png",
    alt: "Alice in Wonderland",
  },

  // NEW ANIMATED SERIES

  caminandes: {
    src: "/images/posters/caminandes.png",
    alt: "Caminandes animated series",
  },

  // NEW SHORT FILM

  "coffee-run": {
    src: "/images/posters/coffee-run.png",
    alt: "Coffee Run",
  },

  // NEW DOCUMENTARIES

  "journeys-of-apollo": {
    src: "/images/posters/journeys-of-apollo.png",
    alt: "The Journeys of Apollo",
  },

  "whos-out-there": {
    src: "/images/posters/whos-out-there.png",
    alt: "Who's Out There?",
  },
};

// Get artwork using a film ID

export function getFilmArtwork(filmId) {
  return filmArtwork[filmId] || null;
}

// Get artwork using a title

export function getArtworkByTitle(title) {
  const normalized = String(title || "")
    .trim()
    .toLowerCase();

  const titles = {
    "big buck bunny": "big-buck-bunny",
    "sintel": "sintel",
    "tears of steel": "tears-of-steel",
    "spring": "spring",
    "alice in wonderland": "alice-1903",
    "alice's adventures in wonderland": "alice-1903",
    "caminandes": "caminandes",
    "coffee run": "coffee-run",
    "the journeys of apollo": "journeys-of-apollo",
    "journeys of apollo": "journeys-of-apollo",
    "who's out there?": "whos-out-there",
    "who's out there": "whos-out-there",
    "whos out there": "whos-out-there",
  };

  const filmId = titles[normalized];

  return filmId ? filmArtwork[filmId] : null;
}
