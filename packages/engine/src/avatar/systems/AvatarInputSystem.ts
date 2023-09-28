/*
CPAL-1.0 License

The contents of this file are subject to the Common Public Attribution License
Version 1.0. (the "License"); you may not use this file except in compliance
with the License. You may obtain a copy of the License at
https://github.com/EtherealEngine/etherealengine/blob/dev/LICENSE.
The License is based on the Mozilla Public License Version 1.1, but Sections 14
and 15 have been added to cover use of software over a computer network and 
provide for limited attribution for the Original Developer. In addition, 
Exhibit A has been modified to be consistent with Exhibit B.

Software distributed under the License is distributed on an "AS IS" basis,
WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License for the
specific language governing rights and limitations under the License.

The Original Code is Ethereal Engine.

The Original Developer is the Initial Developer. The Initial Developer of the
Original Code is the Ethereal Engine team.

All portions of the code written by the Ethereal Engine team are Copyright © 2021-2023 
Ethereal Engine. All Rights Reserved.
*/

import { RigidBody, Vector3 as VT } from '@dimforge/rapier3d-compat'
import { Quaternion } from 'three'
import { Vector3 } from 'three'

import { isDev } from '@etherealengine/common/src/config'
import { EngineState } from '@etherealengine/engine/src/ecs/classes/EngineState'
import { dispatchAction, getMutableState, getState } from '@etherealengine/hyperflux'

import { V_000, V_010 } from '../../common/constants/MathConstants'
import { Engine } from '../../ecs/classes/Engine'
import { EngineActions } from '../../ecs/classes/EngineState'
import { Entity } from '../../ecs/classes/Entity'
import {
  ComponentType,
  defineQuery,
  getComponent,
  getMutableComponent,
  getOptionalComponent,
  removeComponent,
  setComponent
} from '../../ecs/functions/ComponentFunctions'
import { defineSystem } from '../../ecs/functions/SystemFunctions'
import { InputComponent } from '../../input/components/InputComponent'
import { InputSourceComponent } from '../../input/components/InputSourceComponent'
import { StandardGamepadButton, XRStandardGamepadButton } from '../../input/state/ButtonState'
import { InteractState } from '../../interaction/systems/InteractiveSystem'
import { WorldNetworkAction } from '../../networking/functions/WorldNetworkAction'
import { Physics, RaycastArgs } from '../../physics/classes/Physics'
import { RigidBodyFixedTagComponent } from '../../physics/components/RigidBodyComponent'
import { CollisionGroups } from '../../physics/enums/CollisionGroups'
import { getInteractionGroups } from '../../physics/functions/getInteractionGroups'
import { boxDynamicConfig } from '../../physics/functions/physicsObjectDebugFunctions'
import { SceneQueryType } from '../../physics/types/PhysicsTypes'
import { RendererState } from '../../renderer/RendererState'
import { TransformComponent } from '../../transform/components/TransformComponent'
import { hasMovementControls, XRState } from '../../xr/XRState'
import { AvatarControllerComponent } from '.././components/AvatarControllerComponent'
import { AvatarTeleportComponent } from '.././components/AvatarTeleportComponent'
import { autopilotSetPosition } from '.././functions/autopilotFunctions'
import { translateAndRotateAvatar } from '.././functions/moveAvatar'
import { AvatarAxesControlScheme, AvatarInputSettingsState } from '.././state/AvatarInputSettingsState'
import { changeAvatarAnimationState } from '../animation/AvatarAnimationGraph'
import { AvatarStates } from '../animation/Util'

const _quat = new Quaternion()

/**
 * On 'xr-standard' mapping, get thumbstick input [2,3], fallback to thumbpad input [0,1]
 * On 'standard' mapping, get thumbstick input [0,1]
 */
export function getThumbstickOrThumbpadAxes(
  inputSource: XRInputSource,
  thumstick: XRHandedness,
  deadZone: number = 0.05
) {
  const gamepad = inputSource.gamepad
  const axes = gamepad!.axes
  const axesIndex = inputSource.gamepad?.mapping === 'xr-standard' || thumstick === 'right' ? 2 : 0
  const xAxis = Math.abs(axes[axesIndex]) > deadZone ? axes[axesIndex] : 0
  const zAxis = Math.abs(axes[axesIndex + 1]) > deadZone ? axes[axesIndex + 1] : 0
  return [xAxis, zAxis] as [number, number]
}

