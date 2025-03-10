# Player Options ###############################################################

## Table of Contents ###########################################################

  - [Overview](#overview)
  - [Properties](#prop)
    - [videoElement](#prop-videoElement)
    - [initialVideoBitrate](#prop-initialVideoBitrate)
    - [initialAudioBitrate](#prop-initialAudioBitrate)
    - [maxVideoBitrate](#prop-maxVideoBitrate)
    - [maxAudioBitrate](#prop-maxAudioBitrate)
    - [wantedBufferAhead](#prop-wantedBufferAhead)
    - [preferredAudioTracks](#prop-preferredAudioTracks)
    - [preferredTextTracks](#prop-preferredTextTracks)
    - [maxBufferAhead](#prop-maxBufferAhead)
    - [maxBufferBehind](#prop-maxBufferBehind)
    - [limitVideoWidth](#prop-limitVideoWidth)
    - [throttleVideoBitrateWhenHidden](#prop-throttleVideoBitrateWhenHidden)
    - [stopAtEnd](#prop-stopAtEnd)
    - [throttleWhenHidden (deprecated)](#prop-throttleWhenHidden)



<a name="overview"></a>
## Overview ####################################################################

Player options are options given to the player on instantiation. It's an object
with multiple properties.

None of them are mandatory. For most usecase though, you might want to set at
least the associated video element via the ``videoElement`` property.



<a name="prop"></a>
## Properties ##################################################################

<a name="prop-videoElement"></a>
### videoElement ###############################################################

_type_: ``HTMLMediaElement|undefined``

The video element the player will use.

```js
// Instantiate the player with the first video element in the DOM
const player = new Player({
  videoElement: document.getElementsByTagName("VIDEO")[0]
});
```

If not defined, a new video element will be created without being inserted in
the document, you will have to do it yourself through the ``getVideoElement``
method:
```js
const player = new Player();

const videoElement = player.getVideoElement();
document.appendChild(videoElement);
```


<a name="prop-initialVideoBitrate"></a>
### initialVideoBitrate ########################################################

_type_: ``Number|undefined``

_defaults_: ``0``

This is a ceil value for the initial video bitrate chosen.

That is, the first video [Representation](../terms.md#representation) chosen
will be:

  - inferior to this value.

  - the closest available to this value (after filtering out the other,
    superior, ones)


If no Representation is found to respect those rules, the Representation with
the lowest bitrate will be chosen instead. Thus, the default value - ``0`` -
will lead to the lowest bitrate being chosen at first.

```js
// Begin either by the video bitrate just below or equal to 700000 bps if found
// or the lowest bitrate available if not.
const player = new Player({
  initialVideoBitrate: 700000
});
```

---

:warning: This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./loadVideo_options.md#prop-transport)).

---


<a name="prop-initialAudioBitrate"></a>
### initialAudioBitrate ########################################################

_type_: ``Number|undefined``

_defaults_: ``0``

This is a ceil value for the initial audio bitrate chosen.

That is, the first audio [Representation](../terms.md#representation) chosen
will be:

  - inferior to this value.

  - the closest available to this value (after filtering out the other,
    superior, ones)


If no Representation is found to respect those rules, the Representation with
the lowest bitrate will be chosen instead. Thus, the default value - ``0`` -
will lead to the lowest bitrate being chosen at first.

```js
// Begin either by the audio bitrate just below or equal to 5000 bps if found
// or the lowest bitrate available if not.
const player = new Player({
  initialAudioBitrate: 5000
});
```

---

:warning: This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./loadVideo_options.md#prop-transport)).

---


<a name="prop-maxVideoBitrate"></a>
### maxVideoBitrate ############################################################

_type_: ``Number|undefined``

_defaults_: ``Infinity``

The maximum video bitrate reachable through adaptive streaming. The player will
never automatically switch to a video
[Representation](../terms.md#representation) with a higher bitrate.

```js
// limit automatic adaptive streaming for the video track to up to 1 Mb/s
const player = new Player({
  maxVideoBitrate: 1e6
});
```

You can update this limit at any moment with the ``setMaxVideoBitrate`` API
call.

This limit can be removed by setting it to ``Infinity`` (which is the default
value).

---

:warning: This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./loadVideo_options.md#prop-transport)).

---


<a name="prop-maxAudioBitrate"></a>
### maxAudioBitrate ############################################################

_type_: ``Number|undefined``

_defaults_: ``Infinity``

The maximum audio bitrate reachable through adaptive streaming. The player will
never automatically switch to an audio
[Representation](../terms.md#representation) with a higher bitrate.

```js
// limit automatic adaptive streaming for the audio track to up to 100 kb/s
const player = new Player({
  maxAudioBitrate: 1e5
});
```

You can update this limit at any moment with the ``setMaxAudioBitrate`` API
call.

This limit can be removed by setting it to ``Infinity`` (which is the default
value).

---

:warning: This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./loadVideo_options.md#prop-transport)).

---


<a name="prop-wantedBufferAhead"></a>
### wantedBufferAhead ##########################################################

_type_: ``Number|undefined``

_defaults_: ``30``

Set the default buffering goal, as a duration ahead of the current position, in
seconds.

Once this size of buffer is reached, the player won't try to download new video
segments anymore.

---

:warning: This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./loadVideo_options.md#prop-transport)).

---


<a name="prop-preferredAudioTracks"></a>
### preferredAudioTracks #######################################################

_type_: ``Array.<Object>``

_defaults_: ``[]``

Set the initial audio tracks preferences.

This option takes an array of objects describing the languages wanted:
```js
{
  language: "fra", // {string} The wanted language
                   // (ISO 639-1, ISO 639-2 or ISO 639-3 language code)
  audioDescription: false // {Boolean} Whether the audio track should be an
                          // audio description for the visually impaired
}
```

All elements in that Array should be set in preference order: from the most
preferred to the least preferred.

When loading a content, the RxPlayer will then try to choose its audio track by
comparing what is available with your current preferences (i.e. if the most
preferred is not available, it will look if the second one etc.).

This array of preferrences can be updated at any time through the
``setPreferredAudioTracks`` method, documented
[here](./index.md#meth-getPreferredAudioTracks).

#### Example

Let's imagine that you prefer to have french or italian over all other audio
languages. If not found, you want to fallback to english:

```js
const player = new RxPlayer({
  preferredAudioTracks: [
    { language: "fra", audioDescription: false },
    { language: "ita", audioDescription: false },
    { language: "eng", audioDescription: false }
  ]
});
```

---

:warning: This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./loadVideo_options.md#prop-transport)).

---


<a name="prop-preferredTextTracks"></a>
### preferredTextTracks ########################################################

_type_: ``Array.<Object>``

_defaults_: ``[]``

Set the initial text track languages preferences.

This option takes an array of objects describing the languages wanted for
subtitles:
```js
{
  language: "fra", // {string} The wanted language
                   // (ISO 639-1, ISO 639-2 or ISO 639-3 language code)
  closedCaption: false // {Boolean} Whether the text track should be a closed
                       // caption for the hard of hearing
}
```

All elements in that Array should be set in preference order: from the most
preferred to the least preferred. You can set `null` for no subtitles.

When loading a content, the RxPlayer will then try to choose its text track by
comparing what is available with your current preferences (i.e. if the most
preferred is not available, it will look if the second one etc.).

This array of preferrences can be updated at any time through the
``setPreferredTextTracks`` method, documented
[here](./index.md#meth-getPreferredTextTracks).

#### Example

Let's imagine that you prefer to have french or italian subtitles.If not found,
you want no subtitles at all.

```js
const player = new RxPlayer({
  preferredTextTracks: [
    { language: "fra", closedCaption: false },
    { language: "ita", closedCaption: false },
    null
  ]
});
```

---

:warning: This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./loadVideo_options.md#prop-transport)).

---


<a name="prop-maxBufferAhead"></a>
### maxBufferAhead #############################################################

_type_: ``Number|undefined``

_defaults_: ``Infinity``

Set the default maximum kept buffer ahead of the current position, in seconds.
Everything superior to that limit (``currentPosition + maxBufferAhead``) will be
automatically garbage collected. This feature is not necessary as
the browser is already supposed to deallocate memory from old segments if/when
the memory is scarce.

However on some custom targets, or just to better control the memory imprint of
the player, you might want to set this limit. You can set it to ``Infinity`` to
remove any limit and just let the browser do this job.

---

:warning: This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./loadVideo_options.md#prop-transport)).

---


<a name="prop-maxBufferBehind"></a>
### maxBufferBehind ############################################################

_type_: ``Number|undefined``

_defaults_: ``Infinity``

Set the default maximum kept past buffer, in seconds.
Everything before that limit (``currentPosition - maxBufferBehind``) will be
automatically garbage collected.

This feature is not necessary as the browser is already supposed to deallocate
memory from old segments if/when the memory is scarce.

However on some custom targets, or just to better control the memory imprint of
the player, you might want to set this limit. You can set it to ``Infinity`` to
remove any limit and just let the browser do this job.

---

:warning: This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./loadVideo_options.md#prop-transport)).

---


<a name="prop-limitVideoWidth"></a>
### limitVideoWidth ############################################################

_type_: ``Boolean``

_defaults_: ``false``

With this feature, the possible video
[Representations](../terms.md#representation) considered are filtered by width:

The maximum width considered is the closest superior or equal to the video
element's width.

This is done because the other, "superior" Representations will not have any
difference in terms of pixels (as in most case, the display limits the maximum
resolution displayable). It thus save bandwidth with no visible difference.

To activate this feature, set it to ``true``.
```js
const player = Player({
  limitVideoWidth: true
});
```

For some reasons (displaying directly a good quality when switching to
fullscreen, specific environments), you might not want to activate this limit.

---

:warning: This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./loadVideo_options.md#prop-transport)).

---


<a name="prop-throttleVideoBitrateWhenHidden"></a>
### throttleVideoBitrateWhenHidden #############################################

_type_: ``Boolean``

_defaults_: ``false``

The player has a specific feature which throttle the video to the minimum
bitrate when the current video element is considered hidden (e.g. the containing
page is hidden and the Picture-In-Picture mode is disabled) for more than a
minute.

To activate this feature, set it to ``true``.
```js
const player = Player({
  throttleVideoBitrateWhenHidden: true
});
```

---

:warning: This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./loadVideo_options.md#prop-transport)).

---


<a name="prop-stopAtEnd"></a>
### stopAtEnd ##################################################################

_type_: ``Boolean``

_defaults_: ``true``

By default, the player automatically _unload_ the content once it reaches its
end (the player goes to the ``"ENDED"`` state).

In that case, the only way to play the content again is to (re-)call the
``loadVideo`` API, which will trigger another download of the
[Manifest](../terms.md#manifest) and segments.

If you want to be able to seek back in the content after it ended, you may want
to deactivate this behavior. To do so, set ``stopAtEnd`` to ``false``.

```js
const player = Player({
  stopAtEnd: false
});
```


<a name="prop-throttleWhenHidden"></a>
### throttleWhenHidden #########################################################

---

:warning: This option is deprecated, it will disappear in the next major release
``v4.0.0`` (see [Deprecated APIs](./deprecated.md)).

---

_type_: ``Boolean``

_defaults_: ``false``

The player has a specific feature which throttle the video to the minimum
bitrate when the current page is hidden for more than a minute.

To activate this feature, set it to ``true``.
```js
const player = Player({
  throttleWhenHidden: true
});
```

---

:warning: This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./loadVideo_options.md#prop-transport)).

---
