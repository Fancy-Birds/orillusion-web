import { Ammo, Physics, Rigidbody } from "@orillusion/physics";
import { AtmosphericComponent, View3D, KelvinUtil, DirectLight, HoverCameraController, CameraUtil, Scene3D, Object3D, LitMaterial, Engine3D, BoxGeometry, MeshRenderer, ColliderComponent, BoxColliderShape, Vector3, PlaneGeometry, Color, ComponentBase, KeyCode, KeyEvent, Quaternion, CylinderGeometry } from "@orillusion/core";
import dat from 'dat.gui'
import { Stats } from '@orillusion/stats'

class Sample_PhysicsCar {
    private scene: Scene3D;
    private materials: LitMaterial[];
    private boxGeometry: BoxGeometry;
    private Ori: dat.GUI | undefined

    async run() {
        Engine3D.setting.shadow.autoUpdate = true;
        Engine3D.setting.shadow.updateFrameRate = 1;
        Engine3D.setting.shadow.shadowSize = 2048;
        Engine3D.setting.shadow.shadowBound = 150;

        await Physics.init();
        await Engine3D.init({ renderLoop: () => this.loop() });

        let scene = new Scene3D()
        scene.exposure = 1
        scene.addComponent(Stats)
    
        // init sky
        let atmosphericSky: AtmosphericComponent
        atmosphericSky = scene.addComponent(AtmosphericComponent)
    
        // init Camera3D
        let camera = CameraUtil.createCamera3DObject(scene)
        camera.perspective(60, Engine3D.aspect, 1, 5000)
    
        // init Camera Controller
        let hoverCtrl = camera.object3D.addComponent(HoverCameraController)
        hoverCtrl.setCamera(-30, -15, 100)
    
        // init View3D
        let view = new View3D()
        view.scene = scene
        view.camera = camera
    
        // create direction light
        let lightObj3D = new Object3D()
        lightObj3D.x = 0
        lightObj3D.y = 30
        lightObj3D.z = -40
        lightObj3D.rotationX = 20
        lightObj3D.rotationY = 160
        lightObj3D.rotationZ = 0
    
        let light = lightObj3D.addComponent(DirectLight)
        light.lightColor = KelvinUtil.color_temperature_to_rgb(5355)
        light.castShadow = true
        light.intensity = 30
    
        scene.addChild(light.object3D)
    
        // relative light to sky
        atmosphericSky.relativeTransform = light.transform


        this.scene = scene;

        // GUIHelp.init();
        // GUIUtil.renderDirLight(exampleScene.light, false);
        const gui = new dat.GUI()
        gui.domElement.style.zIndex = '10'
        gui.domElement.parentElement.style.zIndex = '10'

        this.Ori = gui.addFolder('Orillusion')
        this.Ori.open()
        let DirLight = this.Ori.addFolder('DirectLight')
        DirLight.add(light, 'enable')
        DirLight.add(light.transform, 'rotationX', 0.0, 360.0, 0.01)
        DirLight.add(light.transform, 'rotationY', 0.0, 360.0, 0.01)
        DirLight.add(light.transform, 'rotationZ', 0.0, 360.0, 0.01)
        DirLight.addColor(light, 'lightColor')
        DirLight.add(light, 'intensity', 0.0, 160.0, 0.01)
        DirLight.add(light, 'indirect', 0.0, 10.0, 0.01)
        DirLight.add(light, 'castShadow')
        DirLight.open()

        this.scene = scene;
        await this.initScene(this.scene);

        Engine3D.startRenderView(view);
    }

    async initScene(scene: Scene3D) {
        this.createGround();
    }

