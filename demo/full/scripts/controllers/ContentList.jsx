import React from "react";
import parseDRMConfigurations from "../lib/parseDRMConfigurations.js";
import Button from "../components/Button.jsx";
import TextInput from "../components/Input.jsx";
import Select from "../components/Select.jsx";
import contentsDatabase from "../contents.js";

const MediaKeys_ =
  window.MediaKeys ||
  window.MozMediaKeys ||
  window.WebKitMediaKeys ||
  window.MSMediaKeys ||
  null;

const HAS_EME_APIs = (
  typeof navigator.requestMediaKeySystemAccess === "function" ||
  (
    MediaKeys_ != null &&
    MediaKeys_.prototype &&
    typeof MediaKeys_.isTypeSupported === "function"
  ) ||
  typeof HTMLVideoElement.prototype.webkitGenerateKeyRequest === "function"
);

const IS_HTTPS = window.location.protocol.startsWith("https");
const TRANSPORT_TYPES = ["DASH", "Smooth", "DirectFile"];
const DRM_TYPES = ["Widevine", "Playready", "Clearkey"];

const URL_DENOMINATIONS = {
  DASH: "URL to the MPD",
  Smooth: "URL to the Manifest",
  DirectFile: "URL to the content",
};

const CONTENTS_PER_TYPE = TRANSPORT_TYPES.reduce((acc, tech) => {
  acc[tech] = contentsDatabase
    .filter(({ transport }) =>
      transport === tech.toLowerCase()
    ).map((content) => {
      let name = content.name;
      let disabled = false;

      if (IS_HTTPS) {
        if (content.url.startsWith("http:")) {
          name = "[HTTP only] " + name;
          disabled = true;
        }
      } else if (!HAS_EME_APIs && content.drmInfos && content.drmInfos.length) {
        name = "[HTTPS only] " + name;
        disabled = true;
      }

      if (content.live) {
        name += " (live)";
      }

      return { content, name, disabled };
    });
  return acc;
}, {});

Object.keys(CONTENTS_PER_TYPE).forEach((key) => {
  CONTENTS_PER_TYPE[key].push({ name: "Custom link", disabled: false });
});

class ContentList extends React.Component {
  constructor(...args) {
    super(...args);

    const contents = CONTENTS_PER_TYPE[TRANSPORT_TYPES[0]];
    const firstEnabledContentIndex =
      contents.findIndex((content) => !content.disabled);

    this.state = {
      transportType: TRANSPORT_TYPES[0],
      contentChoiceIndex: firstEnabledContentIndex,
      hasTextInput: CONTENTS_PER_TYPE[TRANSPORT_TYPES[0]].length - 1 ===
        firstEnabledContentIndex,
      displayDRMSettings: false,
      manifestUrl: "",
      drm: DRM_TYPES[0],
      autoPlay: true,
      htmlTextTrackMode: true,
      showOptions: false,
      wantedBufferAhead: 30,
    };
  }

  loadContent(content) {
    const { loadVideo, stopVideo } = this.props;
    const {
      autoPlay,
      htmlTextTrackMode,
      wantedBufferAhead,
    } = this.state;
    if (content == null) {
      stopVideo();
      return;
    }

    const {
      url,
      transport,
      supplementaryImageTracks,
      supplementaryTextTracks,
      drmInfos = [],
    } = content;

    parseDRMConfigurations(drmInfos)
      .then((keySystems) => {
        loadVideo({
          url,
          transport,
          autoPlay,
          textTrackMode: htmlTextTrackMode ? "html" : "native",
          wantedBufferAhead,
          supplementaryImageTracks,
          supplementaryTextTracks,
          keySystems,
        });
      });
  }


  loadUrl(url, drmInfos, autoPlay) {
    const { loadVideo } = this.props;
    parseDRMConfigurations(drmInfos)
      .then((keySystems) => {
        loadVideo({
          url,
          transport: this.state.transportType.toLowerCase(),
          autoPlay,

          // native browser subtitles engine (VTTCue) doesn"t render stylized
          // subs.  We force HTML textTrackMode to vizualise styles.
          textTrackMode: "html",
          keySystems,
        });
      });
  }