export const InputSourceAxesDidReset = new WeakMap<XRInputSource, boolean>()

export const AvatarAxesControlSchemeBehavior = {
  [AvatarAxesControlScheme.Move]: (
    inputSource: XRInputSource,
    controller: ComponentType<typeof AvatarControllerComponent>,
    handdedness: XRHandedness
  ) => {
    const [x, z] = getThumbstickOrThumbpadAxes(inputSource, handdedness)
    controller.gamepadLocalInput.x += x
    controller.gamepadLocalInput.z += z
  },

  [AvatarAxesControlScheme.Teleport]: (
    inputSource: XRInputSource,
    controller: ComponentType<typeof AvatarControllerComponent>,
    handdedness: XRHandedness
  ) => {
    const localClientEntity = Engine.instance.localClientEntity
    const [x, z] = getThumbstickOrThumbpadAxes(inputSource, handdedness)

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
const interactionGroups = getInteractionGroups(CollisionGroups.Default, CollisionGroups.Avatars)

const raycastComponentData = {
  type: SceneQueryType.Closest,
  origin: new Vector3(),
  direction: new Vector3(),
  maxDistance: 100,
  groups: interactionGroups
} as RaycastArgs

const onShiftLeft = () => {
  const controller = getMutableComponent(Engine.instance.localClientEntity, AvatarControllerComponent)
  controller.isWalking.set(!controller.isWalking.value)
}

const onInteract = (handedness: XRHandedness = 'none') => {
  dispatchAction(
    EngineActions.interactedWithObject({
      targetEntity: getState(InteractState).available[0],
      handedness
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

const resetBall = () => {
  const world = Engine.instance.physicsWorld
  world.bodies.map.data.find((arr) => {
    if (arr.isDynamic()) {
      arr.setLinvel(new VT(0, 0, 0))
      arr.setAngvel(new VT(0, 0, 0))
      arr.setTranslation(new VT(7, 0.8, -14.3))
    }
  })
}

const onKeyK = () => {
  const entity = Engine.instance.localClientEntity
  changeAvatarAnimationState(entity, AvatarStates.KICK)
  kickFunction(0)
}

const onKeyL = () => {
  resetBall()
}

const isAvatarClicked = () => {
  const hits = Physics.castRayFromCamera(
    Engine.instance.camera,
    Engine.instance.pointerState.position,
    Engine.instance.physicsWorld,
    raycastComponentData
  )
  if (hits.length) {
    const hit = hits[0]
    const hitEntity = (hit.body?.userData as any)?.entity as Entity
    if (typeof hitEntity !== 'undefined' && hitEntity == Engine.instance.localClientEntity) {
      return true
    }
  }
  return false
}

let clickCount = 0
const clickTimeout = 0.6
let douubleClickTimer = 0
const secondClickTimeout = 0.2
let secondClickTimer = 0

const getAvatarDoubleClick = (buttons): boolean => {
  if (getState(XRState).sessionActive) return false
  if (buttons.PrimaryClick?.up) {
    if (!isAvatarClicked()) {
      clickCount = 0
      secondClickTimer = 0
      douubleClickTimer = 0
      return false
    }
    clickCount += 1
  }
  if (clickCount < 1) return false
  if (clickCount > 1) {
    secondClickTimer += getState(EngineState).deltaSeconds
    if (secondClickTimer <= secondClickTimeout) return true
    secondClickTimer = 0
    clickCount = 0
    return false
  }
  douubleClickTimer += getState(EngineState).deltaSeconds
  if (douubleClickTimer <= clickTimeout) return false
  douubleClickTimer = 0
  clickCount = 0
  return false
}
const inputSourceQuery = defineQuery([InputSourceComponent])

const walkableQuery = defineQuery([RigidBodyFixedTagComponent, InputComponent])

let mouseMovedDuringPrimaryClick = false

const execute = () => {
  const { localClientEntity } = Engine.instance
  if (!localClientEntity) return

  const avatarInputSettings = getState(AvatarInputSettingsState)

  const controller = getComponent(localClientEntity, AvatarControllerComponent)
  const nonCapturedInputSourceEntities = InputSourceComponent.nonCapturedInputSourceQuery()

  const firstWalkableEntityWithInput = walkableQuery().find(
    (entity) => getComponent(entity, InputComponent)?.inputSources.length
  )

  if (firstWalkableEntityWithInput) {
    const inputComponent = getComponent(firstWalkableEntityWithInput, InputComponent)
    const inputSourceEntity = inputComponent?.inputSources[0]

    if (inputSourceEntity) {
      const inputSourceComponent = getOptionalComponent(inputSourceEntity, InputSourceComponent)
      if (inputSourceComponent?.buttons.PrimaryClick?.touched) {
        const mouseMoved = Engine.instance.pointerState.movement.lengthSq() > 0
        if (mouseMoved) mouseMovedDuringPrimaryClick = true

        if (inputSourceComponent.buttons.PrimaryClick.up) {
          if (!mouseMovedDuringPrimaryClick) {
            autopilotSetPosition(Engine.instance.localClientEntity)
          } else mouseMovedDuringPrimaryClick = false
        }
      }
    }
  }

  /** @todo until we have something more sophisticated, allow interaction input even when interactables are captured */
  for (const inputSourceEntity of inputSourceQuery()) {
    const inputSource = getComponent(inputSourceEntity, InputSourceComponent)

    const buttons = inputSource.buttons

    const standardGamepad =
      inputSource.source.gamepad?.mapping === 'standard' || inputSource.source.gamepad?.mapping === ''

    if (buttons.KeyE?.down) onInteract()
    // if (buttons.KeyK?.down) onKeyK()
    if (buttons.KeyL?.down) onKeyL()

    if (standardGamepad && buttons[StandardGamepadButton.ButtonY]?.down) {
      onInteract()
    }
  }

  for (const inputSourceEntity of nonCapturedInputSourceEntities) {
    const inputSource = getComponent(inputSourceEntity, InputSourceComponent)

    const buttons = inputSource.buttons

    const standardGamepad =
      inputSource.source.gamepad?.mapping === 'standard' || inputSource.source.gamepad?.mapping === ''
    const xrStandardGamepad = inputSource.source.gamepad?.mapping === 'xr-standard'

    if (buttons.ShiftLeft?.down) onShiftLeft()
    if (xrStandardGamepad) {
      if (buttons[XRStandardGamepadButton.Trigger]?.down) onInteract(inputSource.source.handedness)
    }

    const gamepadJump = standardGamepad && buttons[StandardGamepadButton.ButtonA]?.down

    if (isDev) {
      if (buttons.KeyO?.down) onKeyO()
      if (buttons.KeyP?.down) onKeyP()
    }

    if (!hasMovementControls()) return
    //** touch input (only for avatar jump)*/

    const doubleClicked = getAvatarDoubleClick(buttons)
    /** keyboard input */
    const keyDeltaX = (buttons.KeyA?.pressed ? -1 : 0) + (buttons.KeyD?.pressed ? 1 : 0)
    const keyDeltaZ =
      (buttons.KeyW?.pressed ? -1 : 0) +
      (buttons.KeyS?.pressed ? 1 : 0) +
      (buttons.ArrowUp?.pressed ? -1 : 0) +
      (buttons.ArrowDown?.pressed ? 1 : 0)

    controller.gamepadLocalInput.set(keyDeltaX, 0, keyDeltaZ).normalize()

    controller.gamepadJumpActive = !!buttons.Space?.pressed || gamepadJump || doubleClicked

    const controlScheme =
      inputSource.source.handedness === 'none'
        ? AvatarAxesControlScheme.Move
        : inputSource.source.handedness === avatarInputSettings.preferredHand
        ? avatarInputSettings.rightAxesControlScheme
        : avatarInputSettings.leftAxesControlScheme
    AvatarAxesControlSchemeBehavior[controlScheme](
      inputSource.source,
      controller,
      avatarInputSettings.preferredHand === 'left' ? 'right' : 'left'
    )
  }
}

export const AvatarInputSystem = defineSystem({
  uuid: 'ee.engine.AvatarInputSystem',
  execute
})
