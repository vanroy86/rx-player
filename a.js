function clearElementSrc(element) {
  element.src = "";
  element.removeAttribute("src");
}

function resetMediaSource(mediaElement, mediaSource, mediaSourceURL) {
  if (mediaSource && mediaSource.readyState !== "closed") {
    const { readyState, sourceBuffers } = mediaSource;
    for (let i = sourceBuffers.length - 1; i >= 0; i--) {
      const sourceBuffer = sourceBuffers[i];
      try {
        if (readyState === "open") {
          sourceBuffer.abort();
        }

        mediaSource.removeSourceBuffer(sourceBuffer);
      }
      catch (e) {
        console.log("Error while disposing SourceBuffer", e);
      }
    }
    if (sourceBuffers.length) {
      console.log("Not all SourceBuffers could have been removed.");
    }
  }

  clearElementSrc(mediaElement);

  if (mediaSourceURL) {
    try {
      URL.revokeObjectURL(mediaSourceURL);
    } catch (e) {
      console.log("Error while revoking the media source URL", e);
    }
  }
}

function createMediaSource(mediaElement) {
  resetMediaSource(mediaElement, null, mediaElement.src || null);
  const mediaSource = new MediaSource();
  const objectURL = URL.createObjectURL(mediaSource);
  mediaElement.src = objectURL;
  return mediaSource;
}

window.startTest = function startTest(_s, _e) {
var _videoElement = document.getElementsByTagName("video")[0];
var _mediaSource = createMediaSource(_videoElement);
var _isOnError = false;

var hasLoadedVideo = true;
var hasLoadedAudio = true;

_mediaSource.onsourceopen = () => {
  const _sourceBuffers = {
    video: _mediaSource.addSourceBuffer("video/mp4;codecs=\"avc1.64001F"),
    // audio: _mediaSource.addSourceBuffer("audio/mp4;codecs=\"mp4a.40.2"),
  }

  function videoOnError(err) {
    _isOnError = true;
    console.log("!!!! ERROR !!!!", err);
  }

  function audioOnError(err) {
    _isOnError = true;
    console.log("!!!! ERROR !!!!", err);
  }

  _sourceBuffers.video.addEventListener("error", videoOnError);
  // _sourceBuffers.audio.addEventListener("error", audioOnError);

  function appendBuffer(_sourceBuffers, data, type) {
    if (_sourceBuffers[type].updating) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(appendBuffer(_sourceBuffers, data, type));
        }, 200);
      })
    }
    _sourceBuffers[type].appendBuffer(data);
    return Promise.resolve();
  }

    const videoSegmentCache = window.SEGMENT_CACHE.video;
    try {
      if (videoSegmentCache && videoSegmentCache.length > 0) {
        const firstInitVideoSegment = videoSegmentCache[0].initSegment;
        const videoSegmentsToPush = videoSegmentCache.map(({ segment, initSegment }) => {
          return segment || initSegment;
        }).slice(_s, _e);
  
        function appendAllVideo() {
          const segment = videoSegmentsToPush.shift();
          if (!_isOnError) {
            if (segment) {
              appendBuffer(_sourceBuffers, segment, "video").then(() => {
                console.log("!!! PUSHED VIDEO SEGMENT", segment);
                appendAllVideo();
              });
            } else {
              console.log("!!! Pushed all video elements");
              _sourceBuffers.video.removeEventListener("error", videoOnError);
              hasLoadedVideo = true;
              if (hasLoadedAudio && hasLoadedVideo) {
                const start = _videoElement.buffered.start(0);
                _videoElement.currentTime = start;
                _videoElement.play().catch((err) => {
                  console.log("!!!! ERROR !!!!", err.message || err);
                });
              }
            }
          } else {
            _sourceBuffers.video.removeEventListener("error", videoOnError);
          }
        }
    
        appendBuffer(_sourceBuffers, firstInitVideoSegment, "video").then(() => {
          console.log("!!! PUSHED INIT VIDEO SEGMENT", firstInitVideoSegment);
          appendAllVideo();
        });
      }
    } catch(err) {
      console.log("!!! FUCK VIDEO: ", err);
    }
  
    // const audioSegmentCache = window.SEGMENT_CACHE.audio;
    // try {
    //   if (audioSegmentCache && audioSegmentCache.length > 0) {
    //     const firstInitAudioSegment = audioSegmentCache[0].initSegment;
    //     const audioSegmentsToPush = audioSegmentCache.map(({ segment, initSegment }) => {
    //       return segment || initSegment;
    //     }).slice(_s, _e);
  
    //     function appendAllAudio() {
    //       const segment = audioSegmentsToPush.shift();
    //       if (!_isOnError) {
    //         if (segment) {
    //           appendBuffer(_sourceBuffers, segment, "audio").then(() => {
    //             console.log("!!! PUSHED AUDIO SEGMENT", segment);
    //             appendAllAudio();
    //           });
    //         } else {
    //           console.log("!!! Pushed all audio elements");
    //           _sourceBuffers.audio.removeEventListener("error", audioOnError);
    //           hasLoadedAudio = true;
    //           if (hasLoadedAudio && hasLoadedVideo) {
    //             const start = _videoElement.buffered.start(0);
    //             _videoElement.currentTime = start;
    //             _videoElement.play().catch((err) => {
    //               console.log("!!!! ERROR !!!!", err.message || err);
    //             });
    //           }
    //         }
    //       } else {
    //         _sourceBuffers.audio.removeEventListener("error", audioOnError);
    //       }
    //     }
    
    //     appendBuffer(_sourceBuffers, firstInitAudioSegment, "audio").then(() => {
    //       console.log("!!! PUSHED INIT AUDIO SEGMENT", firstInitAudioSegment);
    //       appendAllAudio();
    //     });
    //   }
    // } catch(err) {
    //   console.log("!!! FUCK AUDIO: ", err);
    // }
  }
}
