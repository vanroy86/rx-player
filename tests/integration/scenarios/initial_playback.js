/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { expect } from "chai";
import RxPlayer from "../../../src";
import { manifestInfos } from "../../contents/DASH_static_SegmentTimeline";
import sleep from "../../utils/sleep.js";
import waitForState, {
  waitForLoadedStateAfterLoadVideo,
} from "../../utils/waitForPlayerState";
import XHRMock from "../../utils/request_mock";

describe("basic playback use cases: non-linear DASH SegmentTimeline", function () {
  let player;
  let xhrMock;

  beforeEach(() => {
    player = new RxPlayer();
    xhrMock = new XHRMock();
  });

  afterEach(() => {
    player.dispose();
    xhrMock.restore();
  });

  it("should begin playback on play", async function () {
    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
    });
    await waitForLoadedStateAfterLoadVideo(player);
    player.play();
    await sleep(200);
    expect(player.getPosition()).to.be.above(0);
    expect(player.getPosition()).to.be.below(0.25);
    expect(player.getVideoLoadedTime()).to.be.above(0);
    expect(player.getVideoPlayedTime()).to.be.above(0);
  });

  it("should play slowly for a speed inferior to 1", async function () {
    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
    });
    await waitForLoadedStateAfterLoadVideo(player);
    player.setPlaybackRate(0.5);
    player.play();
    const lastPosition = player.getPosition();
    await sleep(300);
    expect(player.getPosition()).to.be.below(0.35);
    expect(player.getPosition()).to.be.above(0.05);
    expect(player.getPosition()).to.be.above(lastPosition);
    expect(player.getVideoLoadedTime()).to.be.above(0);
    expect(player.getVideoPlayedTime()).to.be.above(0);
    expect(player.getPlaybackRate()).to.equal(0.5);
    expect(player.getVideoElement().playbackRate).to.equal(0.5);
  });

  it("should play faster for a speed superior to 1", async function () {
    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
    });
    await waitForLoadedStateAfterLoadVideo(player);
    player.setPlaybackRate(3);
    player.play();
    await sleep(300);
    expect(player.getPosition()).to.be.below(1);
    expect(player.getPosition()).to.be.above(0.5);
    expect(player.getVideoLoadedTime()).to.be.above(0);
    expect(player.getVideoPlayedTime()).to.be.above(0);
    expect(player.getPlaybackRate()).to.equal(3);
    expect(player.getVideoElement().playbackRate).to.equal(3);
  });

  it("should be able to seek when loaded", async function () {
    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
    });
    await waitForLoadedStateAfterLoadVideo(player);
    player.seekTo(10);
    expect(player.getPosition()).to.equal(10);
    expect(player.getPlayerState()).to.equal("LOADED");
    player.play();
    await sleep(600);
    expect(player.getPlayerState()).to.equal("PLAYING");
    expect(player.getPosition()).to.be.above(10);
  });

  it("should end if seeking to the end when loaded", async function () {
    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
    });
    await waitForLoadedStateAfterLoadVideo(player);
    player.seekTo(player.getMaximumPosition() + 1);
    await sleep(10);
    expect(player.getPlayerState()).to.equal("ENDED");
  });

  it("should end if seeking to the end when playing", async function () {
    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
      autoPlay: true,
    });
    await waitForLoadedStateAfterLoadVideo(player);
    player.seekTo(player.getMaximumPosition() + 1);
    await sleep(200);
    expect(player.getPlayerState()).to.equal("ENDED");
  });

  it("should seek to minimum position for negative positions when loaded", async function () {
    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
    });
    await waitForLoadedStateAfterLoadVideo(player);
    player.seekTo(-2);
    expect(player.getPosition()).to.equal(player.getMinimumPosition());
    expect(player.getPlayerState()).to.equal("LOADED");
    player.play();
    await sleep(200);
    expect(player.getPlayerState()).to.equal("PLAYING");
    expect(player.getPosition()).to.be.above(player.getMinimumPosition());
  });

  it("should seek to maximum position if manual seek is higher than maximum when loaded", async function () {
    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
    });
    await waitForLoadedStateAfterLoadVideo(player);
    player.seekTo(200);
    expect(player.getPlayerState()).to.equal("LOADED");
    expect(player.getPosition()).to.equal(player.getMaximumPosition());
  });

  it("should seek to minimum position for negative positions after playing", async function () {
    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
    });
    await waitForLoadedStateAfterLoadVideo(player);
    player.play();
    await sleep(100);
    player.seekTo(-2);
    expect(player.getPosition()).to.equal(player.getMinimumPosition());
    expect(player.getPlayerState()).to.equal("PLAYING");
  });

  it("should seek to maximum position if manual seek is higher than maximum after playing", async function () {
    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
    });
    await waitForLoadedStateAfterLoadVideo(player);
    expect(player.getPlayerState()).to.equal("LOADED");
    player.play();
    player.seekTo(200);
    expect(player.getPosition()).to.equal(player.getMaximumPosition());
  });

  it("should seek to minimum position for negative positions when paused", async function () {
    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
    });
    await waitForLoadedStateAfterLoadVideo(player);
    player.play();
    await sleep(100);
    player.pause();
    await sleep(10);
    expect(player.getPlayerState()).to.equal("PAUSED");
    player.seekTo(-2);
    expect(player.getPosition()).to.equal(player.getMinimumPosition());
    expect(player.getPlayerState()).to.equal("PAUSED");
  });

  it("should seek to maximum position if manual seek is higher than maximum when paused", async function () {
    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
    });
    await waitForLoadedStateAfterLoadVideo(player);
    expect(player.getPlayerState()).to.equal("LOADED");
    player.play();
    await sleep(100);
    player.pause();
    await sleep(10);
    expect(player.getPlayerState()).to.equal("PAUSED");
    player.seekTo(200);
    expect(player.getPosition()).to.equal(player.getMaximumPosition());
    expect(player.getPlayerState()).to.equal("PAUSED");
  });

  it("should download first segment when wanted buffer ahead is under first segment duration", async function () {
    xhrMock.lock();
    player.setWantedBufferAhead(2);
    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
    });

    await sleep(1);
    expect(xhrMock.getLockedXHR().length).to.equal(1); // Manifest
    await xhrMock.flush();
    await sleep(1);
    expect(xhrMock.getLockedXHR().length).to.equal(2); // init segments
    await xhrMock.flush();
    await sleep(1);
    expect(xhrMock.getLockedXHR().length).to.equal(2); // first two segments
    await xhrMock.flush(); // first two segments
    await sleep(1);
    expect(xhrMock.getLockedXHR().length).to.equal(0); // nada
    expect(player.getVideoLoadedTime()).to.be.above(4);
    expect(player.getVideoLoadedTime()).to.be.below(5);
  });

  it("should download more than the first segment when wanted buffer ahead is over the first segment duration", async function () {
    xhrMock.lock();
    player.setWantedBufferAhead(20);
    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
    });

    await sleep(1);
    expect(xhrMock.getLockedXHR().length).to.equal(1); // Manifest
    await xhrMock.flush();
    await sleep(1);
    expect(xhrMock.getLockedXHR().length).to.equal(2); // init segments
    await xhrMock.flush();
    await sleep(1);
    expect(xhrMock.getLockedXHR().length).to.equal(2); // first two segments
    await xhrMock.flush(); // first two segments
    await sleep(1);
    expect(xhrMock.getLockedXHR().length).to.equal(2); // still
    await xhrMock.flush();
    await sleep(1);
    expect(player.getVideoLoadedTime()).to.be.above(7);
    expect(player.getVideoLoadedTime()).to.be.below(9);
  });

  it("should continue downloading when seek to wanter buffer ahead", async function() {
    player.setWantedBufferAhead(2);
    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
    });
    await waitForLoadedStateAfterLoadVideo(player);
    await sleep(100);
    const videoLoadedTime = player.getVideoLoadedTime();
    player.seekTo(videoLoadedTime);
    await sleep(100);
    expect(player.getVideoLoadedTime()).to.be.above(videoLoadedTime);
    player.play();
    await sleep(100);
    expect(player.getPlayerState()).to.equal("PLAYING");
  });

  it("should respect a set max buffer ahead", async function() {
    player.setWantedBufferAhead(5);
    player.setMaxBufferAhead(10);
    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
    });
    await waitForLoadedStateAfterLoadVideo(player);
    await sleep(40);
    player.seekTo(10);
    await sleep(40);
    player.seekTo(0);
    await sleep(40);

    // The real limit is actually closer to the duration of a segment
    expect(Math.round(player.getVideoLoadedTime())).to.be.below(13);
  });

  it("should delete buffer behind", async function() {
    player.setMaxBufferAhead(30);
    player.setMaxBufferBehind(2);

    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
    });
    await waitForLoadedStateAfterLoadVideo(player);
    await sleep(200);

    player.seekTo(6);
    await sleep(100);

    expect(Math.round(player.getVideoElement().buffered.start(0))).to.equal(4);
  });

  xit("should be in SEEKING state when seeking to a buffered part when playing", async function() {
    player.setWantedBufferAhead(30);
    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
    });
    await waitForLoadedStateAfterLoadVideo(player);
    player.play();
    await sleep(100);
    expect(player.getPlayerState()).to.equal("PLAYING");
    expect(player.getVideoBufferGap()).to.be.above(10);

    player.seekTo(10);
    await waitForState(player, "SEEKING", ["PLAYING"]);
    expect(player.getVideoBufferGap()).to.be.above(10);
    await sleep(100);
    expect(player.getVideoBufferGap()).to.be.above(10);
    expect(player.getPlayerState()).to.equal("PLAYING");
  });

  it("should be in SEEKING state when seeking to a non-buffered part when playing", async function() {

    player.setWantedBufferAhead(4);
    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
    });
    await waitForLoadedStateAfterLoadVideo(player);
    player.play();
    await sleep(100);
    expect(player.getPlayerState()).to.equal("PLAYING");

    xhrMock.lock();

    player.seekTo(10);
    await waitForState(player, "SEEKING", ["PLAYING"]);
    expect(player.getVideoBufferGap()).to.equal(Infinity);

    await sleep(100);
    expect(player.getPlayerState()).to.equal("SEEKING");
    expect(player.getVideoBufferGap()).to.equal(Infinity);

    await xhrMock.flush();
    await sleep(100);
    expect(player.getVideoBufferGap()).to.be.above(1);
    expect(player.getVideoBufferGap()).to.be.below(10);
    expect(player.getPlayerState()).to.equal("PLAYING");
  });
});
