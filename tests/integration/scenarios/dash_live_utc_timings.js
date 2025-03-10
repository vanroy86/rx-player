import { expect } from "chai";
import RxPlayer from "../../../src";
import {
  WithDirect,
  WithDirectAndHTTP,
  WithHTTP,
  WithoutTimings,
} from "../../contents/DASH_dynamic_UTCTimings";
import sleep from "../../utils/sleep.js";
import XHRMock from "../../utils/request_mock";

describe("DASH live - UTCTimings", () => {
  describe("DASH live content (SegmentTemplate + Direct UTCTiming)", function () {
    const { manifestInfos } = WithDirect;
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

    it("should calculate the right bounds", async () => {
      xhrMock.lock();

      player.loadVideo({
        url: manifestInfos.url,
        transport:manifestInfos.transport,
      });

      await sleep(1);
      await xhrMock.flush();
      await sleep(1);
      expect(player.getMinimumPosition()).to.be
        .closeTo(1553517851, 1);
      expect(player.getMaximumPosition()).to.be
        .closeTo(1553518148, 1);
    });
  });

  describe("DASH live content (SegmentTemplate + HTTP UTCTiming)", function () {
    const { manifestInfos } = WithHTTP;
    let player;
    let xhrMock;
    const requests = [];

    beforeEach(() => {
      player = new RxPlayer();
      xhrMock = new XHRMock();
    });

    afterEach(() => {
      requests.length = 0;
      player.dispose();
      xhrMock.restore();
    });

    it("should fetch the clock and then calculate the right bounds", async () => {
      // const url = URL.createObjectURL(new Blob(["2019-03-25T12:49:08.014Z"]));
      xhrMock.respondTo("GET",
                        "https://time.akamai.com/?iso",
                        [ 200,
                          { "Content-Type": "text/plain"},
                          "2019-03-25T12:49:08.014Z"]);
      xhrMock.lock();

      player.loadVideo({
        url: manifestInfos.url,
        transport:manifestInfos.transport,
      });

      await sleep(1);
      await xhrMock.flush(); // Manifest request
      await sleep(1);
      await xhrMock.flush(); // time request
      await sleep(1);
      await xhrMock.flush(); // Once for the init segment
      await sleep(1);
      expect(player.getMinimumPosition()).to.be
        .closeTo(1553517851, 1);
    });
  });

  describe("DASH live content (SegmentTemplate + Without Timing)", function() {
    const { manifestInfos } = WithoutTimings;
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

    it("should calculate the right bounds", async () => {
      xhrMock.lock();

      player.loadVideo({
        url: manifestInfos.url,
        transport:manifestInfos.transport,
      });

      await sleep(10);
      await xhrMock.flush();
      await sleep(10);

      const { availabilityStartTime } = player.getManifest();
      const timeShiftBufferDepth = (5 * 60) - 3;
      const maximumPosition = (Date.now() - 10000) / 1000 -
        availabilityStartTime;
      const minimumPosition = maximumPosition - timeShiftBufferDepth;

      expect(player.getMinimumPosition()).to.be
        .closeTo(minimumPosition, 1);
      expect(player.getMaximumPosition()).to.be
        .closeTo(maximumPosition, 1);
    });
  });

  describe("DASH live content (SegmentTemplate + Direct & HTTP UTCTiming)", function () {
    const { manifestInfos } = WithDirectAndHTTP;
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

    it("should not fetch the clock but still calculate the right bounds", async () => {
      xhrMock.lock();

      player.loadVideo({
        url: manifestInfos.url,
        transport:manifestInfos.transport,
      });

      await sleep(1);
      await xhrMock.flush();
      await sleep(1);
      expect(player.getMinimumPosition()).to.be
        .closeTo(1553517851, 1);

      const requestsDone = xhrMock.getLockedXHR().map(r => r.url);
      expect(requestsDone)
        .not.to.include("https://time.akamai.com/?iso");
    });
  });
});
