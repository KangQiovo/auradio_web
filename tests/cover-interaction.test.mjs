import test from 'node:test';
import assert from 'node:assert/strict';
import {coverPose,horizontalStep} from '../src/lib/cover-interaction.mjs';
const rect={left:100,top:200,width:400,height:400};
test('centered cover stays level and edges tilt within subtle bounds',()=>{
  const center=coverPose(300,400,rect);
  assert.equal(Math.abs(center.rotateX),0);assert.equal(Math.abs(center.rotateY),0);
  const edge=coverPose(500,200,rect);
  assert.ok(edge.rotateX>0 && edge.rotateY>0);
  assert.ok(edge.rotateX<=8 && edge.rotateY<=8);
});
test('outside coordinates and invalid layout cannot explode cover transforms',()=>{
  assert.deepEqual(coverPose(9000,-1000,rect),coverPose(500,200,rect));
  for(const bad of [0,NaN]) {
    const pose=coverPose(NaN,Infinity,{...rect,width:bad});
    assert.ok(Object.values(pose).every(Number.isFinite));
    assert.equal(pose.rotateX,0);assert.equal(pose.rotateY,0);
  }
});
test('coarse-pointer tilt is smaller than mouse tilt',()=>{
  const mouse=coverPose(500,200,rect),touch=coverPose(500,200,rect,true);
  assert.ok(touch.rotateX<mouse.rotateX && touch.rotateY<mouse.rotateY);
});
test('horizontal swipes select only after threshold; scrolling and taps do not',()=>{
  assert.equal(horizontalStep(-90,10),1);assert.equal(horizontalStep(90,10),-1);
  assert.equal(horizontalStep(12,1),0);assert.equal(horizontalStep(65,100),0);
  assert.equal(horizontalStep(60,50),0);assert.equal(horizontalStep(NaN,0),0);
});