    private createGround() {
        let floorMat = new LitMaterial();
        floorMat.baseMap = Engine3D.res.grayTexture;
        floorMat.roughness = 0.85;
        floorMat.metallic = 0.01;
        floorMat.envIntensity = 0.01;

        let floor = new Object3D();
        let renderer = floor.addComponent(MeshRenderer);

        renderer.castShadow = true;
        renderer.receiveShadow = true;
        renderer.geometry = new PlaneGeometry(200, 200, 1, 1);
        renderer.material = floorMat;

        let rigidBody = floor.addComponent(Rigidbody);
        rigidBody.mass = 0;
        rigidBody.friction = 2;
        // rigidBody.restitution = 0.1;

        let collider = floor.addComponent(ColliderComponent);
        collider.shape = new BoxColliderShape();
        collider.shape.size = new Vector3(200, 1, 200);
        this.scene.addChild(floor);

        class CarController extends ComponentBase {
            actions = {};
            syncList = [];
            keysActions = {
                KeyUp: 'acceleration',
                KeyDown: 'braking',
                KeyLeft: 'left',
                KeyRight: 'right',
            };
            start() {
                Engine3D.inputSystem.addEventListener(KeyEvent.KEY_UP, this.keyUp, this);
                Engine3D.inputSystem.addEventListener(KeyEvent.KEY_DOWN, this.keyDown, this);
            }

            stop() {
                Engine3D.inputSystem.removeEventListener(KeyEvent.KEY_UP, this.keyUp, this);
                Engine3D.inputSystem.removeEventListener(KeyEvent.KEY_DOWN, this.keyDown, this);
            }

            destroy(force) {
                Engine3D.inputSystem.removeEventListener(KeyEvent.KEY_UP, this.keyUp, this);
                Engine3D.inputSystem.removeEventListener(KeyEvent.KEY_DOWN, this.keyDown, this);
            }

            keyUp(e) {
                switch (e.keyCode) {
                    case KeyCode.Key_Up:
                        this.actions[this.keysActions['KeyUp']] = false;
                        break;
                    case KeyCode.Key_Down:
                        this.actions[this.keysActions['KeyDown']] = false;
                        break;
                    case KeyCode.Key_Left:
                        this.actions[this.keysActions['KeyLeft']] = false;
                        break;
                    case KeyCode.Key_Right:
                        this.actions[this.keysActions['KeyRight']] = false;
                        break;
                }
            }

            keyDown(e) {
                // console.log(e.keyCode);
                switch (e.keyCode) {
                    case KeyCode.Key_Up:
                        this.actions[this.keysActions['KeyUp']] = true;
                        break;
                    case KeyCode.Key_Down:
                        this.actions[this.keysActions['KeyDown']] = true;
                        break;
                    case KeyCode.Key_Left:
                        this.actions[this.keysActions['KeyLeft']] = true;
                        break;
                    case KeyCode.Key_Right:
                        this.actions[this.keysActions['KeyRight']] = true;
                        break;
                }
            }

            onUpdate(view) {
                if (Physics.isInited) {
                    for (let i = 0; i < this.syncList.length; i++) {
                        this.syncList[i](16);
                    }
                }
            }
        }

        let url = "https://cdn.orillusion.com/gltfs/pbrCar/pbrCar.glb"
        Engine3D.res.loadGltf(url).then((e) => {
            let body = e.getChildByName("Exoplanet-Rover_Exoplanet-Rover_0") as Object3D;
            let scene = this.scene;
            let bodyMass = 1300;


            var chassisWidth = 2.8;
            var chassisHeight = .6;
            var chassisLength = 4;
            var massVehicle = 800;

            var wheelAxisPositionBack = -1.3;
            var wheelAxisHeightBack = .3;
            var wheelRadiusBack = .4;
            var wheelWidthBack = .4;
            var wheelHalfTrackBack = 1.2;

            var wheelAxisFrontPosition = 1.7;
            var wheelAxisHeightFront = .3;
            var wheelRadiusFront = .4;
            var wheelWidthFront = .4;
            var wheelHalfTrackFront = 1.2;

            var friction = 1000;
            var suspensionStiffness = 10.0;
            var suspensionDamping = 6.3;
            var suspensionCompression = 2.4;
            var suspensionRestLength = 0.45;
            var rollInfluence = 0.1;

            var steeringIncrement = .04;
            var steeringClamp = .5;
            var maxEngineForce = 2000;
            var maxBreakingForce = 100;

            let bodyObj = new Object3D();
            let bodyMat = new LitMaterial();
            bodyMat.baseMap = Engine3D.res.whiteTexture;
            bodyMat.normalMap = Engine3D.res.normalTexture;
            bodyMat.aoMap = Engine3D.res.whiteTexture;
            bodyMat.maskMap = Engine3D.res.whiteTexture;
            bodyMat.emissiveMap = Engine3D.res.blackTexture;
            let bodyMr = bodyObj.addComponent(MeshRenderer);
            let carController = bodyObj.addComponent(CarController);
            bodyMr.geometry = new BoxGeometry(chassisWidth * 0.5, chassisHeight * 0.5, chassisLength * 0.5);
            bodyMr.material = bodyMat;
            var geometry = new Ammo.btBoxShape(new Ammo.btVector3(chassisWidth * 0.5, chassisHeight * 0.5, chassisLength * 0.5));
            var transform = new Ammo.btTransform();
            transform.setIdentity();
            transform.setOrigin(new Ammo.btVector3(bodyObj.x, bodyObj.y, bodyObj.z));
            transform.setRotation(new Ammo.btQuaternion(0, 0, 0, 1));
            var motionState = new Ammo.btDefaultMotionState(transform);
            var localInertia = new Ammo.btVector3(0, 0, 0);
            geometry.calculateLocalInertia(bodyMass, localInertia);
            var bodyRb = new Ammo.btRigidBody(new Ammo.btRigidBodyConstructionInfo(bodyMass, motionState, geometry, localInertia));
            bodyRb.setActivationState(4);
            Physics.world.addRigidBody(bodyRb);

            body.scaleX = 0.0055;
            body.scaleY = 0.0055;
            body.scaleZ = 0.0055;
            body.rotationX = 0;
            body.y = -1.1;
            body.z = -0.15
            bodyObj.addChild(body);

            bodyObj.y = 10
            scene.addChild(bodyObj);

            //raycast Vehicle
            let engineForce = 0;
            let vehicleSteering = 0;
            let breakingForce = 0;
            let tuning = new Ammo.btVehicleTuning();
            let rayCaster = new Ammo.btDefaultVehicleRaycaster(Physics.world);
            let vehicle = new Ammo.btRaycastVehicle(tuning, bodyRb, rayCaster);
            vehicle.setCoordinateSystem(0, 1, 2);
            Physics.world.addAction(vehicle);

            //create wheels

            const FRONT_LEFT = 0;
            const FRONT_RIGHT = 1;
            const BACK_LEFT = 2;
            const BACK_RIGHT = 3;

            let wheelMeshes = [];
            let wheelDirectCS0 = new Ammo.btVector3(0, -1, 0);
            let wheelAxleCS = new Ammo.btVector3(-1, 0, 0);

            let addWheel = (name, isFront, pos, radius, width, index) => {
                let wheelInfo = vehicle.addWheel(pos, wheelDirectCS0, wheelAxleCS, suspensionRestLength, radius, tuning, isFront);
                wheelInfo.set_m_suspensionStiffness(suspensionStiffness);
                wheelInfo.set_m_wheelsDampingRelaxation(suspensionDamping);
                wheelInfo.set_m_wheelsDampingCompression(suspensionCompression);
                wheelInfo.set_m_frictionSlip(friction);
                wheelInfo.set_m_rollInfluence(rollInfluence);
                wheelMeshes[index] = this.createWheelObject(name, radius, width, e);
            };

            addWheel("ExoRov_FrontWheel_L_ExoRov_Wheels_0", true, new Ammo.btVector3(wheelHalfTrackFront, wheelAxisHeightFront, wheelAxisFrontPosition), wheelRadiusFront, wheelWidthFront, FRONT_LEFT);
            addWheel("ExoRov_FrontWheel_R_ExoRov_Wheels_0", true, new Ammo.btVector3(-wheelHalfTrackFront, wheelAxisHeightFront, wheelAxisFrontPosition), wheelRadiusFront, wheelWidthFront, FRONT_RIGHT);
            addWheel("ExoRov_BackWheel_L_ExoRov_Wheels_0", false, new Ammo.btVector3(-wheelHalfTrackBack, wheelAxisHeightBack, wheelAxisPositionBack), wheelRadiusBack, wheelWidthBack, BACK_LEFT);
            addWheel("ExoRov_BackWheel_R_ExoRov_Wheels_0", false, new Ammo.btVector3(wheelHalfTrackBack, wheelAxisHeightBack, wheelAxisPositionBack), wheelRadiusBack, wheelWidthBack, BACK_RIGHT);

            let syncList = carController.syncList;
            let actions = carController.actions;
            function sync(dt) {
                var speed = vehicle.getCurrentSpeedKmHour();

                breakingForce = 0;
                engineForce = 0;
                // console.log(actions);
                if (actions['acceleration']) {
                    if (speed < -1) breakingForce = maxBreakingForce;
                    else engineForce = maxEngineForce;
                }
                if (actions[`braking`]) {
                    if (speed > 1) breakingForce = maxBreakingForce;
                    else engineForce = -maxEngineForce / 2;
                }
                if (actions[`left`]) {
                    if (vehicleSteering < steeringClamp) vehicleSteering += steeringIncrement;
                } else {
                    if (actions[`right`]) {
                        if (vehicleSteering > -steeringClamp) vehicleSteering -= steeringIncrement;
                    } else {
                        if (vehicleSteering < -steeringIncrement) vehicleSteering += steeringIncrement;
                        else {
                            if (vehicleSteering > steeringIncrement) vehicleSteering -= steeringIncrement;
                            else {
                                vehicleSteering = 0;
                            }
                        }
                    }
                }

                vehicle.applyEngineForce(engineForce, BACK_LEFT);
                vehicle.applyEngineForce(engineForce, BACK_RIGHT);

                vehicle.setBrake(breakingForce / 2, FRONT_LEFT);
                vehicle.setBrake(breakingForce / 2, FRONT_RIGHT);
                vehicle.setBrake(breakingForce, BACK_LEFT);
                vehicle.setBrake(breakingForce, BACK_RIGHT);

                vehicle.setSteeringValue(vehicleSteering, FRONT_LEFT);
                vehicle.setSteeringValue(vehicleSteering, FRONT_RIGHT);

                var tm, p, q, i;
                var n = vehicle.getNumWheels();

                // console.log("getNumWheels",n);
                // console.log("engineForce",engineForce);
                // console.log("breakingForce",breakingForce);

                for (i = 0; i < n; i++) {
                    vehicle.updateWheelTransform(i, true);
                    tm = vehicle.getWheelTransformWS(i);
                    p = tm.getOrigin();
                    q = tm.getRotation();
                    let obj = wheelMeshes[i];
                    obj.transform.x = p.x();
                    obj.transform.y = p.y();
                    obj.transform.z = p.z();
                    let qua = Quaternion.HELP_0;

                    qua.set(q.x(), q.y(), q.z(), q.w());
                    obj.transform.localRotQuat = qua;
                }

                tm = vehicle.getChassisWorldTransform();
                p = tm.getOrigin();
                let q2 = tm.getRotation();
                bodyObj.x = p.x();
                bodyObj.y = p.y();
                bodyObj.z = p.z();
                let qua = Quaternion.HELP_0;
                // q.
                qua.set(q2.x(), q2.y(), q2.z(), q2.w());
                // qua.
                bodyObj.transform.localRotQuat = qua;
            }

            syncList.push(sync);

            let wheelMat = new LitMaterial();
            wheelMat.baseMap = Engine3D.res.whiteTexture;
            wheelMat.normalMap = Engine3D.res.normalTexture;
            wheelMat.aoMap = Engine3D.res.whiteTexture;
            wheelMat.maskMap = Engine3D.res.whiteTexture;
            wheelMat.emissiveMap = Engine3D.res.blackTexture;
            wheelMat.roughness = 0.85;
            wheelMat.metallic = 0.01;
            wheelMat.envIntensity = 0.01;
        })
    }

