import "regenerator-runtime/runtime"
import * as THREE from "three"
import gsap from "gsap"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import vertexShader from "./shaders/vertex.glsl"
import fragmentShader from "./shaders/fragment.glsl"
import noise from "./shaders/noise.glsl"
import imagesLoaded from "imagesloaded"
import Scroll from "./scroll.js"
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js"
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js"
import { DotScreenPass } from "three/examples/jsm/postprocessing/DotScreenPass.js"
import { GlitchPass } from "three/examples/jsm/postprocessing/GlitchPass.js"
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js"

export default class WEBGL {
    constructor(element) {
        this.time = 0
        this.width = window.innerWidth
        this.height = window.innerHeight

        let aspectRatio = this.width / this.height

        //scene
        this.scene = new THREE.Scene()

        //camera
        this.camera = new THREE.PerspectiveCamera(10, aspectRatio, 0.01, 10)
        this.camera.position.z = 1.4

        //setting camera fov to match 2 worlds units
        this.camera.fov =
            2 *
            Math.atan(this.height / 2 / this.camera.position.z) *
            (180 / Math.PI)

        //upadate camera dimensions
        this.camera.updateProjectionMatrix()

        this.scene.add(this.camera)

        //controls
        // this.control = new OrbitControls(this.camera, element);

        // renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: element,
            antialias: true,
            alpha: true,
        })
        this.renderer.setSize(this.width, this.height)
        this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))

        new Promise((resolve) => {
            imagesLoaded(
                document.querySelectorAll("img"),
                {
                    background: true,
                },
                resolve
            )
        }).then(() => {
            //other utilities
            this.scroll = new Scroll()
            this.addObj()
            this.mouseMovement()
            this.composer()
            this.render(this.time)
            this.setUpResize()
        })
    }

    textureLoader(img) {
        const textureLoader = new THREE.TextureLoader()
        return textureLoader.load(img)
    }

    setUpResize() {
        window.addEventListener("resize", this.resize.bind(this))
    }

    composer() {
        this.composer = new EffectComposer(this.renderer)
        this.composer.setSize(this.width, this.height)
        this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

        this.renderPass = new RenderPass(this.scene, this.camera)
        this.composer.addPass(this.renderPass)

        this.customPass = {
            uniforms: {
                tDiffuse: {
                    value: null,
                },
                scrollSpeed: {
                    value: null,
                },
                uTime: {
                    value: this.time,
                },
            },
            vertexShader: `
                varying vec2 vUv;

                void main() {
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);

                    vUv = uv;
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float scrollSpeed;
                uniform float uTime;

                varying vec2 vUv;

                ${noise}

                void main() {
                    vec2 newUv = vUv;

                    float area = (smoothstep(1., .6, vUv.y)) * 2. - 1.;

                    float noise = ((cnoise(vec3(vUv * 10., uTime / 1000.))) + 1.) * .5;
                    float x = noise + area;
                    float n = smoothstep(.5, .51, x);

                    newUv.x -= (vUv.x - .5)*.2*area*scrollSpeed;

                    vec4 textureColor = texture2D(tDiffuse, newUv);

                    gl_FragColor = textureColor;
                    gl_FragColor = vec4(vec3(n, 0., 0.), 1.);
                    // gl_FragColor = vec4(area, 0., 0., 1.);

                    gl_FragColor = mix(
                        vec4(1.),
                        textureColor,
                        n
                    );

                    // gl_FragColor = vec4(n, 0, 0, 1.);
                }
            `,
        }

        this.pagePass = new ShaderPass(this.customPass)
        this.composer.addPass(this.pagePass)
    }

    resize() {
        //update dimensions
        this.width = window.innerWidth
        this.height = window.innerHeight

        //update camera fov to match 2 worlds unit
        this.camera.fov =
            (2 * Math.atan(this.height / 2 / this.camera.position.z) * 180) /
            Math.PI

        //upadate camera dimensions
        this.camera.updateProjectionMatrix()

        //update aspect ratio
        this.camera.aspect = this.width / this.height

        //update render size
        this.renderer.setSize(this.width, this.height)

        //update pixel ratio
        this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
    }

    addObj() {
        const images = [...document.querySelectorAll(".grid img")]

        this.rayCaster = new THREE.Raycaster()

        const shaderMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTexture: {
                    value: null,
                },
                uTime: {
                    value: this.time,
                },
                uCoord: {
                    value: new THREE.Vector2(0.5, 0.5),
                },
                uHoverState: {
                    value: 0,
                },
            },
            vertexShader,
            fragmentShader,
            // wireframe: true
        })

        const headerImg = document.querySelector("img")
        const { top, left, width, height } = headerImg.getBoundingClientRect()

        const texture = new THREE.Texture(headerImg)
        texture.needsUpdate = true

        const geometry = new THREE.PlaneGeometry(width, height, 20, 20)

        const material = shaderMaterial.clone()
        material.uniforms.uTexture.value = texture
        material.uniforms.uHoverState.value = 1

        const mesh = new THREE.Mesh(geometry, material)

        this.scene.add(mesh)

        this.meshes = images.map((img) => {
            const { top, left, width, height } = img.getBoundingClientRect()

            const texture = new THREE.Texture(img)
            texture.needsUpdate = true

            const geometry = new THREE.PlaneGeometry(width, height, 20, 20)

            const material = shaderMaterial.clone()
            material.uniforms.uTexture.value = texture
            const mesh = new THREE.Mesh(geometry, material)

            img.addEventListener("mouseenter", () => {
                gsap.to(material.uniforms.uHoverState, {
                    duration: 1,
                    value: 1,
                    ease: "power3.out",
                })
            })

            img.addEventListener("mouseout", () => {
                gsap.to(material.uniforms.uHoverState, {
                    duration: 1,
                    value: 0,
                    ease: "power3.out",
                })
            })

            this.scene.add(mesh)

            return {
                img,
                top,
                left,
                width,
                height,
                mesh,
            }
        })

        this.meshes.unshift({
            img: headerImg,
            top,
            left,
            width,
            height,
            mesh,
        })
        console.log(this.meshes)
        this.setPosition()
    }

    mouseMovement() {
        this.mouse = new THREE.Vector2()
        let currentIntersect = null

        window.onmousemove = ({ clientX: x, clientY: y }) => {
            this.mouse.x = (x / this.width) * 2 - 1
            this.mouse.y = -((y / this.height) * 2 - 1)

            //update raycaster
            this.rayCaster.setFromCamera(this.mouse, this.camera)

            const intersects = this.rayCaster.intersectObjects(
                this.meshes.map(({ mesh }) => mesh)
            )

            if (intersects.length > 0) {
                const obj = intersects[0].object
                obj.material.uniforms.uCoord.value = intersects[0].uv
                // console.log(intersects[0].object)
            }

            //     if (intersects.length) {
            //         if (currentIntersect === null) {
            //             intersects[0].object.material.uniforms.uHoverState.value = 1.;
            //         }
            //         currentIntersect = intersects[0];
            //     } else {
            //         if (currentIntersect !== null) {
            //             currentIntersect.object.material.uniforms.uHoverState.value = 0.;
            //         }
            //         currentIntersect = null;
            //     }
        }
    }

    setPosition() {
        this.meshes.forEach(({ mesh, top, height, width, left }) => {
            mesh.position.y =
                -(height / 2) + this.height / 2 - top + this.currentScroll
            mesh.position.x = width / 2 - this.width / 2 + left
        })
    }

    render(time) {
        this.time = time

        //smooth scroll
        this.scroll.render()
        this.currentScroll = this.scroll.scrollToRender
        this.setPosition()
        this.pagePass.uniforms.scrollSpeed.value = this.scroll.speedTarget
        this.pagePass.uniforms.uTime.value = this.time

        //update shader material
        this.meshes.forEach(({ mesh }) => {
            // console.log(mesh)
            mesh.material.uniforms.uTime.value = this.time
        })

        //re-render
        // this.renderer.render(this.scene, this.camera)
        this.composer.render()

        window.requestAnimationFrame(this.render.bind(this))
    }
}
