import React from "react";

/**
 * React Component which Displays an Image tip centered and on top of the
 * position wanted.
 *
 * Takes 3 props:
 *   - {Blob|string} Image - The image blob to display
 *   - {string} [className=""] - An optional className for the image
 *   - {Number} xPosition - The position on the horizontal axis where you
 *     want the image to be centered to.
 *
 * @class ImageTip
 */
class VideoThumbnailTip extends React.Component {
  constructor(...args) {
    super(...args);

    this.adaptation = this.props.adaptation;
    this.imageTime = Math.floor(this.props.imageTime);
    this.imageLoader = null;
    this.positionIsCorrected = false;
    this.state = {
      style: {},
    };
  }

  // setImage(time) {
  //   imageLoader.setTime(time);
  // }

  correctImagePosition() {
    if (this.positionIsCorrected) {
      return;
    }
    const { xPosition } = this.props;

    if (isNaN(+xPosition) || !this.element) {
      return null;
    }

    const style = {
      transform: `translate(${xPosition}px, -136px)`,
    };

    this.positionIsCorrected = true;
    this.setState({ style });
  }

  componentWillReceiveProps(nextProps) {
    this.positionIsCorrected = false;
    const { imageTime } = nextProps;
    const flooredImageTime = Math.round(imageTime);
    if (this.imageLoader) {
      this.imageLoader.setTime(flooredImageTime);
      this.imageTime = flooredImageTime;
    }
  }

  componentDidMount() {
    this.correctImagePosition();
  }

  componentWillUnmount() {
    if (this.imageLoader) {
      this.imageLoader.dispose().then(() => {
        console.log("!!! disposed");
      });
    }
  }

  componentDidUpdate() {
    this.correctImagePosition();
  }

  render() {
    const { style } = this.state;

    const videoElement = <video
      ref={el => {
        if (!this.imageLoader) {
          this.imageLoader = new window.VideoThumbnailLoader(el, this.adaptation, false);
        }
        this.imageLoader.setTime(this.imageTime).then((time) => {
          console.log("!!! Setted time",time);
        });
      }}
    ></video>

    const divToDisplay = <div
        className="image-tip-wrapper"
        style={style}
        ref={el => this.element = el}
      >
        { videoElement }
      </div>;

    return (
      divToDisplay
    );
  }
}

export default VideoThumbnailTip;
