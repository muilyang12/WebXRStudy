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
  const button = document.getElementById("enter-ar");
  button.addEventListener("click", () => {
    arProject = new ARProject();
    arProject.activateXR();

    button.style.display = "none";
  });
}

class ARProject {
  activateXR = async () => {
    this.createCanvas();
    this.loadFlower();
    this.setupThreeJs();

    this.xrSession = await navigator.xr.requestSession("immersive-ar", {
      requiredFeatures: ["hit-test", "dom-overlay"],
      domOverlay: { root: document.body },
    });
    this.xrSession.updateRenderState({
      baseLayer: new XRWebGLLayer(this.xrSession, this.gl),
    });

    this.localSpace = await this.xrSession.requestReferenceSpace("local");
    this.viewerSpace = await this.xrSession.requestReferenceSpace("viewer");

    this.hitTestSource = await this.xrSession.requestHitTestSource({
      space: this.viewerSpace,
    });

    this.xrSession.addEventListener("select", this.handleSelect);

    this.xrSession.requestAnimationFrame(this.onXRFrame);
  };

  handleSelect = () => {
    if (this.sunflower) {
      const clone = this.sunflower.clone();
      clone.position.copy(this.reticle.position);
      this.scene.add(clone);
    }
  };

  onXRFrame = (time, frame) => {
    this.xrSession.requestAnimationFrame(this.onXRFrame);

    const framebuffer = this.xrSession.renderState.baseLayer.framebuffer;
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
    this.renderer.setFramebuffer(framebuffer);

    const pose = frame.getViewerPose(this.localSpace);
    if (pose) {
      const view = pose.views[0];

      const viewport = this.xrSession.renderState.baseLayer.getViewport(view);
      this.renderer.setSize(viewport.width, viewport.height);

      this.camera.matrix.fromArray(view.transform.matrix);
      this.camera.projectionMatrix.fromArray(view.projectionMatrix);
      this.camera.updateMatrixWorld(true);

      const hitTestResults = frame.getHitTestResults(this.hitTestSource);

      if (hitTestResults.length > 0) {
        const hitPose = hitTestResults[0].getPose(this.localSpace);

        this.reticle.visible = true;
        this.reticle.position.set(
          hitPose.transform.position.x,
          hitPose.transform.position.y,
          hitPose.transform.position.z
        );
        this.reticle.updateMatrixWorld(true);
      }

      this.renderer.render(this.scene, this.camera);
    }
  };

  createCanvas() {
    this.canvas = document.querySelector("#webxr-canvas");
    this.canvas.width = document.body.clientWidth;
    this.canvas.height = document.body.clientHeight;

    this.gl = this.canvas.getContext("webgl", { xrCompatible: true });
  }

  loadFlower() {
    this.gltfloader = new GLTFLoader();
    this.gltfloader.load(
      "https://immersive-web.github.io/webxr-samples/media/gltf/sunflower/sunflower.gltf",
      (gltf) => {
        const flower = gltf.scene.children.find((c) => c.name === "sunflower");
        flower.castShadow = true;

        this.sunflower = gltf.scene;
      }
    );
  }

  setupThreeJs() {
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      preserveDrawingBuffer: true,
      canvas: this.canvas,
      context: this.gl,
    });
    this.renderer.autoClear = false;

    this.scene = this.createLitScene();
    this.reticle = new Reticle();
    this.scene.add(this.reticle);

    this.camera = new THREE.PerspectiveCamera();
    this.camera.matrixAutoUpdate = false;
  }

  createLitScene() {
    const scene = new THREE.Scene();

    const light = new THREE.AmbientLight(0xffffff, 1);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight.position.set(10, 15, 10);

    directionalLight.castShadow = true;

    const planeGeometry = new THREE.PlaneGeometry(2000, 2000);
    planeGeometry.rotateX(-Math.PI / 2);

    const shadowMesh = new THREE.Mesh(
      planeGeometry,
      new THREE.ShadowMaterial({
        color: 0x111111,
        opacity: 0.2,
      })
    );

    // Give it a name so we can reference it later, and set `receiveShadow`
    // to true so that it can render our model's shadow.
    shadowMesh.name = "shadowMesh";
    shadowMesh.receiveShadow = true;
    shadowMesh.position.y = 10000;

    scene.add(shadowMesh);
    scene.add(light);
    scene.add(directionalLight);

    return scene;
  }
}

class Reticle extends THREE.Object3D {
  constructor() {
    super();

    this.loader = new GLTFLoader();
    this.loader.load(
      "https://immersive-web.github.io/webxr-samples/media/gltf/reticle/reticle.gltf",
      (gltf) => {
        this.add(gltf.scene);
      }
    );

    this.visible = false;
  }
}
