import { RigidBody, Vector3 as VT } from '@dimforge/rapier3d-compat'
import { Quaternion } from 'three'

import { isDev } from '@etherealengine/common/src/config'
import { dispatchAction, getMutableState, getState } from '@etherealengine/hyperflux'

import { V_000, V_010 } from '../common/constants/MathConstants'
import { Engine } from '../ecs/classes/Engine'
import { EngineActions } from '../ecs/classes/EngineState'
import { Entity } from '../ecs/classes/Entity'
import {
  ComponentType,
  defineQuery,
  getComponent,
  getMutableComponent,
  removeComponent,
  setComponent
} from '../ecs/functions/ComponentFunctions'
import { defineSystem } from '../ecs/functions/SystemFunctions'
import { InputComponent } from '../input/components/InputComponent'
import { InputSourceComponent } from '../input/components/InputSourceComponent'
import { InteractState } from '../interaction/systems/InteractiveSystem'
import { WorldNetworkAction } from '../networking/functions/WorldNetworkAction'
import { RigidBodyFixedTagComponent } from '../physics/components/RigidBodyComponent'
import { boxDynamicConfig } from '../physics/functions/physicsObjectDebugFunctions'
import { RendererState } from '../renderer/RendererState'
import { TransformComponent } from '../transform/components/TransformComponent'
import { hasMovementControls } from '../xr/XRState'
import { changeAvatarAnimationState } from './animation/AvatarAnimationGraph'
import { AvatarStates } from './animation/Util'
import { AvatarControllerComponent } from './components/AvatarControllerComponent'
import { AvatarTeleportComponent } from './components/AvatarTeleportComponent'
import { autopilotSetPosition } from './functions/autopilotFunctions'
import { translateAndRotateAvatar } from './functions/moveAvatar'
import { AvatarAxesControlScheme, AvatarInputSettingsState } from './state/AvatarInputSettingsState'

const _quat = new Quaternion()

/**
 * On 'xr-standard' mapping, get thumbstick input [2,3], fallback to thumbpad input [0,1]
 */
export function getThumbstickOrThumbpadAxes(inputSource: XRInputSource, deadZone: number = 0.05) {
  const axes = inputSource.gamepad!.axes
  const axesIndex = axes.length >= 4 ? 2 : 0
  const xAxis = Math.abs(axes[axesIndex]) > deadZone ? axes[axesIndex] : 0
  const zAxis = Math.abs(axes[axesIndex + 1]) > deadZone ? axes[axesIndex + 1] : 0
  return [xAxis, zAxis] as [number, number]
}

export const InputSourceAxesDidReset = new WeakMap<XRInputSource, boolean>()

export const AvatarAxesControlSchemeBehavior = {
  [AvatarAxesControlScheme.Move]: (
    inputSource: XRInputSource,
    controller: ComponentType<typeof AvatarControllerComponent>
  ) => {
    if (inputSource.gamepad?.mapping !== 'xr-standard') return
    const [x, z] = getThumbstickOrThumbpadAxes(inputSource, 0.05)
    controller.gamepadLocalInput.x += x
    controller.gamepadLocalInput.z += z
  },

  [AvatarAxesControlScheme.Teleport]: (inputSource: XRInputSource) => {
    if (inputSource.gamepad?.mapping !== 'xr-standard') return

    const localClientEntity = Engine.instance.localClientEntity
    const [x, z] = getThumbstickOrThumbpadAxes(inputSource, 0.05)

    if (x === 0 && z === 0) {
      InputSourceAxesDidReset.set(inputSource, true)
      if (inputSource.handedness === getComponent(localClientEntity, AvatarTeleportComponent)?.side)
        removeComponent(localClientEntity, AvatarTeleportComponent)
    }

    if (!InputSourceAxesDidReset.get(inputSource)) return

    const canTeleport = z < -0.75
    const canRotate = Math.abs(x) > 0.1 && Math.abs(z) < 0.1

    if (canRotate) {
      const angle = (Math.PI / 6) * (x > 0 ? -1 : 1) // 30 degrees
      translateAndRotateAvatar(localClientEntity, V_000, _quat.setFromAxisAngle(V_010, angle))
      InputSourceAxesDidReset.set(inputSource, false)
    } else if (canTeleport) {
      setComponent(localClientEntity, AvatarTeleportComponent, { side: inputSource.handedness })
      InputSourceAxesDidReset.set(inputSource, false)
    }
  }
}

const onShiftLeft = () => {
  const controller = getMutableComponent(Engine.instance.localClientEntity, AvatarControllerComponent)
  controller.isWalking.set(!controller.isWalking.value)
}

const onKeyE = () => {
  dispatchAction(
    EngineActions.interactedWithObject({
      targetEntity: getState(InteractState).available[0],
      handedness: 'none'
    })
  )
}