    private loop() {
        Physics.update();
    }

    private createWheelObject(name: string, radius: number, width: number, skin: Object3D) {

        let wheelMat = new LitMaterial();
        wheelMat.baseMap = Engine3D.res.redTexture;
        wheelMat.normalMap = Engine3D.res.normalTexture;
        wheelMat.aoMap = Engine3D.res.whiteTexture;
        wheelMat.maskMap = Engine3D.res.whiteTexture;
        wheelMat.emissiveMap = Engine3D.res.blackTexture;
        // wheelMat.blendMode = BlendMode.NORMAL;
        wheelMat.roughness = 0.85;
        wheelMat.metallic = 0.01;
        wheelMat.envIntensity = 0.01;
        wheelMat.doubleSide = true;

        let wheel = new Object3D();
        // let leftFrontWheel = new Object3D();
        let mr = wheel.addComponent(MeshRenderer);

        mr.geometry = new CylinderGeometry(radius * 2, radius * 2, width, 24, 1);
        mr.materials = [wheelMat, wheelMat, wheelMat];
        let q = Quaternion.HELP_0;
        q.fromEulerAngles(0, 0, 90);
        wheel.transform.localRotQuat = q.clone();
        var p = new Object3D();
        p.addChild(wheel);
        this.scene.addChild(p);

        var wheelSkin = skin.getChildByName(name) as Object3D;
        wheelSkin.scaleX = 0.005;
        wheelSkin.scaleY = 0.005;
        wheelSkin.scaleZ = 0.005;
        wheelSkin.x = 0;
        wheelSkin.y = 0;
        wheelSkin.z = 0;
        wheelSkin.rotationX = 0;
        wheelSkin.rotationY = 0;
        wheelSkin.rotationZ = 0;
        p.addChild(wheelSkin);

        return p;
    }
}
new Sample_PhysicsCar().run();