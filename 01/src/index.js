import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

let arProject;

const isArSessionSupported = (async function () {
  return (
    navigator.xr &&
    navigator.xr.isSessionSupported &&
    (await navigator.xr.isSessionSupported("immersive-ar"))
  );
})();

if (isArSessionSupported) {
  document.getElementById("enter-ar").addEventListener("click", () => {
    arProject = new ARProject();
    arProject.activateXR();
  });
}

class ARProject {
  activateXR = async () => {
    this.createCanvas();

    this.createBoxes();
    this.setupThreeJs();

    this.session = await navigator.xr.requestSession("immersive-ar");
    this.session.updateRenderState({
      baseLayer: new XRWebGLLayer(this.session, this.gl),
    });
    this.localReferenceSpace = await this.session.requestReferenceSpace(
      "local"
    );

    this.session.requestAnimationFrame(this.onXRFrame);
  };

  onXRFrame = (time, frame) => {
    this.session.requestAnimationFrame(this.onXRFrame);

    const framebuffer = this.session.renderState.baseLayer.framebuffer;
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
    this.renderer.setFramebuffer(framebuffer);

    const pose = frame.getViewerPose(this.localReferenceSpace);
    if (pose) {
      const view = pose.views[0];

      const viewport = this.session.renderState.baseLayer.getViewport(view);
      this.renderer.setSize(viewport.width, viewport.height);

      this.camera.matrix.fromArray(view.transform.matrix);
      this.camera.projectionMatrix.fromArray(view.projectionMatrix);
      this.camera.updateMatrixWorld(true);

      this.renderer.render(this.scene, this.camera);
    }
  };

  createCanvas() {
    this.canvas = document.querySelector("#webxr-canvas");
    this.canvas.width = document.body.clientWidth;
    this.canvas.height = document.body.clientHeight;

    this.gl = this.canvas.getContext("webgl", { xrCompatible: true });
  }

  createBoxes() {
    this.scene = new THREE.Scene();

    const materials = [
      new THREE.MeshBasicMaterial({ color: 0xff0000 }),
      new THREE.MeshBasicMaterial({ color: 0x0000ff }),
      new THREE.MeshBasicMaterial({ color: 0x00ff00 }),
      new THREE.MeshBasicMaterial({ color: 0xff00ff }),
      new THREE.MeshBasicMaterial({ color: 0x00ffff }),
      new THREE.MeshBasicMaterial({ color: 0xffff00 }),
    ];

    const ROW_COUNT = 4;
    const SPREAD = 1;
    const HALF = ROW_COUNT / 2;
    for (let i = 0; i < ROW_COUNT; i++) {
      for (let j = 0; j < ROW_COUNT; j++) {
        for (let k = 0; k < ROW_COUNT; k++) {
          const box = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.2, 0.2),
            materials
          );
          box.position.set(i - HALF, j - HALF, k - HALF);
          box.position.multiplyScalar(SPREAD);

          this.scene.add(box);
        }
      }
    }
  }

  setupThreeJs() {
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      preserveDrawingBuffer: true,
      canvas: this.canvas,
      context: this.gl,
    });
    this.renderer.autoClear = false;

    this.camera = new THREE.PerspectiveCamera();
    this.camera.matrixAutoUpdate = false;
  }
}