const onLeftTrigger = () => {
  dispatchAction(
    EngineActions.interactedWithObject({
      targetEntity: getState(InteractState).available[0],
      handedness: 'left'
    })
  )
}

const onRightTrigger = () => {
  dispatchAction(
    EngineActions.interactedWithObject({
      targetEntity: getState(InteractState).available[0],
      handedness: 'right'
    })
  )
}

const onKeyO = () => {
  dispatchAction(
    WorldNetworkAction.spawnDebugPhysicsObject({
      config: boxDynamicConfig
    })
  )
}

const onKeyP = () => {
  getMutableState(RendererState).debugEnable.set(!getMutableState(RendererState).debugEnable.value)
}

const kickFunction = (delay: number = 0) => {
  setTimeout(() => {
    const world = Engine.instance.physicsWorld
    const ball = world.bodies.map.data.find((arr) => arr.isDynamic()) as RigidBody
    const bT = getComponent(ball.userData.entity as Entity, TransformComponent).position
    const entity = Engine.instance.localClientEntity
    const aT = getComponent(entity, TransformComponent).position
    const forcePower = process.env.VITE_FORCE_POWER
    const dx = bT.x - aT.x
    const dz = bT.z - aT.z
    const distance = Math.sqrt(dx * dx + dz * dz)
    if (distance < 1.5) {
      const forceY = (1.7 - distance) * (forcePower / 3)
      const absSum = Math.abs(dx) + Math.abs(dz)
      const forceX = (dx / absSum) * forcePower
      const forceZ = (dz / absSum) * forcePower
      const force = new VT(forceX, forceY, forceZ)
      ball.applyImpulse(force, true)
    }
  }, delay)
}

const onKeyK = () => {
  const entity = Engine.instance.localClientEntity
  changeAvatarAnimationState(entity, AvatarStates.KICK)
  kickFunction(0)
}

const walkableQuery = defineQuery([RigidBodyFixedTagComponent, InputComponent])

let mouseMovedDuringPrimaryClick = false
const execute = () => {
  const { inputSources, localClientEntity } = Engine.instance
  if (!localClientEntity) return

  const avatarInputSettings = getState(AvatarInputSettingsState)

  const controller = getComponent(localClientEntity, AvatarControllerComponent)
  const buttons = Engine.instance.buttons

  const firstWalkableEntityWithInput = walkableQuery().find(
    (entity) => getComponent(entity, InputComponent)?.inputSources.length
  )

  if (firstWalkableEntityWithInput) {
    const inputComponent = getComponent(firstWalkableEntityWithInput, InputComponent)
    const inputSourceEntity = inputComponent?.inputSources[0]

    if (inputSourceEntity) {
      const inputSourceComponent = getComponent(inputSourceEntity, InputSourceComponent)
      if (inputSourceComponent.buttons.PrimaryClick?.touched) {
        let mouseMoved = Engine.instance.pointerState.movement.lengthSq() > 0
        if (mouseMoved) mouseMovedDuringPrimaryClick = true

        if (inputSourceComponent.buttons.PrimaryClick.up) {
          if (!mouseMovedDuringPrimaryClick) {
            autopilotSetPosition(Engine.instance.localClientEntity)
          } else mouseMovedDuringPrimaryClick = false
        }
      }
    }
  }

  if (buttons.ShiftLeft?.down) onShiftLeft()
  if (buttons.KeyE?.down) onKeyE()
  if (buttons.KeyK?.down) onKeyK()
  if (buttons.LeftTrigger?.down) onLeftTrigger()
  if (buttons.RightTrigger?.down) onRightTrigger()

  if (isDev) {
    if (buttons.KeyO?.down) onKeyO()
    // To enable/disable Polygon view
    // if (buttons.KeyP?.down) onKeyP()
  }

  if (!hasMovementControls()) return

  /** keyboard input */
  const keyDeltaX = (buttons.KeyA?.pressed ? -1 : 0) + (buttons.KeyD?.pressed ? 1 : 0)
  const keyDeltaZ =
    (buttons.KeyW?.pressed ? -1 : 0) +
    (buttons.KeyS?.pressed ? 1 : 0) +
    (buttons.ArrowUp?.pressed ? -1 : 0) +
    (buttons.ArrowDown?.pressed ? 1 : 0)

  controller.gamepadLocalInput.set(keyDeltaX, 0, keyDeltaZ)

  controller.gamepadJumpActive = !!buttons.Space?.pressed

  for (const inputSource of inputSources) {
    const controlScheme =
      inputSource.handedness === 'none'
        ? AvatarAxesControlScheme.Move
        : inputSource.handedness === avatarInputSettings.preferredHand
        ? avatarInputSettings.rightAxesControlScheme
        : avatarInputSettings.leftAxesControlScheme
    AvatarAxesControlSchemeBehavior[controlScheme](inputSource, controller)
  }
}

export const AvatarInputSystem = defineSystem({
  uuid: 'ee.engine.AvatarInputSystem',
  execute
})
