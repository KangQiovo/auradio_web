import {albums} from './albums.mjs';
// Theme previews and selected listening have one catalog; none of this is a user's local library.
const songs = albums.map(a => ({id:a.id,title:a.title,subtitle:`${a.artist} · ${a.album}`,artwork:a.artwork}));
const records = [...new Map(albums.map(a => [a.album,{id:a.id,title:a.album,subtitle:a.artist,artwork:a.artwork}])).values()];
const artists = [...new Map(albums.map(a => [a.artist,{id:a.artist,title:a.artist,subtitle:'精选聆听 · 网页示意',artwork:a.artwork}])).values()];
/** @type {Record<string, {id:string,title:string,subtitle:string,artwork:string}[]>} */
const library = {'歌曲':songs,'专辑':records,'艺术家':artists};
/** @param {string} category @param {string} query */
export function getPreviewItems(category,query='') {
  const text=query.normalize('NFKC').trim().toLocaleLowerCase('zh-CN');
  return (library[category] || songs).filter(item => `${item.title} ${item.subtitle}`.normalize('NFKC').toLocaleLowerCase('zh-CN').includes(text));
}
