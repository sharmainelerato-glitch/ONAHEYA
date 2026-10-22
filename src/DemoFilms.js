// Locally hosted, appropriately licensed titles. Match files in public/videos/.
// Video availability is checked at playback; no commercial streaming rights implied.
export const DEMO_FILMS = [
  {id:"big-buck-bunny",title:"Big Buck Bunny",year:2008,genre:"Animation · Comedy",runtime:"10 min",file:"/videos/onaheya-demo.mov",credit:"© 2008 Blender Foundation · CC BY 3.0",source:"https://peach.blender.org/",description:"A gentle giant of a rabbit turns the tables on three troublesome forest animals.",tone:"peach"},
  {id:"tears-of-steel",title:"Tears of Steel",year:2012,genre:"Sci-Fi · Drama",runtime:"12 min",file:"/videos/tears-of-steel.webm",credit:"© Blender Foundation · Creative Commons Attribution",source:"https://mango.blender.org/about/",description:"A team of scientists tries to change the past to save the future.",tone:"steel"},
  {id:"alice-1903",title:"Alice in Wonderland",year:1903,genre:"Fantasy · Silent classic",runtime:"8 min",file:"/videos/alice.webm",credit:"1903 film by Cecil Hepworth and Percy Stow · public domain",source:"https://commons.wikimedia.org/wiki/File:Alice_In_Wonderland_(1903)_-_Public_Domain_Silent_Fantasy.webm",description:"A pioneering silent-film adaptation of Lewis Carroll’s beloved book.",tone:"alice",bookId:"alice-wonderland"},
  {id:"spring",title:"Spring",year:2019,genre:"Fantasy · Animation",runtime:"8 min",file:"/videos/spring.webm",credit:"© Blender Animation Studio · Creative Commons Attribution",source:"https://studio.blender.org/films/",description:"A shepherd girl and her dog encounter ancient spirits in the mountains.",tone:"forest"},
  {id:"caminandes",title:"Caminandes",year:2013,genre:"Animation · Comedy · Family",runtime:"3 short episodes",type:"series",file:"/videos/series/caminandes/episode-1.mp4",credit:"© Blender Foundation · check film-specific CC licence and provide attribution",source:"https://studio.blender.org/projects/caminandes-3/",description:"Join Koro the llama in three playful adventures across Patagonia.",episodes:[
    {id:"caminandes-1",number:1,title:"Llama Drama",runtime:"2 min",file:"/videos/series/caminandes/episode-1.mp4"},
    {id:"caminandes-2",number:2,title:"Gran Dillama",runtime:"2 min",file:"/videos/series/caminandes/episode-2.webm"},
    {id:"caminandes-3",number:3,title:"Llamigos",runtime:"3 min",file:"/videos/series/caminandes/episode-3.webm"}
  ]},
  {id:"coffee-run",title:"Coffee Run",year:2020,genre:"Animation · Romance · Short Film",runtime:"3 min",type:"short",file:"/videos/films/coffee-run.webm",credit:"© Blender Studio · Creative Commons Attribution 4.0",source:"https://studio.blender.org/projects/coffee-run/",description:"A fast-paced story of a relationship told through one memorable coffee run."},
  {id:"journeys-of-apollo",title:"The Journeys of Apollo",year:2009,genre:"Documentary · Space · History",runtime:"57 min",type:"documentary",file:"/videos/documentaries/journeys-of-apollo.webm",credit:"NASA documentary · verify source credit and reuse notices",source:"https://commons.wikimedia.org/wiki/File:The_Journeys_of_Apollo.webm",description:"Explore the ambitions, missions and achievements of the Apollo programme."},
  {id:"whos-out-there",title:"Who's Out There?",year:1975,genre:"Documentary · Science · Space",runtime:"28 min",type:"documentary",file:"/videos/documentaries/whos-out-there.webm",credit:"NASA documentary · verify file-specific credit and reuse notices",source:"https://commons.wikimedia.org/wiki/File:Who%27s_Out_There_(1975).webm",description:"An archival exploration of the possibility of life beyond Earth."},
];
export const demoFilmById = id => DEMO_FILMS.find(f => f.id === id) || DEMO_FILMS[0];

/*
 * ONAHEYA — CLOUD VIDEO DELIVERY
 *
 * Uses local videos during development.
 * Uses Cloudflare R2 when configured.
 */

const MEDIA_BASE = (
  import.meta.env.VITE_MEDIA_BASE_URL || ""
).replace(/\/$/, "");

function resolveVideoUrl(localPath) {
  if (!MEDIA_BASE || !localPath) {
    return localPath;
  }

  // All R2 videos were uploaded into the
  // root of the bucket.
  const filename = localPath.split("/").pop();

  // R2 currently contains the MOV version
  // of Big Buck Bunny, if uploaded with
  // the filename used during setup.
  const remoteName =
    filename === "onaheya-demo.mov"
      ? "big-buck-bunny.mov"
      : filename;

  return `${MEDIA_BASE}/${remoteName}`;
}

for (const film of DEMO_FILMS) {
  film.file = resolveVideoUrl(film.file);

  if (film.episodes) {
    for (const episode of film.episodes) {
      episode.file = resolveVideoUrl(episode.file);
    }
  }
}
