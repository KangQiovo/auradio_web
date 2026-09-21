import test from 'node:test';
import assert from 'node:assert/strict';
import {albums} from '../src/lib/albums.mjs';
import {getPreviewItems} from '../src/lib/preview-library.mjs';

test('all theme song lists are derived from the same three selected records',()=>{
  const songs=getPreviewItems('歌曲','');
  assert.deepEqual(songs.map(x=>x.title),['自由的你','于是','G.E.M.']);
  assert.deepEqual(songs.map(x=>x.id),albums.map(x=>x.id));
  assert.ok(songs.every((x,i)=>x.subtitle.includes(albums[i].artist) && x.artwork===albums[i].artwork));
});
test('album and artist views use the real corresponding record metadata',()=>{
  assert.deepEqual(getPreviewItems('专辑','').map(x=>x.title),[...new Set(albums.map(x=>x.album))]);
  assert.deepEqual(getPreviewItems('艺术家','').map(x=>x.title),['G.E.M. 邓紫棋']);
});
test('preview search matches trimmed names and artist metadata without case sensitivity',()=>{
  assert.deepEqual(getPreviewItems('歌曲',' 自由 ').map(x=>x.title),['自由的你']);
  assert.equal(getPreviewItems('歌曲','g.e.m.').length,3);
  assert.equal(getPreviewItems('歌曲','不存在的歌').length,0);
});
