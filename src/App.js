import React, { useRef, useEffect } from 'react';  // React Dependencies
import "./App.css";
import * as tf from '@tensorflow/tfjs';
import Webcam from 'react-webcam';
import { isBrowser, BrowserView, MobileView } from 'react-device-detect';
import Babur from './images/babur.jpg';  // Image Dependencies
import MonaLisa from './images/mona-lisa.jpeg';
import Scream from './images/scream.jpeg';
import SquaresCircles from './images/squares-concentric-circles.jpg';
import Guernica from './images/guernica.jpg';
import StarryNight from './images/starry-night.jpeg';
import Twombly from './images/twombly.jpeg';
import Bricks from './images/bricks.jpg'
import Stripes from './images/stripes.jpg'
import Towers from './images/towers.jpg';
import LinkedInIcon from './/icons/linkedin.png';  // Icon Dependencies
import GitHubIcon from './/icons/github.png';
import ShuffleIcon from './icons/shuffle.png';
import UploadIcon from './icons/upload.png';
import LoadingIcon from './icons/dots.png';

tf.ENV.set('WEBGL_PACK', false);  // This needs to be done otherwise things run very slow v1.0.4

export default function App() {
  const webcamRef = useRef(null);
  var screenshot = null; // TODO: use state hooks
  var styleRepresentation = null;
  var predictionModel = null;
  var transferModel = null;
  var styleImage = null;
  const styleImages = [Guernica, SquaresCircles, Towers, MonaLisa, Twombly,
                       Bricks, Scream, Stripes, Babur, StarryNight];
  var shuffle_i = 0;
  var styleImageSource = styleImages[shuffle_i];

  // Fetch models froom Public folder
  const fetchModels = async () => {
    const t0 = performance.now();
    predictionModel = await tf.loadGraphModel(process.env.PUBLIC_URL + '/models//style-prediction/model.json');
    transferModel = await tf.loadGraphModel(process.env.PUBLIC_URL + '/models//style-transfer/model.json');
    const t1 = performance.now();
    console.log("Models loaded in " + (t1 - t0)/1000 + " seconds.");
  }

  // Wait for an elem to set url as its src, opacity for dimming center canvas (style-image-display)
  const loadImage = async (url, elem, opacity) => {  // TODO: async function loadImage(url, elem) {}?
    if (opacity) {
      document.getElementById("style-image-display").style.opacity = "0.2";  // Dim opacity to alert user of image loading
    }
    return new Promise((resolve, reject) => {
      if (opacity) {
        elem.onload = () => {
          console.log("Style image loaded");  // Executed once style image has been loaded
          generateStyleRepresentation();
          document.getElementById("style-image-display").style.opacity = "1";  // Back to full opacity once loaded
          resolve(elem);
        }
      } else {
        elem.onload = () => resolve(elem);
      }
      elem.onerror = reject;
      elem.src = url;
    });
  }

  // Initializes a style image and generates a style representation based off it
  const initStyleImage = async () => {
    document.getElementById("style-image-display").src = styleImageSource;  // For displaying uploaded image
    styleImage = new Image(300,300);
    await loadImage(styleImageSource, styleImage, true);  // wait for styleImage Image object to fully read styleImageSource

    // Draw dots on canvas to alert user of model loading
    const loadingImage = new Image(10,10);
    await (loadingImage.src = LoadingIcon);
    const canvas = document.getElementById('stylized-canvas');
    canvas.getContext('2d').drawImage(loadingImage, canvas.width / 3 - loadingImage.width / 3, canvas.height / 3 - loadingImage.height / 3);
  }

  // On file select (from the pop up)
  const uploadStyleImage = async event => {
    // Check if user actually selected a file to upload
    if (event.target.files[0] !== undefined) {
      // For generateStyleRepresentation()
      styleImageSource = URL.createObjectURL(event.target.files[0]);
      // Initialize uploaded style image
      await initStyleImage();
    }
  }

  // Capture a screenshot from webcam
  const capture = () => {
    screenshot = webcamRef.current.getScreenshot();
  };

  // Learn the style of a given image
  const generateStyleRepresentation = async () => {
    const t0 = performance.now();
    await tf.nextFrame();
    styleRepresentation = await tf.tidy(() => {
      const styleImageTensor = tf.browser.fromPixels(styleImage).toFloat().div(tf.scalar(255)).expandDims();
      return predictionModel.predict(styleImageTensor);  // For cleanliness
    });
    const t1 = performance.now();
    console.log("Generated style representation in " + (t1 - t0) + " milliseconds.");
  }

  // Generate and display stylized image
  const generateStylizedImage = async () => {
    // Use style representation to generate stylized tensor
    await tf.nextFrame();
    // Avoid feeding blank screenshot for model to predict
    if (screenshot != null) {
      const contentImage = new Image(300,225);
      await loadImage(screenshot, contentImage, false);  // wait for contentImage Image object to fully read screenshot from memory
      // Generated stylized image
      const stylized = await tf.tidy(() => {
          const contentImageTensor = tf.browser.fromPixels(contentImage).toFloat().div(tf.scalar(255)).expandDims();
          return transferModel.predict([contentImageTensor, styleRepresentation]).squeeze();  // For cleanliness
      });
      // Update canvas with new stylized image
      await tf.browser.toPixels(stylized, document.getElementById('stylized-canvas'));
    }
  }

  // Shuffle style images from given set
  const shuffle = async () => {
    if (shuffle_i < styleImages.length - 1) {
      shuffle_i += 1;
    } else {
      shuffle_i = 0;
    }
    styleImageSource = styleImages[shuffle_i];
    await initStyleImage();
  }

  // Main function
  const predict = async () => {
    // First wait for models and style image to load
    await fetchModels();
    await initStyleImage();  // also calls generateStyleRepresentation();

    var console_i = 0;  // only output generateStylizedImage logs 10 times
    setInterval(() => {
      // wait for webcam to load on screen
      if (webcamRef != null && document.hasFocus()) {
        // Loop and take and transfer screenshots of webcam input at intervals of 700 ms
        capture();
        // wait for tf to be ready then continously generate stylized images of screenshots
        tf.ready().then(() => {
          const t0 = performance.now();
          generateStylizedImage();
          const t1 = performance.now();
          if (console_i < 10) {
            console.log("Generated stylized image in " + (t1 - t0) + " milliseconds.");
          }
          console_i += 1;
        })
      }
    }, 400);
  };

  // React hook to run main function
  useEffect(() => {
    tf.ready().then(() => {
      // Check if device is a browser
      if (isBrowser) {
        predict();
      }
    });
  });

  return (
    <div>
      {/* App only availible on browser */}
      <BrowserView>
        <header className="App">
          {/* Title */}
          <h1>Neural Style Transfer</h1>
          <div style={{display: "flex", flexDirection: "row"}}>
            <a href="http://github.com/akshaytrikha/style-transfer" target="_blank" rel="noopener noreferrer">
              <img src={GitHubIcon} className="Icon GitHub" width="40px" alt={"GitHub link"} />
            </a>
            <a href="https://www.linkedin.com/in/akshay-trikha/" target="_blank" rel="noopener noreferrer">
              <img src={LinkedInIcon} className="Icon LinkedIn" width="40px" alt={"LinkedIn link"} />
            </a>
          </div>
          <div style={{display: "table-cell", verticalAlign: "middle", minHeight: "400px"}}>
            {/* First Panel */}
            <div style={{padding: "30px", marginTop: "-50px", display: "inline-block", verticalAlign: "middle"}}>
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpg"
                screenshotQuality={1}
                videoConstraints={{facingMode: "user"}}
                style={{textAlign: "center", zindex: 9, width: 300, height: 225, borderRadius: "30px"}}
              />
            </div>
            {/* "+" */}
            <div style={{marginTop: "-50px", display: "inline-block", verticalAlign: "middle"}}>
              <h1>+</h1>
            </div>
            {/* Middle Panel */}
            <div style={{padding: "30px", textAlign: "center", display: "inline-block", verticalAlign: "middle"}}>
              <figure>
                <img id="style-image-display" src={styleImageSource} style={{width: "300px", height: "300px", objectFit: "cover", borderRadius: "30px"}} alt="display style"/>
                <figcaption>
                  {/* Shuffle Button */}
                  <button className="Icon Shuffle-glow" onClick={shuffle}><img src={ShuffleIcon} width={"40px"} alt="Shuffle"/></button>
                  {/* Upload Image Button */}
                  <label className="Icon">
                    <img src={UploadIcon} width={"40px"} style={{opacity: 0.85}} alt="Upload Style" />
                    <input
                        id="upload-file-input"
                        hidden={true}
                        type="file"
                        accept="image/*"
                        onChange={uploadStyleImage}
                      />
                    </label>
                  </figcaption>
                </figure>
            </div>
            {/* "=" */}
            <div style={{marginTop: "-50px", display: "inline-block", verticalAlign: "middle"}}>
              <h1>=</h1>
            </div>
            {/* Third Panel */}
            <div style={{padding: "30px", display: "inline-block", verticalAlign: "middle"}}>
              <canvas id={"stylized-canvas"} width="300px" height="225px" style={{marginTop: "-50px", cover: "true", backgroundColor: "black", borderRadius: "30px"}}></canvas>
            </div>
          </div>
        </header>
      </BrowserView>
      {/* Mobile user gets alerted to use desktop */}
      <MobileView>
      <header className="App App-mobile">
          {/* Title */}
          <h1>Neural Style Transfer</h1>
          <h4>Please run this app on your desktop.</h4>
          <div style={{display: "flex", flexDirection: "row"}}>
            <a href="http://github.com/akshaytrikha/style-transfer" target="_blank" rel="noopener noreferrer">
              <img src={GitHubIcon} className="Icon GitHub" width="40px" alt={"GitHub link"} />
            </a>
            <a href="https://www.linkedin.com/in/akshay-trikha/" target="_blank" rel="noopener noreferrer">
              <img src={LinkedInIcon} className="Icon LinkedIn" width="40px" alt={"LinkedIn link"} />
            </a>
          </div>
        </header>
      </MobileView>
    </div>
  );
}