  changeTransportType(transportType) {
    const contents = CONTENTS_PER_TYPE[transportType];
    const firstEnabledContentIndex =
      contents.findIndex((content) => !content.disabled);
    this.setState({
      transportType,
      contentChoiceIndex: firstEnabledContentIndex,
      hasTextInput: CONTENTS_PER_TYPE[transportType].length - 1 ===
        firstEnabledContentIndex,
    });
  }

  changeContentIndex(index) {
    const { transportType } = this.state;
    const hasTextInput = CONTENTS_PER_TYPE[transportType].length - 1 === index;

    this.setState({
      contentChoiceIndex: index,
      hasTextInput,
    });
  }

  onDisplayDRMSettings(evt) {
    const { target } = evt;
    const value = target.type === "checkbox" ?
      target.checked : target.value;
    this.setState({
      displayDRMSettings: value,
    });
  }

  onAutoPlayClick(evt) {
    const { target } = evt;
    const value = target.type === "checkbox" ?
      target.checked : target.value;
    this.setState({ autoPlay: value });
  }

  render() {
    const {
      autoPlay,
      contentChoiceIndex,
      displayDRMSettings,
      drm,
      hasTextInput,
      htmlTextTrackMode,
      licenseServerUrl,
      manifestUrl,
      serverCertificateUrl,
      showOptions,
      transportType,
      wantedBufferAhead,
    } = this.state;
    const contentsToSelect = CONTENTS_PER_TYPE[transportType];

    const onTechChange = (evt) => {
      const index = +evt.target.value;
      if (index >= 0) {
        this.changeTransportType(TRANSPORT_TYPES[index]);
      }
    };

    const onContentChange = (evt) => {
      const index = +evt.target.value;
      this.changeContentIndex(index);
    };

    const onClickLoad = () => {
      if (contentChoiceIndex === contentsToSelect.length - 1) {
        const drmInfos = [{
          licenseServerUrl,
          serverCertificateUrl,
          drm,
        }];
        this.loadUrl(manifestUrl, drmInfos, autoPlay);
      } else {
        this.loadContent(contentsToSelect[contentChoiceIndex].content);
      }
    };

    const onManifestInput = (evt) =>
      this.setState({ manifestUrl: evt.target.value });

    const onLicenseServerInput = (evt) =>
      this.setState({ licenseServerUrl: evt.target.value });

    const onServerCertificateInput = (evt) =>
      this.setState({ serverCertificateUrl: evt.target.value });

    const onDisplayDRMSettings = (evt) =>
      this.setState({ serverCertificateUrl: evt.target.value });

    const onDRMTypeClick = (type) => {
      this.setState({ drm: type });
    };

    const onClickOptions = () => {
      this.setState({ showOptions: !showOptions });
    };

    const onAutoPlayClick = (evt) => {
      this.onAutoPlayClick(evt);
    };

    const onTextTrackModeChange = evt => {
      const index = +evt.target.value;
      if (index >= 0) {
        this.setState({ htmltexttrackmode: index === 0 });
      }
    };

    const WANTED_BUFFER_AHEADS = [10, 20, 30, 60, 120];
    const onWantedBufferAheadChange = evt => {
      const index = +evt.target.value;
      if (index >= 0) {
        this.setState({ wantedBufferAhead: WANTED_BUFFER_AHEADS[index] });
      }
    };

    const shouldDisableEncryptedContent = !HAS_EME_APIs && !IS_HTTPS;

    const generateDRMButtons = () => {
      return DRM_TYPES.map(type =>
        <Button
          className={"choice-input-button drm-button" +
            (drm === type ? " selected" : "")}
          onClick={() => onDRMTypeClick(type)}
          value={type}
        />);
    };

    const optionsButtonClassName = "TODO";
    const optionPanelClassName = "TODO";

    return (
      <div className="choice-inputs-wrapper">
        <div className="content-inputs">
          <div className="content-inputs-selects">
            <Select
              className="choice-input transport-type-choice white-select"
              onChange={onTechChange}
              options={TRANSPORT_TYPES}
            />
            <Select
              className="choice-input content-choice white-select"
              onChange={onContentChange}
              options={contentsToSelect}
              selected={contentChoiceIndex}
            />
          </div>
          <div className="choice-input-button-wrapper">
            <Button
              className={optionsButtonClassName}
              onClick={onClickOptions}
              value="Options"
            />
            <Button
              className="choice-input-button load-button"
              onClick={onClickLoad}
              value={String.fromCharCode(0xf144)}
            />
          </div>
        </div>
        {
          hasTextInput ?
            (
              <div className="custom-input-wrapper">
                <TextInput
                  className="text-input"
                  onChange={onManifestInput}
                  value={manifestUrl}
                  placeholder={
                    (
                      URL_DENOMINATIONS[transportType] ||
                      `URL to the ${transportType} content`
                    ) + (IS_HTTPS ? " (HTTPS only if mixed contents disabled)" : "")
                  }
                />
                <div className="player-box">
                  <span className={"encryption-checkbox" + (shouldDisableEncryptedContent ? " disabled" : "")}>
                    {(shouldDisableEncryptedContent ? "[HTTPS only] " : "") + "Encrypted content"}
                    <label class="switch">
                      <input
                        disabled={shouldDisableEncryptedContent}
                        name="displayDRMSettingsTextInput"
                        type="checkbox"
                        checked={displayDRMSettings}
                        onChange={onDisplayDRMSettings}
                      />
                      <span class="slider round"></span>
                    </label>
                  </span>
                  {
                    displayDRMSettings ?
                      <div className="drm-settings">
                        <div className="drm-choice">
                          {generateDRMButtons()}
                        </div>
                        <div>
                          <Select
                            className="choice-input white-select"
                            onChange={onDRMTypeClick}
                            options={DRM_TYPES}
                          />
                          <TextInput
                            className="choice-input text-input"
                            onChange={onLicenseServerInput}
                            value={licenseServerUrl}
                            placeholder={"License server URL"}
                          />
                        </div>
                        <TextInput
                          className="choice-input text-input"
                          onChange={onServerCertificateInput}
                          value={serverCertificateUrl}
                          placeholder={"Server certificate URL (optional)"}
                        />
                      </div> :
                      null
                  }
                </div>
              </div>
            ) : null
        }
        {
          showOptions ?
            <div class={optionPanelClassName}>
              <tr>
                <td>Auto Play</td>
                <td>
                  <OptionPanelCheckBox
                    checked={autoPlay}
                    onChange={onAutoPlayClick} />
                </td>
              </tr>
              <tr>
                <td>Text track mode</td>
                <td>
                  <OptionPanelSelect
                    onChange={onTextTrackModeChange}
                    options={["HTML", "native"]}
                    selected={htmlTextTrackMode ? 0 : 1} />
                </td>
              </tr>
              <tr>
                <td>Wanted buffer</td>
                <td>
                  <OptionPanelSelect
                    options={WANTED_BUFFER_AHEADS}
                    onChange={onWantedBufferAheadChange}
                    selected={
                      Math.max(
                        WANTED_BUFFER_AHEADS.indexOf(wantedBufferAhead),
                        0)
                    } />
                </td>
              </tr>
              <tr>
                <td>Manual bitrate switch</td>
                <td>
                  <OptionPanelSelect
                    options={["direct", "smooth"]}
                    selected={"direct"}
                  />
                </td>
              </tr>
              <tr>
                <td>Manifest retry</td>
                <td>
                  <OptionPanelSelect
                    options={["Infinity", "0", "1", "2", "3", "4"]}
                    selected={"Infinity"}
                  />
                </td>
              </tr>
              <tr>
                <td>Segment retry</td>
                <td>
                  <OptionPanelSelect
                    options={["Infinity", "0", "1", "2", "3", "4"]}
                    selected={"Infinity"}
                  />
                </td>
              </tr>
            </div> : null
        }
      </div>
    );
  }
}

function OptionPanelCheckBox({ checked, onChange }) {
  return (
    <label class="input switch">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span class="slider round"></span>
    </label>
  );
}

function OptionPanelSelect({ options, selected, onChange }) {
  return (
    <label class="input select">
      <Select
        className="white-select"
        onChange={onChange}
        options={options}
        selected={selected}
      />
    </label>
  );
}

export default ContentList;
